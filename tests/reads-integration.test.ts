/**
 * B10 against the REAL screenwriter_api (spawned under Bun, dev auth, `screenwriter_test`): the projection-backed reads,
 * locators, search, reports (JSON, then CSV and PDF as jobs) and packets, through the client.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { cellText, reportToCsv, scenePacketSchema, characterPacketSchema, locationPacketSchema, type ReportResult } from "@sudobility/screenwriter_types";
import {
  LocatorAmbiguousError,
  LocatorNotFoundError,
  ReportKindUnavailableError,
  ReportOptionsInvalidError,
  ScreenwriterClient,
  createFetchNetworkClient,
  isReportJob,
} from "../src";

const API_DIR = new URL("../../screenwriter_api/", import.meta.url).pathname;
const PORT = 20100 + Math.floor(Math.random() * 200);
let server: ChildProcess | null = null;

const FDX = `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<FinalDraft DocumentType="Script" Template="No" Version="5"><Content>
<Paragraph Type="Scene Heading"><Text>INT. LAB - DAY</Text></Paragraph>
<Paragraph Type="Action"><Text>Dust floats in the light. A machine hums.</Text></Paragraph>
<Paragraph Type="Character"><Text>DR. VOSS</Text></Paragraph>
<Paragraph Type="Parenthetical"><Text>(checking a dial)</Text></Paragraph>
<Paragraph Type="Dialogue"><Text>It should not be running.</Text></Paragraph>
<Paragraph Type="Character"><Text>ASSISTANT</Text></Paragraph>
<Paragraph Type="Dialogue"><Text>Nobody touched it.</Text></Paragraph>
<Paragraph Type="Scene Heading"><Text>EXT. ROOF - NIGHT</Text></Paragraph>
<Paragraph Type="Action"><Text>Voss climbs out into the wind.</Text></Paragraph>
<Paragraph Type="Character"><Text>DR. VOSS</Text></Paragraph>
<Paragraph Type="Dialogue"><Text>Somebody rewired the machine.</Text></Paragraph>
<Paragraph Type="Transition"><Text>SMASH CUT TO:</Text></Paragraph>
<Paragraph Type="Scene Heading"><Text>INT. LAB - LATER</Text></Paragraph>
<Paragraph Type="Action"><Text>The machine has stopped.</Text></Paragraph>
</Content></FinalDraft>
`;

const uid = `rd-${Date.now().toString(36)}`;
const make = (u = uid) =>
  new ScreenwriterClient({ network: createFetchNetworkClient(), baseUrl: `http://localhost:${PORT}`, getToken: async () => `dev:${u}:${u}@x.co`, clientTag: "web/test" });
const c = make();

async function until<T>(fn: () => Promise<T>, done: (v: T) => boolean, ms = 15000): Promise<T> {
  const t0 = Date.now();
  for (;;) {
    const v = await fn();
    if (done(v)) return v;
    if (Date.now() - t0 > ms) throw new Error("timeout");
    await new Promise(r => setTimeout(r, 100));
  }
}

let did = "";
let wid = "";

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
      JOB_POLL_MS: "50",
      NORMALIZE_DEBOUNCE_MS: "100",
    },
    stdio: "ignore",
  });
  for (let i = 0; i < 200; i++) {
    try {
      if ((await fetch(`http://localhost:${PORT}/health`)).ok) break;
    } catch {
      /* not up yet */
    }
    await new Promise(r => setTimeout(r, 100));
  }
  await c.me();
  wid = (await c.listManagedEntities()).data![0]!.id;
  const pid = (await c.createProject(wid, { name: "B10 client" })).id;
  did = (await c.importDocument(pid, { filename: "lab.fdx", bytes: new TextEncoder().encode(FDX) })).document.id;
  // an import has no entity records until SmartType harvests them (the app runs this after import)
  await c.applyCommands(did, { commands: [{ id: "entity.rebuild", params: {} }], baseEpoch: 0 });
}, 60000);

afterAll(async () => {
  const s = server;
  if (!s) return;
  const exited = new Promise(r => s.once("exit", r));
  s.kill("SIGTERM");
  await exited;
});

