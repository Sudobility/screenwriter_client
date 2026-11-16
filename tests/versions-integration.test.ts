/**
 * B15 against the REAL screenwriter_api (spawned under Bun, dev auth, `screenwriter_test`), through the client: restore-as-copy leaves
 * the source untouched, compare of two snapshots returns element-level changes, per-line history lists an element's versions, snapshot
 * notes / comments (anchor errors, resolve, copy-to-live) and the per-user hide, and the offline-edits snapshot (client state uploaded
 * over real HTTP, filed under the old epoch after an open-in-place) through `createSnapshotFromState`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import * as Y from "yjs";
import {
  AnchorNotFoundError,
  ApiError,
  LimitExceededError,
  RoleInsufficientError,
  ScreenwriterClient,
  createFetchNetworkClient,
} from "../src";
import type { VersionPoint } from "@sudobility/screenwriter_types";
import postgres from "postgres";

const API_DIR = new URL("../../screenwriter_api/", import.meta.url).pathname;
const PORT = 21700 + Math.floor(Math.random() * 300);
const BASE = `http://localhost:${PORT}`;
const DB_URL = "postgres://localhost:5432/screenwriter_test";
const RUN = Math.random().toString(36).slice(2, 7);
const U = (name: string) => `clb15-${RUN}-${name}`;
const mk = (uid: string) => new ScreenwriterClient({ network: createFetchNetworkClient(), baseUrl: BASE, getToken: async () => `dev:${uid}:${uid}@x.co`, clientTag: "web/test" });
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

let server: ChildProcess | null = null;
const sql = () => postgres(DB_URL, { max: 1, onnotice: () => undefined });

beforeAll(async () => {
  server = spawn("bun", ["run", "src/index.ts"], {
    cwd: API_DIR,
    env: {
      ...process.env, PORT: String(PORT), DATABASE_URL: DB_URL, PUBLIC_APP_URL: "http://localhost:5143", AI_TEST_MODE: "1", LOG_LEVEL: "error",
      JOB_POLL_MS: "50", NORMALIZE_DEBOUNCE_MS: "600000", VERSION_POINT_INTERVAL_S: "1",
    },
    stdio: "ignore",
  });
  for (let i = 0; i < 200; i++) {
    try {
      if ((await fetch(`${BASE}/health`)).ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(100);
  }
  throw new Error("API did not start");
}, 60000);

afterAll(async () => {
  if (server) {
    const exited = new Promise(r => server!.once("exit", r));
    server.kill("SIGTERM");
    await exited;
  }
  const db = sql();
  try {
    await db`DELETE FROM audit_log WHERE actor_user_id LIKE ${`clb15-${RUN}-%`}`;
    await db`DELETE FROM idempotency_keys WHERE principal LIKE ${`%clb15-${RUN}-%`}`;
    await db`DELETE FROM workspaces WHERE created_by LIKE ${`clb15-${RUN}-%`}`;
    await db`DELETE FROM users WHERE id LIKE ${`clb15-${RUN}-%`}`;
  } finally {
    await db.end();
  }
});

describe("B15 versions, snapshots and sync completion through the client against the real API", () => {
  const owner = mk(U("owner"));
  const commenter = mk(U("commenter"));
  const outsider = mk(U("out"));
  let wid = "";
  let pid = "";

  const newDoc = async (title: string) => (await owner.createDocument(pid, { title, kind: "script" })).id;
  const add = async (did: string, text: string) =>
    (await owner.applyCommands(did, { commands: [{ id: "element.insert", params: { style: "st_action", text } }], baseEpoch: 0 })).effects.createdIds[0]!;
  const setText = (did: string, id: string, from: string, to: string) =>
    owner.applyCommands(did, { commands: [{ id: "text.replaceRange", params: { range: { anchor: { elementId: id, offset: 0 }, head: { elementId: id, offset: from.length } }, text: to } }], baseEpoch: 0 });

  beforeAll(async () => {
    await commenter.me();
    await outsider.me();
    wid = (await owner.createManagedEntity({ name: "History Client" })).id;
    pid = (await owner.createProject(wid, { name: "Feature" })).id;
    const db = sql();
    try {
      await db`INSERT INTO entity_members (entity_id, user_id, role) VALUES (${wid}, ${U("commenter")}, 'commenter')`;
    } finally {
      await db.end();
    }
  }, 30000);

  it("restore-as-copy: a new document with the version's content, the source untouched", async () => {
    const did = await newDoc("Source");
    const a = await add(did, "ALPHA");
    await sleep(1200);
    await add(did, "BETA"); // interval version point (ALPHA and BETA)
    const point = (await owner.listVersions(did)).data!.find((i): i is VersionPoint => "reason" in i && i.reason === "interval")!;
    await add(did, "GAMMA");
    const before = await owner.getDocument(did);
    const versions = (await owner.listVersions(did)).data!.length;

    const copy = await owner.restoreVersionAsCopy(did, point.id!, { title: "Copy of v" });
    expect(copy).toMatchObject({ title: "Copy of v", epoch: 0, projectId: pid });
    const content = await owner.getDocumentContent(copy.id);
    expect(content.elements.find(e => e.id === a)!.text.plain).toBe("ALPHA");
    expect(JSON.stringify(content)).toContain("BETA");
    expect(JSON.stringify(content)).not.toContain("GAMMA");
    expect(content.meta.forkedFrom).toMatchObject({ docId: did, versionId: point.id });
    const after = await owner.getDocument(did);
    expect(after.epoch).toBe(before.epoch);
    expect((await owner.listVersions(did)).data!).toHaveLength(versions);
    expect(JSON.stringify(await owner.getDocumentContent(did))).toContain("GAMMA");
    // a commenter may not restore into a copy, an outsider sees nothing
    await expect(commenter.restoreVersionAsCopy(did, point.id!, { title: "x" })).rejects.toBeInstanceOf(RoleInsufficientError);
    await expect(outsider.restoreVersionAsCopy(did, point.id!, { title: "x" })).rejects.toMatchObject({ status: 404 });
  }, 40000);

  it("compare returns element-level changes; line history lists the element's versions", async () => {
    const did = await newDoc("Compare");
    const keep = await add(did, "The rain stops.");
    const edit = await add(did, "She opens the door.");
    const s1 = await owner.createSnapshot(did, { name: "Draft one" });
    await setText(did, edit, "She opens the door.", "She slams the door hard.");
    const added = await add(did, "Thunder.");
    const s2 = await owner.createSnapshot(did, { name: "Draft two" });

    const diff = await owner.compare(did, { base: { kind: "snapshot", snapshotId: s1.id }, target: { kind: "snapshot", snapshotId: s2.id }, granularity: "word" });
    const rows = diff.scenes.flatMap(s => s.elements);
    expect(rows.find(r => r.targetElementId === keep)).toMatchObject({ status: "unchanged" });
    const mod = rows.find(r => r.targetElementId === edit)!;
    expect(mod).toMatchObject({ status: "modified", baseText: "She opens the door.", targetText: "She slams the door hard." });
    expect(mod.words!.some(w => w.op === "insert" && w.text.includes("slams"))).toBe(true);
    expect(rows.find(r => r.targetElementId === added)).toMatchObject({ status: "added" });
    expect(diff.summary).toMatchObject({ scenesModified: 1, scenesAdded: 0 });
    // compare against the live document, and the reverse direction
    const live = await commenter.compare(did, { base: { kind: "snapshot", snapshotId: s2.id }, target: { kind: "live", documentId: did } });
    expect(live.summary).toMatchObject({ scenesModified: 0, wordsAdded: 0 });
    const rev = await owner.compare(did, { base: { kind: "snapshot", snapshotId: s2.id }, target: { kind: "snapshot", snapshotId: s1.id } });
    expect(rev.scenes.flatMap(s => s.elements).find(r => r.baseElementId === added)).toMatchObject({ status: "removed" });
    await expect(outsider.compare(did, { base: { kind: "snapshot", snapshotId: s1.id }, target: { kind: "snapshot", snapshotId: s2.id } })).rejects.toMatchObject({ status: 404 });

    // line history: the edited element lists its versions, newest first, with the author
    const hist = await commenter.getElementHistory(did, edit);
    expect(hist.data!.map(i => i.text)).toEqual(["She slams the door hard."]); // one author session (created and edited by the owner within minutes)
    expect(hist.data![0]).toMatchObject({ authors: [U("owner")], source: "update" });
    await expect(owner.getElementHistory(did, "el_missing")).rejects.toMatchObject({ status: 404 });
  }, 40000);

  it("snapshot notes are append-only with a cap; comments anchor, resolve and copy to the live document; hide is per user", async () => {
    const did = await newDoc("Notes");
    const line = await add(did, "Hello brave new world");
    const snap = await owner.createSnapshot(did, { name: "Reviewed" });

    expect((await owner.setSnapshotPrefs(snap.id, true)).hidden).toBe(true);
    expect((await owner.listSnapshots(did)).snapshots[0]!.hiddenForMe).toBe(true);
    expect((await commenter.listSnapshots(did)).snapshots[0]!.hiddenForMe).toBe(false);
    await owner.setSnapshotPrefs(snap.id, false);

    await owner.addSnapshotNote(snap.id, "Why this branch: the ending was rewritten.");
    expect((await owner.listSnapshotNotes(snap.id)).map(n => n.body)).toEqual(["Why this branch: the ending was rewritten."]);
    expect((await owner.listSnapshots(did)).snapshots[0]!.noteCount).toBe(1);
    await expect(commenter.addSnapshotNote(snap.id, "no")).rejects.toBeInstanceOf(RoleInsufficientError);
    const db = sql();
    try {
      await db`INSERT INTO snapshot_notes (id, snapshot_id, author_id, body) SELECT 'snn_fill' || g || ${RUN}, ${snap.id}, ${U("owner")}, 'fill' FROM generate_series(1, 199) g`;
    } finally {
      await db.end();
    }
    const capped = await owner.addSnapshotNote(snap.id, "over the cap").catch(e => e);
    expect(capped).toBeInstanceOf(LimitExceededError);
    expect(capped.limit).toBe(200);

    const c = await commenter.addSnapshotComment(snap.id, { anchor: { elementId: line, offset: 6, length: 5 }, body: "Cut this adjective." });
    expect(c).toMatchObject({ authorId: U("commenter"), resolvedAt: null, copiedToLiveNoteId: null });
    const bad = await commenter.addSnapshotComment(snap.id, { anchor: { elementId: "el_nope", offset: 0, length: 1 }, body: "x" }).catch(e => e);
    expect(bad).toBeInstanceOf(AnchorNotFoundError);
    expect(bad.elementId).toBe("el_nope");
    expect((await commenter.resolveSnapshotComment(c.id, true)).resolvedAt).toBeTruthy();
    expect((await commenter.resolveSnapshotComment(c.id, false)).resolvedAt).toBeNull();
    await expect(commenter.copyCommentToLive(c.id)).rejects.toBeInstanceOf(RoleInsufficientError); // document.edit
    const { noteId } = await owner.copyCommentToLive(c.id);
    expect(noteId).toMatch(/^note_/);
    expect((await owner.copyCommentToLive(c.id)).noteId).toBe(noteId);
    const live = await owner.getDocumentContent(did);
    expect(live.notes.find(n => n.id === noteId)).toMatchObject({ anchor: { kind: "element", elementId: line }, authorUid: U("commenter") });
    expect((await owner.listSnapshotComments(snap.id)).data![0]!.copiedToLiveNoteId).toBe(noteId);
    await expect(outsider.listSnapshotComments(snap.id)).rejects.toMatchObject({ status: 404 });
    // once the commented text is gone the copy is refused with the typed error and nothing is written
    const c2 = await commenter.addSnapshotComment(snap.id, { anchor: { elementId: line, offset: 6, length: 5 }, body: "again" });
    await setText(did, line, "Hello brave new world", "Hi");
    await expect(owner.copyCommentToLive(c2.id)).rejects.toBeInstanceOf(AnchorNotFoundError);
    expect((await owner.getDocumentContent(did)).notes).toHaveLength(1);
  }, 40000);

  it("offline edits across an open-in-place are filed as an offline-edits snapshot and never touch the reopened branch", async () => {
    const did = await newDoc("Tablet");
    await add(did, "BASELINE");
    // the tablet's replica (what it synced) plus edits made offline
    const state0 = await owner.getDocumentState(did);
    const replica = new Y.Doc();
    Y.applyUpdateV2(replica, state0.state);
    const elements = replica.getMap<Y.Map<unknown>>("elements");
    const anyId = [...elements.keys()][0]!;
    (elements.get(anyId)!.get("text") as Y.Text).insert(0, "OFFLINE-ON-TABLET ");
    const offlineState = Y.encodeStateAsUpdateV2(replica);

    // meanwhile the desktop snapshots and opens it in place: epoch 1
    const s1 = await owner.createSnapshot(did, { name: "Draft one" });
    await add(did, "DESKTOP-AFTER");
    const opened = await owner.openSnapshot(s1.id);
    expect(opened.epoch).toBe(1);

    // the tablet reconnects: it is told the epoch moved (a stale baseEpoch is refused), and files its edits as a snapshot
    const stale = await owner.applyCommands(did, { commands: [{ id: "element.insert", params: { style: "st_action", text: "late" } }], baseEpoch: 0 }).catch(e => e);
    expect(stale).toMatchObject({ code: "EPOCH_MISMATCH" });
    const filed = await owner.createSnapshotFromState(did, offlineState, {
      name: "Offline edits from tablet", kind: "auto", autoReason: "offline-edits", clientSnapshotId: "offline-edits:tablet:0",
      sourceEpoch: 0, assumedParentId: null, createdAt: new Date(Date.now() - 3600_000).toISOString(), createdOnDevice: "tablet",
    });
    expect(filed).toMatchObject({ kind: "auto", autoReason: "offline-edits", parentId: null, reparentedLive: false, createdOnDevice: "tablet" });
    expect(JSON.stringify(await owner.getSnapshotContent(filed.id))).toContain("OFFLINE-ON-TABLET");
    const liveDoc = await owner.getDocument(did);
    expect(liveDoc.parentSnapshotId).toBe(s1.id); // still the branch that was opened
    const live = JSON.stringify(await owner.getDocumentContent(did));
    expect(live).not.toContain("OFFLINE-ON-TABLET");
    expect(live).not.toContain("DESKTOP-AFTER");
    // it can then be compared with the live document to cherry-pick from
    const diff = await owner.compare(did, { base: { kind: "snapshot", snapshotId: filed.id }, target: { kind: "live", documentId: did } });
    expect(diff.summary.scenesModified + diff.summary.scenesAdded + diff.summary.scenesRemoved).toBeGreaterThanOrEqual(1);
    // a retry (same clientSnapshotId) is the same snapshot
    const again = await owner.createSnapshotFromState(did, offlineState, { name: "Offline edits from tablet", kind: "auto", autoReason: "offline-edits", clientSnapshotId: "offline-edits:tablet:0", sourceEpoch: 0 });
    expect(again.id).toBe(filed.id);
    const err = await owner.createSnapshotFromState(did, offlineState, { name: "x", clientSnapshotId: "future", sourceEpoch: 7 }).catch(e => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
  }, 40000);

  it("presence answers for a document nobody has open", async () => {
    const did = await newDoc("Empty room");
    expect(await owner.getPresence(did)).toEqual([]);
    await expect(outsider.getPresence(did)).rejects.toMatchObject({ status: 404 });
  });
});
