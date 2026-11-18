/**
 * B14 against the REAL screenwriter_api (spawned under Bun, dev auth, `screenwriter_test`), through the client. Proves the plan's
 * acceptance end to end: a document trashed and restored keeps its history and snapshots; a workspace template edit changes no
 * document until it applies it; a series project lists episodes by (season, episode).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import {
  ApiError,
  ScreenwriterClient,
  ShareLinkExpiredError,
  TemplateInvalidError,
  UnmappedStylesError,
  createFetchNetworkClient,
  isApplyTemplateJob,
} from "../src";
import type { Job } from "@sudobility/screenwriter_types";
import postgres from "postgres";

const API_DIR = new URL("../../screenwriter_api/", import.meta.url).pathname;
const PORT = 20800 + Math.floor(Math.random() * 300);
const BASE = `http://localhost:${PORT}`;
const DB_URL = "postgres://localhost:5432/screenwriter_test";
const RUN = Math.random().toString(36).slice(2, 7);
const U = (name: string) => `clb14-${RUN}-${name}`;
const mk = (uid: string) => new ScreenwriterClient({ network: createFetchNetworkClient(), baseUrl: BASE, getToken: async () => `dev:${uid}:${uid}@x.co`, clientTag: "web/test" });

const FDX = `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<FinalDraft DocumentType="Script" Template="No" Version="5"><Content>
<Paragraph Type="Scene Heading"><Text>INT. LAB - DAY</Text></Paragraph>
<Paragraph Type="Action"><Text>Dust floats in the light.</Text></Paragraph>
</Content></FinalDraft>
`;
const insert = (text: string, baseEpoch = 0) => ({ commands: [{ id: "element.insert", params: { style: "st_action", text } }], baseEpoch });

let server: ChildProcess | null = null;
const sql = () => postgres(DB_URL, { max: 1, onnotice: () => undefined });

async function until<T>(fn: () => Promise<T | false>, ms = 20000): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) throw new Error("timed out");
    await new Promise(r => setTimeout(r, 50));
  }
}
const finished = (c: ScreenwriterClient, job: Job) =>
  until(async () => {
    const j = await c.getJob(job.id);
    return j.status !== "queued" && j.status !== "running" ? j : false;
  });

beforeAll(async () => {
  server = spawn("bun", ["run", "src/index.ts"], {
    cwd: API_DIR,
    env: { ...process.env, PORT: String(PORT), DATABASE_URL: DB_URL, PUBLIC_APP_URL: "http://localhost:5143", AI_TEST_MODE: "1", LOG_LEVEL: "error", JOB_POLL_MS: "50", NORMALIZE_DEBOUNCE_MS: "600000" },
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
}, 60000);

afterAll(async () => {
  const s = server;
  if (s) {
    const exited = new Promise(r => s.once("exit", r));
    s.kill("SIGTERM");
    await exited;
  }
  const db = sql();
  try {
    const like = `clb14-${RUN}%`;
    await db`DELETE FROM audit_log WHERE actor_user_id LIKE ${like}`;
    await db`DELETE FROM idempotency_keys WHERE principal LIKE ${`%clb14-${RUN}%`}`;
    await db`DELETE FROM templates WHERE owner_user_id LIKE ${like}`;
    await db`DELETE FROM workspaces WHERE created_by LIKE ${like}`;
    await db`DELETE FROM users WHERE id LIKE ${like}`;
  } finally {
    await db.end();
  }
});

describe("B14 against the real API", () => {
  const owner = mk(U("owner"));
  const admin = mk(U("admin"));
  const writer = mk(U("writer"));
  let wid = "";
  let pid = "";

  beforeAll(async () => {
    await owner.me();
    await admin.me();
    await writer.me();
    wid = (await owner.createManagedEntity({ name: "B14 team" })).id;
    const db = sql();
    try {
      await db`INSERT INTO entity_members (entity_id, user_id, role) VALUES (${wid}, ${U("admin")}, 'admin'), (${wid}, ${U("writer")}, 'writer')`;
    } finally {
      await db.end();
    }
    pid = (await owner.createProject(wid, { name: "Feature" })).id;
  }, 30000);

  it("a document trashed then restored keeps its history and snapshots; purge is permanent", async () => {
    const doc = (await owner.importDocument(pid, { filename: "lab.fdx", bytes: new TextEncoder().encode(FDX) })).document;
    await owner.applyCommands(doc.id, insert("Kept line."));
    const snap = await owner.createSnapshot(doc.id, { name: "Before" });
    await owner.applyCommands(doc.id, insert("Later line."));
    await owner.openSnapshot(snap.id); // epoch bump: pre-open snapshot + pre-epoch version point
    const before = { snaps: (await owner.listSnapshots(doc.id)).snapshots.map(s => s.id).sort(), versions: (await owner.listVersions(doc.id)).data!.length, content: JSON.stringify((await owner.getDocumentContent(doc.id)).elements.map(e => e.text.plain)) };
    expect(before.snaps.length).toBeGreaterThanOrEqual(2);
    expect(before.versions).toBeGreaterThanOrEqual(1);

    await owner.trashDocument(doc.id);
    const trash = (await owner.listTrash(wid)).data!;
    const item = trash.find(t => t.id === doc.id)!;
    expect(item).toMatchObject({ type: "document", projectId: pid });
    expect(Date.parse(item.purgeAt) - Date.parse(item.trashedAt)).toBe(30 * 86_400_000);
    await owner.restoreDocument(doc.id);
    expect((await owner.listTrash(wid)).data!.map(t => t.id)).not.toContain(doc.id);
    expect((await owner.listSnapshots(doc.id)).snapshots.map(s => s.id).sort()).toEqual(before.snaps);
    expect((await owner.listVersions(doc.id)).data!).toHaveLength(before.versions);
    expect(JSON.stringify((await owner.getDocumentContent(doc.id)).elements.map(e => e.text.plain))).toBe(before.content);

    // purge: not while live, not for a writer, then gone with everything attached
    await expect(owner.purgeDocument(doc.id)).rejects.toMatchObject({ code: "NOT_IN_TRASH" });
    await owner.trashDocument(doc.id);
    await expect(writer.purgeDocument(doc.id)).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
    expect(await admin.purgeDocument(doc.id)).toEqual({ purgeScheduled: true });
    await until(async () => (await owner.getDocument(doc.id).then(() => false, (e: ApiError) => e.status === 404)) || false);
    await expect(owner.listSnapshots(doc.id)).rejects.toMatchObject({ status: 404 });
  }, 60000);

  it("a series project lists episodes by (season, episode); move and duplicate keep them straight", async () => {
    const show = await owner.createProject(wid, { name: "The Show", kind: "series", logline: "Weekly." });
    expect(show).toMatchObject({ kind: "series", logline: "Weekly." });
    const e = async (title: string, season?: number, episode?: number) =>
      (await owner.createDocument(show.id, { title, kind: "script", ...(season !== undefined ? { season, episode } : {}) })).id;
    await e("2x01", 2, 1);
    await e("1x02", 1, 2);
    const bible = await e("Series bible");
    await e("1x01", 1, 1);
    const titles = async (order?: "position" | "episode") => (await owner.listDocuments(show.id, order ? { order } : {})).data!.map(d => d.title);
    expect(await titles()).toEqual(["1x01", "1x02", "2x01", "Series bible"]);
    expect(await titles("position")).toEqual(["2x01", "1x02", "Series bible", "1x01"]);
    expect((await owner.getProject(show.id)).documents.map(d => d.title)).toEqual(["1x01", "1x02", "2x01", "Series bible"]);
    await owner.updateDocument(bible, { season: 1, episode: 0 });
    expect(await titles()).toEqual(["Series bible", "1x01", "1x02", "2x01"]);

    // folders + duplicate as a job
    const folder = await owner.createFolder(show.id, { name: "Season 1" });
    const first = (await owner.listDocuments(show.id)).data!.find(d => d.title === "1x01")!;
    await owner.updateDocument(first.id, { folderId: folder.id, labels: ["aired"] });
    const job = await owner.duplicateProject(show.id, { name: "The Show (copy)", includeSnapshots: false, includeAssets: false });
    expect(job.kind).toBe("project.duplicate");
    const done = await finished(owner, job);
    expect(done.status, JSON.stringify(done)).toBe("succeeded");
    const copy = (await owner.listProjects(wid, { q: "The Show (copy)" })).data![0]!;
    const copyDetail = await owner.getProject(copy.id);
    expect(copyDetail.kind).toBe("series");
    expect(copyDetail.documents.map(d => d.title)).toEqual(["Series bible", "1x01", "1x02", "2x01"]); // numbering survived the copy
    expect(copyDetail.folders.map(f => f.name)).toEqual(["Season 1"]);
    expect(copyDetail.documents.find(d => d.title === "1x01")).toMatchObject({ folderId: copyDetail.folders[0]!.id, labels: ["aired"] });

    // move between projects of the workspace, refused across workspaces
    const moved = await owner.moveDocument(first.id, { targetProjectId: pid });
    expect(moved.projectId).toBe(pid);
    const other = await owner.createManagedEntity({ name: "B14 other" });
    const elsewhere = await owner.createProject(other.id, { name: "Elsewhere" });
    await expect(owner.moveDocument(first.id, { targetProjectId: elsewhere.id })).rejects.toMatchObject({ code: "MOVE_FORBIDDEN", status: 403 });
    const dup = await owner.duplicateDocument(first.id, { title: "1x01 copy" });
    expect(dup).toMatchObject({ title: "1x01 copy", projectId: pid, season: null });

    // labels, stars and the workspace list
    await owner.starDocument(first.id);
    const starred = await owner.listWorkspaceDocuments(wid, { starred: true, label: "aired" });
    expect(starred.data!.map(d => d.id)).toEqual([first.id]);
    expect((await writer.listWorkspaceDocuments(wid, { starred: true })).data!).toEqual([]);
  }, 60000);

  it("editing a workspace template changes no existing document until each applies it (F-TPL-007)", async () => {
    const base = await owner.getTemplate("screenplay-standard");
    const named = (n: string) => ({ ...base, styles: base.styles.map(s => (s.id === "st_action" ? { ...s, name: n } : s)) });
    const tpl = await writer.createTemplate({ scope: "entity", entityId: wid, template: named("Action A") });
    expect(tpl).toMatchObject({ scope: "entity", entityId: wid, latestVersion: 1 });
    const d1 = await owner.createDocument(pid, { title: "Uses A 1", kind: "script", templateId: tpl.id });
    const d2 = await owner.createDocument(pid, { title: "Uses A 2", kind: "script", templateId: tpl.id });
    const actionName = async (id: string) => (await owner.getDocumentContent(id)).template.styles.find(s => s.id === "st_action")!.name;
    expect(await actionName(d1.id)).toBe("Action A");

    const v2 = await writer.createTemplateVersion(tpl.id, named("Action B"));
    expect(v2.latestVersion).toBe(2);
    expect(await actionName(d1.id)).toBe("Action A");
    expect(await actionName(d2.id)).toBe("Action A");
    expect((await owner.getDocument(d1.id)).template).toMatchObject({ id: tpl.id, version: 1 });
    expect((await owner.getTemplate(tpl.id, 1)).styles.find(s => s.id === "st_action")!.name).toBe("Action A");
    expect((await owner.getTemplate(tpl.id)).styles.find(s => s.id === "st_action")!.name).toBe("Action B");

    const dry = await owner.applyTemplate(d1.id, { templateId: tpl.id, dryRun: true });
    expect(isApplyTemplateJob(dry)).toBe(false);
    expect(dry).toMatchObject({ unmappedStyles: [] });
    const started = await owner.applyTemplate(d1.id, { templateId: tpl.id });
    expect(isApplyTemplateJob(started)).toBe(true);
    const done = await finished(owner, started as Job);
    expect(done.status, JSON.stringify(done)).toBe("succeeded");
    expect(await actionName(d1.id)).toBe("Action B");
    expect(await actionName(d2.id)).toBe("Action A"); // untouched until it asks
    expect((await owner.getDocument(d1.id)).template).toMatchObject({ version: 2 });
    expect((await owner.listSnapshots(d1.id)).snapshots.some(s => s.autoReason === "pre-template")).toBe(true);

    // validation and file round trip
    const bad = await owner.createTemplate({ scope: "user", template: { ...base, styles: [] } }).catch(e => e);
    expect(bad).toBeInstanceOf(TemplateInvalidError);
    expect((bad as TemplateInvalidError).issues.length).toBeGreaterThan(0);
    const file = await owner.exportTemplate(tpl.id);
    expect(file.filename).toBe(`${tpl.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}.fwtemplate.json`);
    const back = await owner.importTemplate({ scope: "user", filename: file.filename, bytes: file.bytes });
    expect(back).toMatchObject({ scope: "user", latestVersion: 1 });
    expect((await owner.listTemplates({ scope: "user" })).map(t => t.id)).toContain(back.id);
    expect((await writer.listTemplates({ scope: "user" })).map(t => t.id)).not.toContain(back.id);
    await expect(owner.importTemplate({ scope: "user", filename: "x.fdxt", bytes: new TextEncoder().encode("<FinalDraft Template=\"Yes\"/>") })).rejects.toMatchObject({ code: "UNSUPPORTED_FORMAT" });
    await expect(owner.updateTemplate("screenplay-standard", { name: "x" })).rejects.toMatchObject({ code: "BUILTIN_IMMUTABLE", status: 409 });
    expect(await owner.deleteTemplate(back.id)).toEqual({ archived: true });

    // a template that cannot map a used style
    const noTransition = {
      ...base,
      styles: base.styles.filter(s => s.id !== "st_transition").map(s => ({ ...s, flow: s.flow && Object.fromEntries(Object.entries(s.flow).map(([k, v]) => [k, v === "st_transition" ? null : v])) })),
      defaults: { ...base.defaults, transition: "st_action" },
    } as typeof base;
    const nt = await owner.createTemplate({ scope: "user", template: noTransition });
    const doc = await owner.createDocument(pid, { title: "Transitions", kind: "script" });
    await owner.applyCommands(doc.id, { commands: [{ id: "element.insert", params: { style: "st_transition", text: "CUT TO:" } }], baseEpoch: 0 });
    const err = await owner.applyTemplate(doc.id, { templateId: nt.id }).catch(e => e);
    expect(err).toBeInstanceOf(UnmappedStylesError);
    expect((err as UnmappedStylesError).unmappedStyles).toEqual(["st_transition"]);
  }, 60000);

  it("Shared Bin, defaults with a lost race, contacts, the public-links switch", async () => {
    const item = await writer.addToProjectBin(pid, { title: "Cold open", elements: [{ id: "el_1", style: "st_action", text: { plain: "Fade in.", marks: [] }, notes: [{ id: "n" }] }] });
    expect(item.elements[0]).not.toHaveProperty("notes");
    expect((await owner.listProjectBin(pid)).data!.map(i => i.id)).toEqual([item.id]);
    expect(await writer.removeFromProjectBin(item.id)).toEqual({ deleted: true });
    expect((await owner.listProjectBin(pid)).data!).toEqual([]);

    // two devices: the second write carries an old token and is merged onto the server copy by the client
    const d0 = await admin.getWorkspaceDefaults(wid);
    const ownerDevice = mk(U("owner"));
    const first = await admin.setWorkspaceDefaults(wid, { noteTypes: [{ key: "todo" }] }, d0);
    const merged = await ownerDevice.setWorkspaceDefaults(wid, { worksheets: [{ id: "w1" }], defaultProjectRole: "member" }, d0); // stale base
    expect(merged.noteTypes).toEqual([{ key: "todo" }]); // the other device's write survived
    expect(merged).toMatchObject({ worksheets: [{ id: "w1" }], defaultProjectRole: "member" });
    expect(Date.parse(merged.updatedAt)).toBeGreaterThan(Date.parse(first.updatedAt));
    await expect(writer.setWorkspaceDefaults(wid, { noteTypes: [] })).rejects.toMatchObject({ status: 403 });

    const made = await admin.createContacts(wid, [{ name: "Zoe Zed", email: "zoe@zed.example" }, { name: "Adam Able" }]);
    expect((await owner.listContacts(wid)).data!.map(c => c.name)).toEqual(["Adam Able", "Zoe Zed"]);
    expect((await owner.listContacts(wid, { q: "zed" })).data!).toHaveLength(1);
    expect(await admin.updateContact(made[0]!.id, { company: "Zed Films" })).toMatchObject({ company: "Zed Films" });
    expect(await admin.deleteContact(made[1]!.id)).toEqual({ deleted: true });
    await expect(writer.createContacts(wid, [{ name: "no" }])).rejects.toMatchObject({ status: 403 });

    // F-SET-009
    const doc = await owner.createDocument(pid, { title: "Link me", kind: "script" });
    const link = await owner.createDocumentShareLink(doc.id, { access: "view" });
    expect((await owner.resolveShareLink(link.token)).targetType).toBe("document");
    await admin.updateManagedEntity(wid, { allowPublicLinks: false });
    const err = await owner.resolveShareLink(link.token).catch(e => e);
    expect(err).toBeInstanceOf(ShareLinkExpiredError);
    expect((err as ShareLinkExpiredError).reason).toBe("disabled");
    await expect(owner.createDocumentShareLink(doc.id, { access: "view" })).rejects.toMatchObject({ status: 403 });
    await admin.updateManagedEntity(wid, { allowPublicLinks: true });
    expect((await owner.resolveShareLink(link.token)).targetType).toBe("document");
  }, 60000);

  it("empty trash and purge a project", async () => {
    const proj = await owner.createProject(wid, { name: "Goner" });
    const d = await owner.createDocument(proj.id, { title: "Inside", kind: "script" });
    await owner.trashProject(proj.id);
    await expect(admin.deleteProject(proj.id, "wrong")).rejects.toMatchObject({ code: "CONFIRMATION_MISMATCH" });
    expect(await admin.deleteProject(proj.id, "Goner")).toEqual({ purgeScheduled: true });
    await until(async () => (await owner.getProject(proj.id).then(() => false, (e: ApiError) => e.status === 404)) || false);
    await expect(owner.getDocument(d.id)).rejects.toMatchObject({ status: 404 });

    const lone = await owner.createDocument(pid, { title: "Lone trashed", kind: "script" });
    await owner.trashDocument(lone.id);
    const job = await admin.emptyTrash(wid);
    expect(job.kind).toBe("system.purge");
    expect((await finished(admin, job)).status).toBe("succeeded");
    expect((await owner.listTrash(wid)).data!).toEqual([]);
    await expect(owner.getDocument(lone.id)).rejects.toMatchObject({ status: 404 });
  }, 60000);
});
