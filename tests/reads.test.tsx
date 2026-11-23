// @vitest-environment happy-dom
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react";
import {
  ApiError,
  LocatorAmbiguousError,
  LocatorNotFoundError,
  ReportKindUnavailableError,
  ReportOptionsInvalidError,
  ScreenwriterClient,
  ScreenwriterClientProvider,
  isReportJob,
  queryKeys,
  useApplyCommands,
  useBeats,
  useCreateReport,
  useDocumentSearch,
  useEntities,
  useEntityUsage,
  useNotes,
  useReport,
  useReportKinds,
  useResolveLocator,
  useScenePacket,
  useSearch,
  useStats,
  useTags,
  type NetworkClient,
} from "../src";

interface Call {
  method: string;
  path: string;
  query: Record<string, string>;
  body: unknown;
}

/** Fake API: records requests, answers what a handler returns (data) or a failure `{status, code, details}`. */
function fake(handler: (c: Call) => unknown | { __fail: { status: number; code: string; details?: object } }) {
  const calls: Call[] = [];
  const network: NetworkClient = {
    async request(req) {
      const u = new URL(req.url);
      const c: Call = { method: req.method, path: u.pathname, query: Object.fromEntries(u.searchParams), body: req.body ? JSON.parse(req.body as string) : undefined };
      calls.push(c);
      const r = handler(c) as { __fail?: { status: number; code: string; details?: object }; __text?: string; __headers?: Record<string, string> } | undefined;
      if (r && "__fail" in r && r.__fail) {
        return { status: r.__fail.status, headers: {}, body: new TextEncoder().encode(JSON.stringify({ success: false, error: "no", code: r.__fail.code, details: r.__fail.details })) };
      }
      if (r && "__text" in r) return { status: 200, headers: r.__headers ?? {}, body: new TextEncoder().encode(r.__text) };
      return { status: 200, headers: {}, body: new TextEncoder().encode(JSON.stringify({ success: true, data: r ?? null })) };
    },
  };
  return { network, calls };
}

const setup = (network: NetworkClient) => {
  const client = new ScreenwriterClient({ network, baseUrl: "http://x", getToken: async () => "t", retry: false });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children?: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(ScreenwriterClientProvider, { client, children }));
  return { client, qc, wrapper };
};

const B = "/api/v1/documents/doc_1";