describe("projection reads through the client", () => {
  it("entities: list, detail, usage equals the cues found by reading the script back", async () => {
    const chars = await c.listEntities(did, { kind: "character", limit: 50 });
    const voss = chars.data!.find(e => e.name === "DR. VOSS")!;
    expect(voss).toBeTruthy();
    const usage = await c.getEntityUsage(did, voss.id);
    // brute force through the B5 scene reads: count the character cues that name Voss
    const outline = await c.getOutline(did);
    const scenes = await c.getScenes(did, outline.scenes.map(s => s.id));
    const cues = scenes.scenes.flatMap(s => s.elements).filter(e => e.styleRole === "character" && e.text.startsWith("DR. VOSS"));
    expect(usage.cues.length).toBe(cues.length);
    expect(usage.cues.map(x => x.elementId).sort()).toEqual(cues.map(x => x.id).sort());
    expect(usage.total).toBe(usage.cues.length + usage.headings.length + usage.tags.length + usage.arcBeats.length);
    expect(usage.total).toBe(2);
    expect(usage.unassigned).toBe(0);
    const detail = await c.getEntity(did, voss.id);
    expect(detail).toMatchObject({ name: "DR. VOSS", kind: "character", sceneCount: 2 });
    const dialogue = await c.getEntityDialogue(did, voss.id);
    expect(dialogue.map(d => d.elements.map(e => e.text))).toEqual([["(checking a dial)", "It should not be running."], ["Somebody rewired the machine."]]);
    expect((await c.listEntities(did, { q: "assist" })).data!.map(e => e.name)).toEqual(["ASSISTANT"]);
  });

  it("stats, title page, tag categories, notes, beats, bin, revisions, changes, Fountain, shots", async () => {
    const stats = await c.getStats(did);
    expect(stats).toMatchObject({ scenes: 3 });
    expect(stats.pages).toBeGreaterThanOrEqual(1);
    expect(stats.eighths).toBeGreaterThan(0);
    expect((await c.getTitlePage(did)).fields).toBeTypeOf("object");
    expect((await c.listTagCategories(did)).length).toBeGreaterThanOrEqual(29);
    expect(await c.listNotes(did)).toEqual([]);
    expect(await c.listBeats(did)).toEqual([]);
    expect(await c.getBin(did)).toEqual([]);
    expect((await c.listRevisions(did)).sets.length).toBeGreaterThan(0);
    expect(await c.listChanges(did)).toEqual([]);
    expect(await c.listTags(did)).toEqual([]);
    const fountain = await c.getFountain(did);
    expect(fountain.text).toContain("INT. LAB - DAY");
    expect(fountain.nextFromScene).toBeNull();
    const roof = (await c.getOutline(did)).scenes[1]!;
    const sub = await c.getFountain(did, { sceneIds: [roof.id] });
    expect(sub.text).toContain("EXT. ROOF - NIGHT");
    expect(sub.text).not.toContain("INT. LAB - DAY");
    expect(await c.listSceneShots(did, roof.id)).toEqual([]);
    const snap = await c.createSnapshot(did, { name: "before" });
    expect((await c.getStats(did, `snapshot:${snap.id}`)).scenes).toBe(3);
  });

  it("locators: ordinals and names resolve; ambiguity and misses are typed errors on the single form", async () => {
    const r = await c.resolveLocators(did, ["@2", "DR. VOSS", '"INT. LAB - LATER"', "page 1", "#1", "INT. LAB"]);
    const outline = (await c.getOutline(did)).scenes;
    expect(r[0]).toMatchObject({ status: "resolved", kind: "scene", id: outline[1]!.id });
    expect(r[1]).toMatchObject({ status: "resolved", kind: "entity" });
    expect(r[2]).toMatchObject({ status: "resolved", kind: "scene", id: outline[2]!.id });
    expect(r[3]).toMatchObject({ status: "resolved", kind: "page", id: "1" });
    expect(r[4]).toMatchObject({ status: "not_found", kind: "scene" }); // never numbered: no silent ordinal
    expect((r[4] as { suggestions: { label: string }[] }).suggestions[0]!.label).toMatch(/^@1/);
    expect(r[5]!.status).toBe("ambiguous");
    const err = await c.resolveLocator(did, "INT. LAB").catch(e => e);
    expect(err).toBeInstanceOf(LocatorAmbiguousError);
    expect(err.candidates.length).toBe(2);
    expect(await c.resolveLocator(did, "@3")).toMatchObject({ status: "resolved", id: outline[2]!.id });
    expect(await c.resolveLocator(did, "#7").catch(e => e)).toBeInstanceOf(LocatorNotFoundError);
    expect((await c.resolveLocator(did, "@0").catch(e => e)).code).toBe("INVALID_LOCATOR");
  });

  it("search: in-document (text, regex) and global (once the normalizer has indexed the document)", async () => {
    const hits = await c.searchDocument(did, { q: "machine" });
    expect(hits.length).toBe(3);
    expect(hits[0]).toMatchObject({ sceneNumber: null, styleId: expect.any(String), snippet: expect.stringContaining("machine") });
    expect((await c.searchDocument(did, { q: "^Nobody.*it\\.$", mode: "regex" })).length).toBe(1);
    expect((await c.searchDocument(did, { q: "(", mode: "regex" }).catch(e => e)).code).toBe("INVALID_REGEX");
    const global = await until(() => c.search({ q: "machine", documentId: did }), r => r.data!.length >= 3);
    expect(global.data!.every(h => h.documentId === did)).toBe(true);
    const el = global.data!.find(h => h.type === "element")!;
    expect(el.marks.length).toBeGreaterThan(0);
    const ws = await c.searchWorkspace(wid, { q: "machine", types: ["element"] });
    expect(ws.data!.length).toBeGreaterThanOrEqual(3);
    const stranger = make(`${uid}-x`);
    await stranger.me();
    expect((await stranger.search({ q: "machine" })).data!).toEqual([]);
    expect(await stranger.search({ q: "machine", documentId: did }).catch(e => e)).toMatchObject({ code: "DOCUMENT_NOT_FOUND" });
  });

  it("reports: kinds, JSON, typed errors; CSV and PDF jobs carry the JSON rows", async () => {
    const kinds = await c.getReportKinds();
    expect(kinds.length).toBe(18);
    expect(kinds.find(k => k.kind === "structure")!.available).toBe(false);
    const res = await c.createReport(did, { kind: "scene", options: {}, format: "json" });
    expect(isReportJob(res)).toBe(false);
    const report = res as ReportResult;
    expect(report.tables[0]!.rows.map(r => r.heading)).toEqual(["INT. LAB - DAY", "EXT. ROOF - NIGHT", "INT. LAB - LATER"]);
    const viaGet = await c.getReport(did, "scene");
    expect((viaGet as ReportResult).tables).toEqual(report.tables);
    expect((await c.getReport(did, "cast")) as ReportResult).toMatchObject({ kind: "cast" });

    expect(await c.createReport(did, { kind: "scene", options: { sort: "nope" }, format: "json" }).catch(e => e)).toBeInstanceOf(ReportOptionsInvalidError);
    expect(await c.createReport(did, { kind: "structure", options: {}, format: "json" }).catch(e => e)).toBeInstanceOf(ReportKindUnavailableError);

    for (const format of ["csv", "pdf"] as const) {
      const job = await c.createReport(did, { kind: "scene", options: {}, format });
      expect(isReportJob(job)).toBe(true);
      const done = await until(() => c.getJob((job as { id: string }).id, { wait: 5 }), j => j.status === "succeeded");
      const out = (await c.getJobOutputs(done.id)).outputs[0]!;
      expect(out.name).toBe(`scene.${format}`);
      const bytes = Uint8Array.from(atob(out.url.split(",")[1]!), ch => ch.charCodeAt(0));
      if (format === "csv") expect(new TextDecoder().decode(bytes)).toBe(reportToCsv(report));
      else {
        const text = new TextDecoder("latin1").decode(bytes);
        expect(text.startsWith("%PDF-1.4")).toBe(true);
        for (const row of report.tables[0]!.rows) expect(text).toContain(cellText(row.heading!));
      }
    }
  });

  it("packets: scene by ordinal, character and location by name; the same shape MCP consumes", async () => {
    const scene = await c.getScenePacket(did, "@1", { include: ["neighbors"] });
    scenePacketSchema.parse(scene);
    expect(scene.body.scene.heading).toMatchObject({ raw: "INT. LAB - DAY", intro: "INT.", location: "LAB", time: "DAY" });
    expect(scene.body.script.map(e => e.type)).toEqual(["sceneHeading", "action", "character", "parenthetical", "dialogue", "character", "dialogue"]);
    expect(scene.body.cast.map(x => x.name)).toEqual(["ASSISTANT", "DR. VOSS"]);
    expect(scene.body.neighbors!.next!.heading).toBe("EXT. ROOF - NIGHT");
    const char = await c.getCharacterPacket(did, "DR. VOSS");
    characterPacketSchema.parse(char);
    expect(char.body.stats).toMatchObject({ sceneCount: 2, speakingSceneCount: 2 });
    const locs = (await c.listEntities(did, { kind: "location" })).data!;
    expect(locs.length).toBeGreaterThan(0);
    const loc = await c.getLocationPacket(did, locs[0]!.name);
    locationPacketSchema.parse(loc);
    expect(loc.body.location.name).toBe(locs[0]!.name);
    expect(await c.getScenePacket(did, "INT. LAB").catch(e => e)).toBeInstanceOf(LocatorAmbiguousError);
    expect((await c.getCharacterPacket(did, locs[0]!.name).catch(e => e)).code).toBe("KIND_MISMATCH");
  });
});
