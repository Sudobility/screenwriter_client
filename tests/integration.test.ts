/**
 * Runs against the REAL screenwriter_api, spawned under Bun on a free port with the dev auth bypass
 * and the local `screenwriter_test` database. Vitest runs on Node 22+, whose global WebSocket is used.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import * as Y from "yjs";
import {
  ApiError,
  createFetchNetworkClient,
  ScreenwriterClient,
  SyncClient,
  type EpochChangedEvent,
} from "../src";

const API_DIR = new URL("../../screenwriter_api/", import.meta.url).pathname;
const PORT = 19042 + Math.floor(Math.random() * 500);
const BASE = `http://localhost:${PORT}`;
const TOKEN = "dev:u1:a@b.co";

let server: ChildProcess | null = null;

const rest = new ScreenwriterClient({
  network: createFetchNetworkClient(),
  baseUrl: BASE,
  getToken: async () => TOKEN,
});

const newSync = () => new SyncClient({ url: rest.syncUrl(), getToken: async () => TOKEN });

async function waitFor(what: string, cond: () => boolean, ms = 8000) {
  const t0 = Date.now();
  while (!cond()) {
    if (Date.now() - t0 > ms) throw new Error(`timeout waiting for ${what}`);
    await new Promise(r => setTimeout(r, 20));
  }
}

const sameState = (a: Y.Doc, b: Y.Doc) =>
  Buffer.from(Y.encodeStateVector(a)).equals(Buffer.from(Y.encodeStateVector(b)));

beforeAll(async () => {
  server = spawn("bun", ["run", "src/index.ts"], {
    cwd: API_DIR,
    env: {
      ...process.env,
      PORT: String(PORT),
      DATABASE_URL: "postgres://localhost:5432/screenwriter_test",
      PUBLIC_APP_URL: "http://localhost:5143",
      AI_TEST_MODE: "1",
      LOG_LEVEL: "error",
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
  if (!s) return;
  const exited = new Promise(r => s.once("exit", r));
  s.kill("SIGTERM");
  await exited;
});

describe("REST against the real API", () => {
  it("me, project, document from a template, state decoded with the client's own yjs", async () => {
    const me = await rest.me();
    expect(me.email).toBe("a@b.co");

    const templates = await rest.listTemplates();
    expect(templates.length).toBeGreaterThan(0);
    const tpl = templates.find(t => t.builtinKey === "screenplay-standard") ?? templates[0]!;

    const project = await rest.createProject(me.personalEntityId, { name: `client-test ${Date.now()}` });
    const doc = await rest.createDocument(project.id, { title: "Pilot", kind: "script", templateId: tpl.id });
    expect(doc.projectId).toBe(project.id);

    const { state, epoch } = await rest.getDocumentState(doc.id);
    expect(epoch).toBe(0);
    const ydoc = new Y.Doc();
    Y.applyUpdateV2(ydoc, state);
    expect(ydoc instanceof Y.Doc).toBe(true); // single Yjs instance: the API's bytes decode with our import
    expect(ydoc.share.size).toBeGreaterThan(0);

    expect((await rest.listDocuments(project.id)).data!.map(d => d.id)).toContain(doc.id);
    expect((await rest.getDocument(doc.id)).template?.styles.length).toBeGreaterThan(0);
  });

  it("throws a typed ApiError with code and status", async () => {
    const err = await rest.getProject("prj_doesnotexist").catch(e => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(404);
    expect(err.code).toMatch(/NOT_FOUND/);
  });
});

// B15: the server refuses updates outside the document's declared top-level types (spec 03 §3.1 step 2), so these scratch writes use the
// declared `settings` map instead of an invented root type.
describe("sync client against the real API", () => {
  let docId = "";
  let projectId = "";
  const clients: SyncClient[] = [];
  afterAll(() => clients.forEach(c => c.disconnect()));

  beforeAll(async () => {
    const me = await rest.me();
    const project = await rest.createProject(me.personalEntityId, { name: `sync-test ${Date.now()}` });
    projectId = project.id;
    docId = (await rest.createDocument(project.id, { title: "Sync", kind: "script" })).id;
  });

  it("two clients converge, awareness relays, reconnect resumes, epoch change is reported", async () => {
    const a = newSync();
    const b = newSync();
    clients.push(a, b);
    const docA = new Y.Doc();
    const docB = new Y.Doc();

    let awarenessSeenByB: Map<number, unknown> = new Map();
    const subA = a.subscribe(docId, docA, { epoch: 0 });
    const subB = b.subscribe(docId, docB, { epoch: 0, onAwareness: s => (awarenessSeenByB = s) });
    await Promise.all([a.connect(), b.connect()]);
    await waitFor("both synced", () => subA.status === "synced" && subB.status === "synced");
    expect(sameState(docA, docB)).toBe(true);

    // A edit reaches B
    docA.getMap("settings").set("k", "from-A");
    await waitFor("B sees A edit", () => docB.getMap("settings").get("k") === "from-A");
    // B edit reaches A, and nothing echoes back forever
    docB.getMap("settings").set("k2", "from-B");
    await waitFor("A sees B edit", () => docA.getMap("settings").get("k2") === "from-B");
    await waitFor("acks", () => subA.unackedCount === 0 && subB.unackedCount === 0);
    expect(sameState(docA, docB)).toBe(true);

    // awareness relay
    subA.setLocalAwareness({ name: "Ann", cursor: 3 });
    await waitFor("awareness on B", () => awarenessSeenByB.size === 1);
    expect([...awarenessSeenByB.values()][0]).toEqual({ name: "Ann", cursor: 3 });

    // reconnect: drop A's socket, B edits meanwhile, A resubscribes with its state vector and catches up
    const statuses: string[] = [];
    a.on("status", s => statuses.push(s));
    (a as unknown as { ws: WebSocket }).ws.close(4000, "test drop");
    docB.getMap("settings").set("while-away", true);
    await waitFor("A reconnected", () => a.status === "connected" && statuses.includes("disconnected"));
    await waitFor("A caught up", () => docA.getMap("settings").get("while-away") === true);
    expect(sameState(docA, docB)).toBe(true);

    // epoch change: opening a snapshot is reported on both clients and they are NOT silently resubscribed
    const events: EpochChangedEvent[] = [];
    a.on("epochChanged", e => events.push(e));
    const eventsB: EpochChangedEvent[] = [];
    b.on("epochChanged", e => eventsB.push(e));
    const snap = await rest.createSnapshot(docId, { name: "Before" });
    const opened = await rest.openSnapshot(snap.id);
    expect(opened.epoch).toBe(1);
    await waitFor("epochChanged on A and B", () => events.length >= 1 && eventsB.length >= 1);
    expect(events[0]).toMatchObject({ documentId: docId, liveEpoch: 1 });
    expect(eventsB[0]).toMatchObject({ documentId: docId, liveEpoch: 1 });
    expect(subA.state).toBe("stale");
    await waitFor("reconnected after 4409", () => a.status === "connected");
    docA.getMap("settings").set("after", "epoch"); // stale doc: must not be sent
    await new Promise(r => setTimeout(r, 300));
    expect(subA.state).toBe("stale");
    expect(events.length).toBe(1); // reported once, not repeated by the 4409 close

    // the caller (lib) rebases: fresh doc, new epoch
    const fresh = new Y.Doc();
    const subFresh = a.subscribe(docId, fresh, { epoch: 1 });
    await waitFor("fresh synced", () => subFresh.status === "synced");
    expect(fresh.getMap("settings").get("after")).toBeUndefined();
    expect(fresh.getMap("settings").get("k")).toBe("from-A"); // restored content is the snapshot's
    void projectId;
  });

  it("stops after a rejected token (refreshes once first)", async () => {
    const calls: boolean[] = [];
    const bad = new SyncClient({
      url: rest.syncUrl(),
      getToken: async force => {
        calls.push(!!force);
        return "not-a-valid-token";
      },
    });
    clients.push(bad);
    const stopped = new Promise<{ reason: string }>(r => bad.on("stopped", r));
    const auth = new Promise<{ code: string }>(r => bad.on("authError", r));
    bad.connect().catch(() => undefined);
    expect((await auth).code).toBe("UNAUTHENTICATED");
    expect((await stopped).reason).toBe("AUTH_FAILED");
    expect(calls).toEqual([false, true]);
  });
});
