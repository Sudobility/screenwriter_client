/**
 * B8 against the REAL screenwriter_api (spawned under Bun, dev auth bypass, `screenwriter_test`): roles, invitations,
 * public and restricted links, revocation, the unlock session and live role changes over the sync socket.
 * Invitation tokens are read from the API's dev outbox (`INVITATION_OUTBOX_FILE`), standing in for the email (slice B12).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as Y from "yjs";
import {
  ApiError,
  createFetchNetworkClient,
  RoleInsufficientError,
  ScreenwriterClient,
  ShareLinkExpiredError,
  SyncClient,
} from "../src";
// postgres.js: cleanup only (this package has no DB access of its own at runtime).
import postgres from "postgres";

const API_DIR = new URL("../../screenwriter_api/", import.meta.url).pathname;
const PORT = 19600 + Math.floor(Math.random() * 300);
const BASE = `http://localhost:${PORT}`;
const DB_URL = "postgres://localhost:5432/screenwriter_test";
const OUTBOX = join(tmpdir(), `fw-outbox-${process.pid}-${PORT}.jsonl`);
const RUN = Math.random().toString(36).slice(2, 7);
const U = (name: string) => `clsh-${RUN}-${name}`;
const tokenOf = (uid: string) => `dev:${uid}:${uid}@x.co`;
const mk = (uid: string | null) =>
  new ScreenwriterClient({ network: createFetchNetworkClient(), baseUrl: BASE, getToken: async () => (uid ? tokenOf(uid) : null) });

let server: ChildProcess | null = null;

/** The last accept token mailed to `email` for a target kind. */
const inviteToken = (email: string, kind: string) => {
  const rows = readFileSync(OUTBOX, "utf8").trim().split("\n").filter(Boolean).map(l => JSON.parse(l) as { email: string; targetType: string; token: string });
  return [...rows].reverse().find(r => r.email === email && r.targetType === kind)!.token;
};

async function waitFor(what: string, cond: () => boolean, ms = 8000) {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error(`timeout waiting for ${what}`);
    await new Promise(r => setTimeout(r, 20));
  }
}