describe("B10 client methods hit the documented routes", () => {
  it("entities, tags, notes, beats, bin, revisions, changes, alternates, title page, stats, shots", async () => {
    const { network, calls } = fake(() => ({}));
    const { client } = setup(network);
    await client.listEntities("doc_1", { kind: "character", q: "may", limit: 10, cursor: "abc", source: "snapshot:snap_1" });
    await client.getEntity("doc_1", "ent_1", "version:ver_1");
    await client.getEntityUsage("doc_1", "ent_1", { variantId: "evr_1" });
    await client.getEntityDialogue("doc_1", "ent_1", { sceneIds: ["el_a", "el_b"] });
    await client.listTagCategories("doc_1");
    await client.listTags("doc_1", { sceneId: "el_s", categoryId: "cat_1", entityId: "ent_1" });
    await client.listNotes("doc_1", { status: "pending", type: "General" });
    await client.listBeats("doc_1");
    await client.getBin("doc_1");
    await client.listRevisions("doc_1");
    await client.listChanges("doc_1", { authorId: "u1" });
    await client.getAlternates("doc_1", "el/odd id");
    await client.getTitlePage("doc_1");
    await client.getStats("doc_1", "snapshot:snap_2");
    await client.listSceneShots("doc_1", "el_s");
    expect(calls.map(c => [c.method, c.path, c.query])).toEqual([
      ["GET", `${B}/entities`, { kind: "character", q: "may", limit: "10", cursor: "abc", source: "snapshot:snap_1" }],
      ["GET", `${B}/entities/ent_1`, { source: "version:ver_1" }],
      ["GET", `${B}/entities/ent_1/usage`, { variantId: "evr_1" }],
      ["GET", `${B}/entities/ent_1/dialogue`, { sceneIds: "el_a,el_b" }],
      ["GET", `${B}/tag-categories`, {}],
      ["GET", `${B}/tags`, { sceneId: "el_s", categoryId: "cat_1", entityId: "ent_1" }],
      ["GET", `${B}/notes`, { status: "pending", type: "General" }],
      ["GET", `${B}/beats`, {}],
      ["GET", `${B}/bin`, {}],
      ["GET", `${B}/revisions`, {}],
      ["GET", `${B}/changes`, { authorId: "u1" }],
      ["GET", `${B}/alternates/el%2Fodd%20id`, {}],
      ["GET", `${B}/title-page`, {}],
      ["GET", `${B}/stats`, { source: "snapshot:snap_2" }],
      ["GET", `${B}/scenes/el_s/shots`, {}],
    ]);
    // reads carry no Idempotency-Key and no body
    expect(calls.every(c => c.body === undefined)).toBe(true);
  });

  it("getFountain returns the text and the continuation header", async () => {
    const { network, calls } = fake(() => ({ __text: "INT. LAB - DAY\n", __headers: { "x-next-from-scene": "el_next" } }));
    const { client } = setup(network);
    const r = await client.getFountain("doc_1", { sceneIds: ["el_a"], fromSceneId: "el_b" });
    expect(r).toEqual({ text: "INT. LAB - DAY\n", nextFromScene: "el_next" });
    expect(calls[0]).toMatchObject({ path: `${B}/fountain`, query: { sceneIds: "el_a", fromSceneId: "el_b" } });
    const { network: n2 } = fake(() => ({ __text: "x" }));
    expect((await setup(n2).client.getFountain("doc_1")).nextFromScene).toBeNull();
  });

  it("locators: batch is a POST body, single is a query; snapshotId is passed", async () => {
    const { network, calls } = fake(c => (c.method === "POST" ? [{ status: "resolved", kind: "scene", id: "el_1", label: "#1" }] : { status: "resolved", kind: "scene", id: "el_1", label: "#1" }));
    const { client } = setup(network);
    const many = await client.resolveLocators("doc_1", ["#1", "@5"], "snap_9");
    expect(many[0]).toMatchObject({ status: "resolved", id: "el_1" });
    const single = await client.resolveLocator("doc_1", "#12A");
    expect(single.id).toBe("el_1");
    expect(calls[0]).toMatchObject({ method: "POST", path: `${B}/resolve`, body: { locators: ["#1", "@5"], snapshotId: "snap_9" } });
    expect(calls[1]).toMatchObject({ method: "GET", path: `${B}/resolve`, query: { ref: "#12A" } });
  });

  it("search: global, workspace and document; list params are comma-joined", async () => {
    const { network, calls } = fake(() => ([]));
    const { client } = setup(network);
    await client.search({ q: "ledger", entityId: "ws_1", types: ["element", "note"], styleIds: ["st_action"], characterId: "ent_1", language: "en", limit: 5 });
    await client.searchWorkspace("ws_1", { q: "x", types: ["entity"] });
    await client.searchDocument("doc_1", { q: "a.*b", mode: "regex", styles: ["st_action", "st_dialogue"], characters: ["ent_1"], limit: 10 });
    expect(calls.map(c => [c.path, c.query])).toEqual([
      ["/api/v1/search", { q: "ledger", entityId: "ws_1", types: "element,note", styleIds: "st_action", characterId: "ent_1", language: "en", limit: "5" }],
      ["/api/v1/entities/ws_1/search", { q: "x", types: "entity" }],
      [`${B}/search`, { q: "a.*b", mode: "regex", styles: "st_action,st_dialogue", characters: "ent_1", limit: "10" }],
    ]);
  });

  it("reports: kinds, one report with JSON options, create; isReportJob tells a job from a result", async () => {
    const result = { kind: "scene", title: "Scene report", documentId: "doc_1", source: "live", options: {}, tables: [] };
    const job = { id: "job_1", kind: "report.render", status: "queued" };
    const { network, calls } = fake(c => (c.path.endsWith("/reports/kinds") ? [] : c.method === "POST" && (c.body as { format: string }).format !== "json" ? job : result));
    const { client } = setup(network);
    await client.getReportKinds();
    const got = await client.getReport("doc_1", "scene", { source: "snapshot:snap_1", options: { sort: "sceneNumber" } });
    const pdf = await client.createReport("doc_1", { kind: "scene", options: {}, format: "pdf" });
    const json = await client.createReport("doc_1", { kind: "scene", options: {}, format: "json" });
    expect(isReportJob(got)).toBe(false);
    expect(isReportJob(pdf)).toBe(true);
    expect(isReportJob(json)).toBe(false);
    expect(calls[0]).toMatchObject({ path: "/api/v1/reports/kinds" });
    expect(calls[1]).toMatchObject({ path: `${B}/reports/scene`, query: { source: "snapshot:snap_1", options: JSON.stringify({ sort: "sceneNumber" }) } });
    expect(calls[2]).toMatchObject({ method: "POST", path: `${B}/reports`, body: { kind: "scene", options: {}, format: "pdf" } });
  });

  it("packets: the locator is URL-encoded, query flags are sent", async () => {
    const { network, calls } = fake(() => ({}));
    const { client } = setup(network);
    await client.getScenePacket("doc_1", "#12A", { snapshotId: "snap_1", include: ["neighbors", "-script"] });
    await client.getCharacterPacket("doc_1", "MAYA (V.O.)");
    await client.getLocationPacket("doc_1", "location diner");
    await client.getShotPacket("doc_1", "12A/3");
    expect(calls.map(c => [c.path, c.query])).toEqual([
      [`${B}/packets/scene/%2312A`, { snapshotId: "snap_1", include: "neighbors,-script" }],
      [`${B}/packets/character/MAYA%20(V.O.)`, {}],
      [`${B}/packets/location/location%20diner`, {}],
      [`${B}/packets/shot/12A%2F3`, {}],
    ]);
  });
});

