/**
 * B13 against the REAL screenwriter_api (spawned under Bun, dev auth, `screenwriter_test`), through the client:
 * preferences across two clients, a viewer's view state, offline sessions uploaded twice, macros, export and delete.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { inflateRawSync } from "node:zlib";
import {
  MacroTriggerTakenError,
  OwnsTeamWorkspaceError,
  ScreenwriterClient,
  createFetchNetworkClient,
  newWritingSessionId,
} from "../src";
// postgres.js: fixtures and cleanup only (this package has no DB access of its own at runtime).
import postgres from "postgres";

const API_DIR = new URL("../../screenwriter_api/", import.meta.url).pathname;
const PORT = 20400 + Math.floor(Math.random() * 300);
const BASE = `http://localhost:${PORT}`;
const DB_URL = "postgres://localhost:5432/screenwriter_test";
const RUN = Math.random().toString(36).slice(2, 7);
const U = (name: string) => `clac-${RUN}-${name}`;
const mk = (uid: string) => new ScreenwriterClient({ network: createFetchNetworkClient(), baseUrl: BASE, getToken: async () => `dev:${uid}:${uid}@x.co`, clientTag: "web/test" });

const FDX = `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<FinalDraft DocumentType="Script" Template="No" Version="5"><Content>
<Paragraph Type="Scene Heading"><Text>INT. LAB - DAY</Text></Paragraph>
<Paragraph Type="Action"><Text>Dust floats in the light.</Text></Paragraph>
</Content></FinalDraft>
`;

let server: ChildProcess | null = null;
const sql = () => postgres(DB_URL, { max: 1, onnotice: () => undefined });

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
    await db`DELETE FROM audit_log WHERE actor_user_id LIKE ${`clac-${RUN}%`}`;
    await db`DELETE FROM idempotency_keys WHERE principal LIKE ${`%clac-${RUN}%`}`;
    await db`DELETE FROM workspaces WHERE created_by LIKE ${`clac-${RUN}%`}`;
    await db`DELETE FROM users WHERE id LIKE ${`clac-${RUN}%`}`;
  } finally {
    await db.end();
  }
});

describe("B13 against the real API", () => {
  const owner = mk(U("owner"));
  const owner2 = mk(U("owner")); // the same account on a second device
  const viewer = mk(U("viewer"));
  let did = "";
  let wid = "";

  beforeAll(async () => {
    await owner.me();
    await viewer.me();
    wid = (await owner.listManagedEntities()).data![0]!.id;
    const db = sql();
    try {
      await db`INSERT INTO entity_members (entity_id, user_id, role) VALUES (${wid}, ${U("viewer")}, 'viewer')`;
    } finally {
      await db.end();
    }
    const pid = (await owner.createProject(wid, { name: "B13" })).id;
    did = (await owner.importDocument(pid, { filename: "lab.fdx", bytes: new TextEncoder().encode(FDX) })).document.id;
  }, 30000);

  it("preferences: 'Guess next character' on one device shows on another; concurrent devices both keep their keys", async () => {
    const d2 = await owner2.getPreferences(); // device 2 has read the document
    const saved = await owner.setPreferences({ editor: { guessNextCharacter: true } });
    expect(saved.updatedAt > d2.updatedAt).toBe(true);
    expect((await owner2.getPreferences()).editor).toEqual({ guessNextCharacter: true });

    // device 2 writes from its stale copy: the client merges onto the server copy and retries once
    const merged = await owner2.setPreferences({ appearance: { theme: "dark" } }, d2);
    expect(merged.editor).toEqual({ guessNextCharacter: true }); // device 1's key survived
    expect(merged.appearance).toEqual({ theme: "dark" });
    expect(await owner.getPreferences()).toEqual(merged);

    // both devices write different keys at the same instant: both end up in the document
    const base = await owner.getPreferences();
    await Promise.all([owner.setPreferences({ toolbar: { items: ["a"] } }, base), owner2.setPreferences({ language: { scriptDefault: "en-US" } }, base)]);
    expect(await owner.getPreferences()).toMatchObject({ editor: { guessNextCharacter: true }, appearance: { theme: "dark" }, toolbar: { items: ["a"] }, language: { scriptDefault: "en-US" } });
    // a null removes one
    expect((await owner.setPreferences({ toolbar: null })).toolbar).toBeUndefined();
    expect((await owner2.getPreferences()).toolbar).toBeUndefined();
    // even a hopelessly stale base is repaired by the merge-and-retry: no StaleWriteError reaches the caller
    const repaired = await owner.setPreferences({ editor: { x: 1 } }, { ...base, updatedAt: "2020-01-01T00:00:00.000Z" });
    expect(repaired.editor).toEqual({ x: 1 });
    expect(repaired.appearance).toEqual({ theme: "dark" });
  });

  it("a viewer saves their own view state; another device merges through STALE_WRITE; the owner's is separate", async () => {
    expect(await viewer.getMyDocumentState(did)).toEqual({});
    const first = await viewer.setMyDocumentState(did, { navigator: { tabs: [{ id: "scenes" }], activeTab: "scenes" } });
    expect(first.updatedAt).toBeTruthy();
    const viewer2 = mk(U("viewer"));
    expect(await viewer2.getMyDocumentState(did)).toEqual(first);
    const stale = await viewer2.getMyDocumentState(did);
    await viewer.setMyDocumentState(did, { views: { desktop: { view: "pages", zoom: 1.5 } } }); // device 1 moves on
    const merged = await viewer2.setMyDocumentState(did, { layout: { split: "vertical" } }, stale); // device 2 from its old copy
    expect(merged).toMatchObject({ navigator: { activeTab: "scenes" }, views: { desktop: { view: "pages" } }, layout: { split: "vertical" } });
    expect(await viewer.getMyDocumentState(did)).toEqual(merged);
    expect(await owner.getMyDocumentState(did)).toEqual({});
    // a viewer can star a readable document, and only that
    expect(await viewer.starDocument(did)).toEqual({ starred: true });
    expect(await viewer.unstarDocument(did)).toEqual({ starred: false });
    const stranger = mk(U("stranger"));
    await stranger.me();
    await expect(stranger.starDocument(did)).rejects.toMatchObject({ status: 404 });
    await expect(stranger.getMyDocumentState(did)).rejects.toMatchObject({ status: 404 });
  });

  it("sessions recorded offline are uploaded later, twice, and count once in the graph (F-STAT-002)", async () => {
    const stats0 = await owner.getWritingStats();
    expect(stats0.buckets.length).toBe(30);
    const day = stats0.buckets[stats0.buckets.length - 6]!.start;
    const session = {
      clientSessionId: newWritingSessionId(),
      documentId: did,
      startedAt: `${day}T12:00:00Z`,
      endedAt: `${day}T12:40:00Z`,
      activeSeconds: 2100,
      wordsAdded: 640,
      wordsRemoved: 40,
      netPagesEighths: 5,
    };
    // the device queued it offline and now flushes; a second device (or a retry after a lost response) sends it again
    await owner.recordWritingSession(session);
    await owner2.recordWritingSession(session);
    const stats = await owner.getWritingStats({ documentId: did });
    expect(stats.buckets.find(b => b.start === day)).toEqual({ start: day, wordsAdded: 640, wordsRemoved: 40, netPages: 0.625, activeSeconds: 2100 });
    expect(stats.buckets.reduce((a, b) => a + b.wordsAdded, 0)).toBe(640);
    expect(stats.streak.longest).toBe(1);
    // other accounts do not see it and cannot take its id
    expect((await viewer.getWritingStats()).buckets.every(b => b.wordsAdded === 0)).toBe(true);
    await expect(viewer.recordWritingSession(session)).rejects.toMatchObject({ code: "ID_CONFLICT" });
  });

  it("dictionary, macros (typed MACRO_TRIGGER_TAKEN), goals", async () => {
    expect(await owner.updateDictionary({ add: ["Voss", "Kessler"] })).toEqual({ count: 2 });
    expect((await owner2.getDictionary()).words).toEqual(["Kessler", "Voss"]);
    const m = await owner.createMacro({ name: "sig", trigger: { kind: "alias", value: "sig" }, insertText: "Best," });
    await expect(owner.createMacro({ name: "dup", trigger: { kind: "alias", value: "SIG" }, insertText: "x" })).rejects.toBeInstanceOf(MacroTriggerTakenError);
    expect((await owner.updateMacro(m.id, { options: { confirm: true } })).options).toMatchObject({ confirm: true, wordOnly: true });
    expect((await owner2.listMacros()).map(x => x.id)).toEqual([m.id]);
    await owner.deleteMacro(m.id);
    expect(await owner2.listMacros()).toEqual([]);
    const goals = await owner.setWritingGoals([{ kind: "wordsPerDay", target: 500, daysOfWeek: [1, 2, 3] }]);
    expect((await owner2.getWritingGoals())).toEqual(goals);
    expect(await owner.setWritingGoals([])).toEqual([]);
  });

  it("account export: the job produces a zip that holds the data", async () => {
    await owner.starDocument(did);
    const job = await owner.requestAccountExport();
    expect(job).toMatchObject({ kind: "account.export", status: expect.stringMatching(/queued|running|succeeded/) });
    const t0 = Date.now();
    let cur = job;
    while (cur.status !== "succeeded" && cur.status !== "failed") {
      if (Date.now() - t0 > 20000) throw new Error("export did not finish");
      await new Promise(r => setTimeout(r, 100));
      cur = await owner.getJob(job.id);
    }
    expect(cur.status).toBe("succeeded");
    const { outputs } = await owner.getJobOutputs(job.id);
    const zip = Buffer.from(outputs[0]!.url.split(",")[1]!, "base64");
    expect(zip.subarray(0, 2).toString()).toBe("PK");
    // find the profile entry through the central directory
    const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    let p = zip.readUInt32LE(end + 16);
    const files: Record<string, string> = {};
    for (let i = 0; i < zip.readUInt16LE(end + 10); i++) {
      const nameLen = zip.readUInt16LE(p + 28);
      const off = zip.readUInt32LE(p + 42);
      const name = zip.subarray(p + 46, p + 46 + nameLen).toString("utf8");
      const start = off + 30 + zip.readUInt16LE(off + 26) + zip.readUInt16LE(off + 28);
      const raw = zip.subarray(start, start + zip.readUInt32LE(p + 20));
      files[name] = (zip.readUInt16LE(p + 10) === 8 ? inflateRawSync(raw) : raw).toString("utf8");
      p += 46 + nameLen;
    }
    expect(JSON.parse(files["profile.json"]!).email).toBe(`${U("owner")}@x.co`);
    expect(JSON.parse(files["stars.json"]!)).toEqual({ documentIds: [did] });
    expect(Object.keys(files).some(n => n.endsWith(".fountain"))).toBe(true);
  }, 30000);

  it("delete: refused while sole owner of a team workspace with members; then scheduled, visible on me, and restorable", async () => {
    const boss = mk(U("boss"));
    const mate = mk(U("mate"));
    await boss.me();
    await mate.me();
    const team = await boss.createManagedEntity({ name: "Crew" });
    const db = sql();
    try {
      await db`INSERT INTO entity_members (entity_id, user_id, role) VALUES (${team.id}, ${U("mate")}, 'writer')`;
    } finally {
      await db.end();
    }
    const err = await boss.deleteAccount().then(() => null, e => e);
    expect(err).toBeInstanceOf(OwnsTeamWorkspaceError);
    expect((err as OwnsTeamWorkspaceError).entities).toEqual([{ id: team.id, name: "Crew", members: 2 }]);
    await boss.transferManagedEntity(team.id, U("mate"));
    const r = await boss.deleteAccount();
    expect(Date.parse(r.deletionScheduledFor)).toBeGreaterThan(Date.now() + 29 * 86_400_000);
    expect((await boss.me()).deletionScheduledFor).toBe(r.deletionScheduledFor);
    expect(await boss.restoreAccount()).toEqual({ restored: true });
    expect((await boss.me()).deletionScheduledFor).toBeNull();
    await expect(boss.restoreAccount()).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
  });
});