beforeAll(async () => {
  writeFileSync(OUTBOX, "");
  server = spawn("bun", ["run", "src/index.ts"], {
    cwd: API_DIR,
    env: {
      ...process.env,
      PORT: String(PORT),
      DATABASE_URL: DB_URL,
      PUBLIC_APP_URL: "http://localhost:5143",
      AI_TEST_MODE: "1",
      LOG_LEVEL: "error",
      INVITATION_OUTBOX_FILE: OUTBOX,
    },
    stdio: "ignore",
  });
  for (let i = 0; i < 200; i++) {
    try {
      if ((await fetch(`${BASE}/health`)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error("API did not start");
});

afterAll(async () => {
  const s = server;
  if (s) {
    const exited = new Promise(r => s.once("exit", r));
    s.kill("SIGTERM");
    await exited;
  }
  rmSync(OUTBOX, { force: true });
  const sql = postgres(DB_URL, { max: 1, onnotice: () => undefined });
  try {
    await sql`DELETE FROM audit_log WHERE actor_user_id LIKE ${"clsh-" + RUN + "%"}`;
    await sql`DELETE FROM workspaces WHERE created_by LIKE ${"clsh-" + RUN + "%"}`;
    await sql`DELETE FROM users WHERE id LIKE ${"clsh-" + RUN + "%"}`;
  } finally {
    await sql.end();
  }
});

const cmd = (text: string) => ({ commands: [{ id: "element.insert", params: { style: "st_action", text } }], baseEpoch: 0 });

describe("B8 against the real API", () => {
  const owner = mk(U("owner"));
  const viewer = mk(U("viewer"));
  const stranger = mk(U("stranger"));
  let wid = "";
  let pid = "";
  let did = "";

  beforeAll(async () => {
    await viewer.me();
    await stranger.me();
    wid = (await owner.createManagedEntity({ name: "Room" })).id;
    pid = (await owner.createProject(wid, { name: "Show" })).id;
    did = (await owner.createDocument(pid, { title: "Pilot", kind: "script" })).id;
  });

  it("invite -> accept -> the viewer cannot edit (RoleInsufficientError names the role that can) -> upgrade -> can", async () => {
    const email = `${U("viewer")}@x.co`;
    const inv = await owner.inviteMember({ type: "entity", id: wid }, { email, role: "member" });
    expect(inv).toMatchObject({ status: "pending", role: "member", targetName: "Room" });
    expect(JSON.stringify(inv)).not.toContain(inviteToken(email, "entity"));
    expect((await viewer.listMyInvitations()).map(i => i.id)).toContain(inv.id);
    await expect(stranger.acceptInvitation(inviteToken(email, "entity"))).rejects.toMatchObject({ code: "EMAIL_MISMATCH" });
    expect(await viewer.acceptInvitation(inviteToken(email, "entity"))).toEqual({ entityId: wid });
    await expect(viewer.acceptInvitation(inviteToken(email, "entity"))).rejects.toMatchObject({ code: "INVITATION_CLOSED", status: 410 });

    expect((await viewer.getDocument(did)).role).toBe("member");
    const err = await viewer.applyCommands(did, cmd("nope")).catch(e => e);
    expect(err).toBeInstanceOf(RoleInsufficientError);
    expect(err.requiredRole).toBe("manager");
    expect(err.role).toBe("member");
    // a stranger sees nothing: 404, never 403
    const nf = await stranger.getDocument(did).catch(e => e);
    expect(nf).toBeInstanceOf(ApiError);
    expect(nf).not.toBeInstanceOf(RoleInsufficientError);
    expect(nf.status).toBe(404);

    const members = await owner.listMembers(wid);
    expect(members.data!.map(m => [m.userId, m.role])).toEqual([[U("owner"), "owner"], [U("viewer"), "member"]]);
    expect((await owner.updateMemberRole(wid, U("viewer"), "manager")).role).toBe("manager");
    expect((await viewer.applyCommands(did, cmd("now allowed"))).applied).toBe(1);
    await owner.updateMemberRole(wid, U("viewer"), "member");
  });

  it("a role change reaches an open sync session within 5 s (roleChanged), and losing access ends it", async () => {
    const sync = new SyncClient({ url: viewer.syncUrl(), getToken: async () => tokenOf(U("viewer")) });
    const roles: string[] = [];
    let stopped: { reason: string; code?: number } | null = null;
    sync.on("roleChanged", e => roles.push(e.role));
    sync.on("stopped", e => (stopped = e));
    const ydoc = new Y.Doc();
    const sub = sync.subscribe(did, ydoc, { epoch: 0 });
    await waitFor("synced", () => sub.status === "synced");
    const t0 = Date.now();
    await owner.updateMemberRole(wid, U("viewer"), "manager");
    await waitFor("roleChanged manager", () => roles.includes("manager"), 5000);
    expect(Date.now() - t0).toBeLessThan(5000);
    await owner.removeMember(wid, U("viewer"));
    await waitFor("roleChanged none", () => roles.includes("none"), 5000);
    await waitFor("stopped", () => stopped !== null, 5000);
    expect(stopped!.code).toBe(4403);
    sync.disconnect();
    // re-add for the tests below
    const email = `${U("viewer")}@x.co`;
    await owner.inviteMember({ type: "entity", id: wid }, { email, role: "member" });
    await viewer.acceptInvitation(inviteToken(email, "entity"));
  });

  it("public mode: a signed-out visitor reads through the link; view cannot comment; comment needs sign-in; revoking fails the URL at once", async () => {
    const link = await owner.createDocumentShareLink(did, { access: "view" });
    expect(link.url).toContain(link.token);
    const anon = mk(null);
    expect(await anon.resolveShareLink(link.token)).toMatchObject({ title: "Pilot", access: "view", requiresPassword: false });
    const { state, epoch } = await anon.getSharedState(link.token);
    expect(epoch).toBe(0);
    const y = new Y.Doc();
    Y.applyUpdateV2(y, state); // decodes with the client's own Yjs: one instance
    expect(y.getMap("elements").size).toBeGreaterThan(0);
    expect((await anon.unlockShareLink(link.token)).access).toBe("view");

    // comment link: anonymous stays view, signed-in gets comment, and the session opens a link-scheme socket
    const com = await owner.createDocumentShareLink(did, { access: "comment" });
    expect((await anon.unlockShareLink(com.token)).access).toBe("view");
    const session = await stranger.unlockShareLink(com.token);
    expect(session.access).toBe("comment");
    const sync = new SyncClient({ url: anon.syncUrl(), scheme: "link", getToken: async () => session.linkSession });
    let closedByRevoke: { reason: string } | null = null;
    const auths: string[] = [];
    sync.on("authError", e => auths.push(e.code));
    sync.on("stopped", e => (closedByRevoke = e));
    const ydoc = new Y.Doc();
    const sub = sync.subscribe(did, ydoc, { epoch: 0 });
    await waitFor("link synced", () => sub.status === "synced");

    // revoke: the URL, its sessions and the open socket die immediately
    await owner.revokeShareLink(com.id);
    const dead = await anon.resolveShareLink(com.token).catch(e => e);
    expect(dead).toBeInstanceOf(ShareLinkExpiredError);
    expect(dead.reason).toBe("revoked");
    await expect(anon.getSharedState(com.token, { linkSession: session.linkSession })).rejects.toBeInstanceOf(ShareLinkExpiredError);
    await waitFor("link authError", () => auths.includes("LINK_EXPIRED"), 5000);
    await waitFor("link stopped", () => closedByRevoke !== null, 8000);
    sync.disconnect();
    // the first link is untouched
    expect((await anon.resolveShareLink(link.token)).title).toBe("Pilot");
    await owner.revokeShareLink(link.id);
    await expect(anon.resolveShareLink(link.token)).rejects.toBeInstanceOf(ShareLinkExpiredError);
  });

  it("restricted mode: 'you need access' off the list, the same URL opens for someone added; a password link needs the session", async () => {
    const link = await owner.createDocumentShareLink(did, { access: "view", generalAccess: "restricted" });
    const anon = mk(null);
    expect((await anon.resolveShareLink(link.token)).title).toBeNull();
    await expect(anon.getSharedState(link.token)).rejects.toMatchObject({ status: 401 });
    const off = await stranger.getSharedState(link.token).catch(e => e);
    expect(off).toBeInstanceOf(ApiError);
    expect(off.status).toBe(403);
    // add the stranger to the access list (an invitation), same URL
    const email = `${U("stranger")}@x.co`;
    await owner.inviteMember({ type: "document", id: did }, { email, role: "member" });
    await stranger.acceptInvitation(inviteToken(email, "document"));
    expect((await stranger.getSharedState(link.token)).state.byteLength).toBeGreaterThan(0);
    expect((await stranger.listSharedWithMe()).data!.map(i => i.id)).toContain(did);
    const grants = await owner.listGrants({ type: "document", id: did });
    expect(grants.map(g => g.userId)).toContain(U("stranger"));
    await owner.removeGrant(grants.find(g => g.userId === U("stranger"))!.id);
    await expect(stranger.getSharedState(link.token)).rejects.toMatchObject({ status: 403 });
    await owner.updateShareLink(link.id, { generalAccess: "anyone", password: "s3cret" });
    await expect(anon.getSharedState(link.token)).rejects.toMatchObject({ code: "SHARE_LINK_PASSWORD_REQUIRED" });
    await expect(anon.unlockShareLink(link.token, "wrong")).rejects.toMatchObject({ code: "SHARE_LINK_PASSWORD_REQUIRED" });
    const s = await anon.unlockShareLink(link.token, "s3cret");
    expect((await anon.getSharedState(link.token, { linkSession: s.linkSession })).state.byteLength).toBeGreaterThan(0);
    await owner.revokeShareLink(link.id);
  });

  it("lock: refused without an unlock session, the client attaches it once created; keys stay bound to their workspace", async () => {
    const d = (await owner.createDocument(pid, { title: "Sealed", kind: "script" })).id;
    await owner.lockDocument(d);
    const locked = await owner.getDocumentState(d).catch(e => e);
    expect(locked).toMatchObject({ code: "DOCUMENT_LOCKED", status: 423 });
    expect((await owner.getDocument(d)).locked).toBe(true);
    await owner.createUnlockSession(d);
    expect((await owner.getDocumentState(d)).state.byteLength).toBeGreaterThan(0);
    await owner.unlockDocument(d);
    expect((await owner.getDocumentState(d)).state.byteLength).toBeGreaterThan(0);

    const personal = (await owner.me()).personalEntityId;
    const key = await owner.createApiKey({ name: "k", entityId: personal, scope: "read_write" });
    const keyClient = new ScreenwriterClient({ network: createFetchNetworkClient(), baseUrl: BASE, getToken: async () => key.key });
    const bound = await keyClient.getDocument(did).catch(e => e);
    expect(bound.status).toBe(404); // the team's document is outside the key's workspace
    expect((await keyClient.listManagedEntities()).data!.map(w => w.id)).toEqual([personal]);
    await expect(keyClient.lockDocument(did)).rejects.toMatchObject({ code: "API_KEY_FORBIDDEN" });
  });

  it("workspace lifecycle: usage, audit CSV, transfer, leave, delete", async () => {
    const w = await owner.createManagedEntity({ name: "Temp" });
    expect(await owner.getManagedEntityUsage(w.id)).toMatchObject({ documentCount: 0, assetCount: 0 });
    const email = `${U("viewer")}@x.co`;
    await owner.inviteMember({ type: "entity", id: w.id }, { email, role: "manager" });
    await viewer.acceptInvitation(inviteToken(email, "entity"));
    const csv = await owner.downloadEntityAudit(w.id);
    expect(csv.split("\r\n")[0]).toBe("created_at,actor,action,target_type,target_id,ip");
    expect(csv).toContain("invitation.accept");
    await expect(owner.leaveManagedEntity(w.id)).rejects.toMatchObject({ code: "LAST_OWNER" });
    await owner.transferManagedEntity(w.id, U("viewer"));
    expect((await owner.leaveManagedEntity(w.id))).toEqual({ left: true });
    await expect(viewer.deleteManagedEntity(w.id, "nope")).rejects.toMatchObject({ code: "CONFIRMATION_MISMATCH" });
    expect((await viewer.deleteManagedEntity(w.id, "Temp")).deletedAt).toBeTruthy();
    expect((await viewer.listManagedEntities()).data!.map(x => x.id)).not.toContain(w.id);
  });
});