describe("typed errors", () => {
  const failing = (code: string, status: number, details: object) => fake(() => ({ __fail: { status, code, details } }));

  it("LocatorAmbiguousError carries the candidates, LocatorNotFoundError the suggestions", async () => {
    const amb = await setup(failing("LOCATOR_AMBIGUOUS", 409, { candidates: [{ id: "el_1", label: "a", score: 1 }] }).network).client.resolveLocator("doc_1", "x").catch(e => e);
    expect(amb).toBeInstanceOf(LocatorAmbiguousError);
    expect(amb).toBeInstanceOf(ApiError);
    expect(amb.candidates).toEqual([{ id: "el_1", label: "a", score: 1 }]);
    expect(amb.status).toBe(409);
    const nf = await setup(failing("LOCATOR_NOT_FOUND", 404, { suggestions: [{ id: "el_2", label: "b" }] }).network).client.getScenePacket("doc_1", "#99").catch(e => e);
    expect(nf).toBeInstanceOf(LocatorNotFoundError);
    expect(nf.suggestions).toEqual([{ id: "el_2", label: "b" }]);
    const bare = await setup(failing("LOCATOR_NOT_FOUND", 404, {}).network).client.resolveLocator("doc_1", "x").catch(e => e);
    expect(bare.suggestions).toEqual([]);
    const invalid = await setup(failing("INVALID_LOCATOR", 400, {}).network).client.resolveLocator("doc_1", "#").catch(e => e);
    expect(invalid).toBeInstanceOf(ApiError);
    expect(invalid.code).toBe("INVALID_LOCATOR");
  });

  it("report errors are typed", async () => {
    const opts = await setup(failing("REPORT_OPTIONS_INVALID", 400, { issues: [{ path: "sort", message: "must be one of" }] }).network).client.getReport("doc_1", "scene", { options: { sort: "x" } }).catch(e => e);
    expect(opts).toBeInstanceOf(ReportOptionsInvalidError);
    expect(opts.issues).toEqual([{ path: "sort", message: "must be one of" }]);
    const un = await setup(failing("REPORT_KIND_UNAVAILABLE", 501, { reason: "no goals" }).network).client.createReport("doc_1", { kind: "structure", options: {}, format: "json" }).catch(e => e);
    expect(un).toBeInstanceOf(ReportKindUnavailableError);
    expect(un.reason).toBe("no goals");
    const rx = await setup(failing("INVALID_REGEX", 400, {}).network).client.searchDocument("doc_1", { q: "(", mode: "regex" }).catch(e => e);
    expect(rx.code).toBe("INVALID_REGEX");
  });
});

describe("hooks", () => {
  it("useEntities / useStats / useTags read through the client and key under the document family", async () => {
    const { network, calls } = fake(c => (c.path.endsWith("/entities") ? [{ id: "ent_1", name: "MAYA" }] : c.path.endsWith("/stats") ? { pages: 3 } : []));
    const { wrapper, qc } = setup(network);
    const ents = renderHook(() => useEntities("doc_1", { kind: "character" }), { wrapper });
    const stats = renderHook(() => useStats("doc_1"), { wrapper });
    const tags = renderHook(() => useTags("doc_1", { sceneId: "el_s" }), { wrapper });
    await waitFor(() => expect(ents.result.current.data?.data![0]?.name).toBe("MAYA"));
    await waitFor(() => expect(stats.result.current.data?.pages).toBe(3));
    await waitFor(() => expect(tags.result.current.data).toEqual([]));
    expect(calls.map(c => c.path).sort()).toEqual([`${B}/entities`, `${B}/stats`, `${B}/tags`]);
    for (const key of [queryKeys.entities("doc_1", { kind: "character" }), queryKeys.stats("doc_1"), queryKeys.tags("doc_1", { sceneId: "el_s" })]) {
      expect(key.slice(0, 3)).toEqual(queryKeys.documentFamily("doc_1").slice(0, 3));
      expect(qc.getQueryCache().find({ queryKey: key })).toBeTruthy();
    }
  });

  it("an applied command batch invalidates every read (they sit under the document family); a dry run does not", async () => {
    let usageTotal = 1;
    const { network, calls } = fake(c => {
      if (c.path.endsWith("/commands")) {
        if ((c.body as { dryRun?: boolean }).dryRun !== true) usageTotal += 1;
        return { applied: 1, epoch: 0, effects: { createdIds: [], changedIds: [], deletedIds: [], newHashes: {} }, warnings: [] };
      }
      return { total: usageTotal, cues: [], headings: [], sceneLinks: [], tags: [], arcBeats: [], noteMentions: [], assetLinks: [], byVariant: {}, unassigned: 0 };
    });
    const { wrapper } = setup(network);
    const usage = renderHook(() => useEntityUsage("doc_1", "ent_1"), { wrapper });
    const apply = renderHook(() => useApplyCommands("doc_1"), { wrapper });
    await waitFor(() => expect(usage.result.current.data?.total).toBe(1));
    await act(async () => {
      await apply.result.current.mutateAsync({ commands: [{ id: "x" }], baseEpoch: 0, dryRun: true });
    });
    expect(calls.filter(c => c.path.endsWith("/usage")).length).toBe(1);
    await act(async () => {
      await apply.result.current.mutateAsync({ commands: [{ id: "x" }], baseEpoch: 0 });
    });
    await waitFor(() => expect(usage.result.current.data?.total).toBe(2));
    expect(calls.filter(c => c.path.endsWith("/usage")).length).toBe(2);
  });

  it("useSearch is idle for an empty query; useDocumentSearch reports INVALID_REGEX without retrying", async () => {
    const { network, calls } = fake(c => (c.path.endsWith("/search") && c.path.includes("/documents/") ? { __fail: { status: 400, code: "INVALID_REGEX" } } : []));
    const { wrapper } = setup(network);
    const idle = renderHook(() => useSearch({ q: "  " }), { wrapper });
    expect(idle.result.current.fetchStatus).toBe("idle");
    const live = renderHook(() => useSearch({ q: "ledger" }), { wrapper });
    await waitFor(() => expect(live.result.current.data?.data).toEqual([]));
    const rx = renderHook(() => useDocumentSearch("doc_1", { q: "(", mode: "regex" }), { wrapper });
    await waitFor(() => expect(rx.result.current.error).toBeTruthy());
    expect((rx.result.current.error as ApiError).code).toBe("INVALID_REGEX");
    expect(calls.filter(c => c.path === `${B}/search`).length).toBe(1);
  });

  it("useReportKinds, useReport, useCreateReport, useNotes, useBeats", async () => {
    const job = { id: "job_7", kind: "report.render", status: "queued" };
    const { network } = fake(c => {
      if (c.path.endsWith("/reports/kinds")) return [{ kind: "scene", available: true }];
      if (c.method === "POST") return job;
      if (c.path.includes("/reports/")) return { kind: "scene", tables: [] };
      return [];
    });
    const { wrapper } = setup(network);
    const kinds = renderHook(() => useReportKinds(), { wrapper });
    await waitFor(() => expect(kinds.result.current.data?.[0]?.kind).toBe("scene"));
    const rep = renderHook(() => useReport("doc_1", "scene", { options: { sort: "sceneNumber" } }), { wrapper });
    await waitFor(() => expect((rep.result.current.data as { kind: string }).kind).toBe("scene"));
    const create = renderHook(() => useCreateReport("doc_1"), { wrapper });
    let created: unknown;
    await act(async () => {
      created = await create.result.current.mutateAsync({ kind: "scene", options: {}, format: "csv" });
    });
    expect(isReportJob(created as never)).toBe(true);
    expect(renderHook(() => useReport("doc_1", undefined), { wrapper }).result.current.fetchStatus).toBe("idle");
    const notes = renderHook(() => useNotes("doc_1", { status: "pending" }), { wrapper });
    const beats = renderHook(() => useBeats("doc_1"), { wrapper });
    await waitFor(() => expect(notes.result.current.data).toEqual([]));
    await waitFor(() => expect(beats.result.current.data).toEqual([]));
  });

  it("useScenePacket surfaces the typed error and does not retry; useResolveLocator throws the typed error", async () => {
    const { network, calls } = fake(c => ({ __fail: { status: 409, code: "LOCATOR_AMBIGUOUS", details: { candidates: [] } }, path: c.path }));
    const { wrapper } = setup(network);
    const packet = renderHook(() => useScenePacket("doc_1", "INT. LAB"), { wrapper });
    await waitFor(() => expect(packet.result.current.error).toBeTruthy());
    expect(packet.result.current.error).toBeInstanceOf(LocatorAmbiguousError);
    expect(calls.length).toBe(1);
    const resolve = renderHook(() => useResolveLocator("doc_1"), { wrapper });
    await expect(act(async () => resolve.result.current.mutateAsync({ ref: "INT. LAB" }))).rejects.toBeInstanceOf(LocatorAmbiguousError);
  });
});
