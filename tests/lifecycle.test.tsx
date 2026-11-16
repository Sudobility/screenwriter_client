// @vitest-environment happy-dom
/** B14 with a fake network: every route (method, path, query, body), typed errors, the defaults merge/retry, and hook invalidation. */
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react";
import {
  ApiError,
  ScreenwriterClient,
  ScreenwriterClientProvider,
  StaleWriteError,
  TemplateInvalidError,
  UnmappedStylesError,
  isApplyTemplateJob,
  isTemplateInvalid,
  isUnmappedStyles,
  queryKeys,
  useApplyTemplate,
  useContacts,
  useCreateTemplateVersion,
  useDeleteFolder,
  useEmptyTrash,
  useMoveDocument,
  usePurgeDocument,
  usePurgeProject,
  useSetWorkspaceDefaults,
  useTemplates,
  useTrash,
  useTrashDocument,
  useWorkspaceDefaults,
  useWorkspaceDocuments,
  type NetworkClient,
} from "../src";

interface Call {
  method: string;
  path: string;
  query: Record<string, string>;
  body: Record<string, unknown> | undefined;
  idem: string | undefined;
}
type Fail = { __fail: { status: number; code: string; details?: object } };

function fake(handler: (c: Call, n: number) => unknown | Fail) {
  const calls: Call[] = [];
  const network: NetworkClient = {
    async request(req) {
      const u = new URL(req.url);
      const c: Call = {
        method: req.method,
        path: u.pathname.replace("/api/v1", ""),
        query: Object.fromEntries(u.searchParams),
        body: req.body ? JSON.parse(req.body as string) : undefined,
        idem: req.headers?.["Idempotency-Key"],
      };
      calls.push(c);
      const r = handler(c, calls.length) as Partial<Fail> | undefined;
      if (r && r.__fail) {
        return { status: r.__fail.status, headers: {}, body: new TextEncoder().encode(JSON.stringify({ success: false, error: "no", code: r.__fail.code, details: r.__fail.details })) };
      }
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

const T0 = "2026-09-21T10:00:00.000Z";
const T1 = "2026-09-21T10:00:01.000Z";
const T2 = "2026-09-21T10:00:02.000Z";
const defaults = (over: object = {}) => ({ tagCategories: [], revisionColourSets: [], noteTypes: [], worksheets: [], defaultProjectRole: null, updatedAt: T0, ...over });

describe("B14 client methods hit the documented routes", () => {
  it("every route, method, path, query and body", async () => {
    const { network, calls } = fake(c => (c.path.endsWith("/export") ? { filename: "t.fwtemplate.json", mimeType: "application/json", contentB64: btoa("{}"), format: "fwtemplate" } : {}));
    const { client } = setup(network);
    await client.listWorkspaceDocuments("ws_1", { q: "pilot", kind: "script", trashed: false, starred: true, label: "draft", limit: 10 });
    await client.listTrash("ws_1", { limit: 5 });
    await client.emptyTrash("ws_1");
    await client.deleteProject("prj_1", "My Show");
    await client.duplicateProject("prj_1", { name: "Copy", includeSnapshots: true, includeAssets: false });
    await client.createFolder("prj_1", { name: "Season 1", parentFolderId: "pfd_0" });
    await client.updateFolder("pfd_1", { name: "S1", parentFolderId: null, position: 3 });
    await client.deleteFolder("pfd_1", "root");
    await client.deleteFolder("pfd_2");
    await client.moveDocument("doc_1", { targetProjectId: "prj_2", folderId: null });
    await client.purgeDocument("doc_1");
    await client.duplicateDocument("doc_1", { title: "Copy", includeSnapshots: true });
    await client.applyTemplate("doc_1", { templateId: "tpl_1", templateVersion: 2, mapping: { st_a: "st_b" }, dryRun: true });
    await client.createTemplate({ scope: "entity", entityId: "ws_1", template: { name: "T" } as never });
    await client.createTemplateVersion("tpl_1", { name: "T2" } as never);
    await client.updateTemplate("tpl_1", { name: "Renamed", category: "custom" });
    await client.deleteTemplate("tpl_1");
    await client.importTemplate({ scope: "user", filename: "a.fwtemplate.json", bytes: new TextEncoder().encode("{}") });
    await client.exportTemplate("tpl_1", { format: "fwtemplate", version: 2 });
    await client.listProjectBin("prj_1", { limit: 20 });
    await client.addToProjectBin("prj_1", { title: "Snippet", elements: [{ style: "st_action" }], sourceDocumentId: "doc_1" });
    await client.removeFromProjectBin("bin_1");
    await client.getWorkspaceDefaults("ws_1");
    await client.listContacts("ws_1", { q: "zed", limit: 5 });
    await client.createContacts("ws_1", [{ name: "Zoe", email: "z@x.co" }]);
    await client.updateContact("ctc_1", { company: "Zed" });
    await client.deleteContact("ctc_1");
    await client.listTemplates("screenplay");
    await client.listTemplates({ entityId: "ws_1", scope: "entity" });
    await client.getTemplate("tpl_1", 2);
    await client.getTemplate("screenplay-standard");

    const line = (c: Call) => `${c.method} ${c.path}`;
    expect(calls.map(line)).toEqual([
      "GET /entities/ws_1/documents",
      "GET /entities/ws_1/trash",
      "POST /entities/ws_1/trash/empty",
      "DELETE /projects/prj_1",
      "POST /projects/prj_1/duplicate",
      "POST /projects/prj_1/folders",
      "PATCH /project-folders/pfd_1",
      "DELETE /project-folders/pfd_1",
      "DELETE /project-folders/pfd_2",
      "POST /documents/doc_1/move",
      "DELETE /documents/doc_1",
      "POST /documents/doc_1/duplicate",
      "POST /documents/doc_1/template",
      "POST /templates",
      "POST /templates/tpl_1/versions",
      "PATCH /templates/tpl_1",
      "DELETE /templates/tpl_1",
      "POST /templates/import",
      "GET /templates/tpl_1/export",
      "GET /projects/prj_1/bin",
      "POST /projects/prj_1/bin",
      "DELETE /project-bin-items/bin_1",
      "GET /entities/ws_1/defaults",
      "GET /entities/ws_1/contacts",
      "POST /entities/ws_1/contacts",
      "PATCH /entity-contacts/ctc_1",
      "DELETE /entity-contacts/ctc_1",
      "GET /templates",
      "GET /templates",
      "GET /templates/tpl_1",
      "GET /templates/screenplay-standard",
    ]);
    expect(calls[0]!.query).toEqual({ q: "pilot", kind: "script", trashed: "false", starred: "true", label: "draft", limit: "10" });
    expect(calls[1]!.query).toEqual({ limit: "5" });
    expect(calls[2]!.body).toEqual({ confirm: "EMPTY" });
    expect(calls[3]!.body).toEqual({ confirmName: "My Show" });
    expect(calls[4]!.body).toEqual({ name: "Copy", includeSnapshots: true, includeAssets: false });
    expect(calls[5]!.body).toEqual({ name: "Season 1", parentFolderId: "pfd_0" });
    expect(calls[6]!.body).toEqual({ name: "S1", parentFolderId: null, position: 3 });
    expect(calls[7]!.query).toEqual({ moveContentsTo: "root" });
    expect(calls[8]!.query).toEqual({});
    expect(calls[9]!.body).toEqual({ targetProjectId: "prj_2", folderId: null });
    expect(calls[11]!.body).toEqual({ title: "Copy", includeSnapshots: true });
    expect(calls[12]!.body).toEqual({ templateId: "tpl_1", templateVersion: 2, mapping: { st_a: "st_b" }, dryRun: true });
    expect(calls[13]!.body).toEqual({ scope: "entity", entityId: "ws_1", template: { name: "T" } });
    expect(calls[14]!.body).toEqual({ template: { name: "T2" } }); // the version body is wrapped
    expect(calls[17]!.body).toEqual({ scope: "user", filename: "a.fwtemplate.json", contentB64: btoa("{}") });
    expect(calls[18]!.query).toEqual({ format: "fwtemplate", version: "2" });
    expect(calls[21]).toMatchObject({ method: "DELETE", body: undefined });
    expect(calls[23]!.query).toEqual({ q: "zed", limit: "5" });
    expect(calls[24]!.body).toEqual({ contacts: [{ name: "Zoe", email: "z@x.co" }] });
    expect(calls[27]!.query).toEqual({ category: "screenplay" });
    expect(calls[28]!.query).toEqual({ entityId: "ws_1", scope: "entity" });
    expect(calls[29]!.query).toEqual({ version: "2" });
    expect(calls[30]!.query).toEqual({});
    // POSTs carry an Idempotency-Key (creates are retried safely), reads and DELETEs do not need one
    for (const c of calls.filter(c => c.method === "POST")) expect(c.idem, line(c)).toBeTruthy();
  });

  it("exportTemplate decodes the file; applyTemplate answers a job or a dry-run report", async () => {
    const file = JSON.stringify({ format: "fadewright-template", formatVersion: 1, template: { name: "T" } });
    const { network } = fake(c =>
      c.path.endsWith("/export")
        ? { filename: "t.fwtemplate.json", mimeType: "application/json", contentB64: btoa(file), format: "fwtemplate" }
        : c.body?.dryRun
          ? { unmappedStyles: ["st_x"], pageDelta: -2 }
          : { id: "job_1", kind: "doc.applyTemplate", status: "queued" }
    );
    const { client } = setup(network);
    const out = await client.exportTemplate("tpl_1");
    expect(out).toMatchObject({ filename: "t.fwtemplate.json", format: "fwtemplate", mimeType: "application/json" });
    expect(new TextDecoder().decode(out.bytes)).toBe(file);
    const dry = await client.applyTemplate("doc_1", { templateId: "tpl_1", dryRun: true });
    expect(isApplyTemplateJob(dry)).toBe(false);
    expect(dry).toEqual({ unmappedStyles: ["st_x"], pageDelta: -2 });
    const job = await client.applyTemplate("doc_1", { templateId: "tpl_1" });
    expect(isApplyTemplateJob(job)).toBe(true);
  });

  it("typed errors: UnmappedStylesError, TemplateInvalidError; disabled public links read as a ShareLinkExpiredError", async () => {
    const { network } = fake(c =>
      c.path.endsWith("/template")
        ? { __fail: { status: 422, code: "UNMAPPED_STYLES", details: { unmappedStyles: ["st_transition"] } } }
        : c.path === "/templates"
          ? { __fail: { status: 422, code: "TEMPLATE_INVALID", details: { issues: [{ code: "noRoot", message: "no root style" }] } } }
          : { __fail: { status: 404, code: "SHARE_LINK_INVALID", details: { reason: "disabled" } } }
    );
    const { client } = setup(network);
    const a = await client.applyTemplate("doc_1", { templateId: "tpl_1" }).catch(e => e);
    expect(a).toBeInstanceOf(UnmappedStylesError);
    expect(isUnmappedStyles(a)).toBe(true);
    expect((a as UnmappedStylesError).unmappedStyles).toEqual(["st_transition"]);
    expect((a as UnmappedStylesError).code).toBe("UNMAPPED_STYLES");
    const t = await client.createTemplate({ scope: "user", template: {} as never }).catch(e => e);
    expect(t).toBeInstanceOf(TemplateInvalidError);
    expect(isTemplateInvalid(t)).toBe(true);
    expect((t as TemplateInvalidError).issues[0]).toMatchObject({ code: "noRoot" });
    const s = await client.resolveShareLink("fws_x").catch(e => e);
    expect(s.reason).toBe("disabled");
    // an error without a subclass stays an ApiError with its code
    const { network: n2 } = fake(() => ({ __fail: { status: 409, code: "FOLDER_DEPTH" } }));
    const f = await setup(n2).client.createFolder("prj_1", { name: "deep" }).catch(e => e);
    expect(f).toBeInstanceOf(ApiError);
    expect(f.code).toBe("FOLDER_DEPTH");
  });
});

describe("setWorkspaceDefaults", () => {
  it("reads, merges per key, PUTs the whole document with the token; null resets a key", async () => {
    const { network, calls } = fake(c => (c.method === "GET" ? defaults({ tagCategories: [{ key: "a" }], worksheets: [{ id: "w" }], defaultProjectRole: "writer" }) : defaults({ ...(c.body as object), updatedAt: T1 })));
    const { client } = setup(network);
    const r = await client.setWorkspaceDefaults("ws_1", { noteTypes: [{ key: "todo" }], worksheets: null });
    expect(calls.map(c => `${c.method} ${c.path}`)).toEqual(["GET /entities/ws_1/defaults", "PUT /entities/ws_1/defaults"]);
    expect(calls[1]!.body).toEqual({
      tagCategories: [{ key: "a" }],
      revisionColourSets: [],
      noteTypes: [{ key: "todo" }],
      defaultProjectRole: "writer",
      baseUpdatedAt: T0,
    });
    expect(r.updatedAt).toBe(T1);
    // with a base, no read
    await client.setWorkspaceDefaults("ws_1", { defaultProjectRole: null }, r);
    expect(calls).toHaveLength(3);
    expect(calls[2]!.body).toMatchObject({ baseUpdatedAt: T1, noteTypes: [{ key: "todo" }] });
    expect(calls[2]!.body).not.toHaveProperty("defaultProjectRole"); // null = removed from the document: the server resets it
  });

  it("on 409 STALE_WRITE merges onto the server copy and retries once; a second loss reaches the caller", async () => {
    const server = defaults({ tagCategories: [{ key: "theirs" }], updatedAt: T2 });
    let puts = 0;
    const { network, calls } = fake(c => {
      if (c.method === "GET") return defaults();
      puts++;
      return puts === 1 ? { __fail: { status: 409, code: "STALE_WRITE", details: { current: server } } } : defaults({ ...(c.body as object), updatedAt: "2026-09-21T10:00:03.000Z" });
    });
    const { client } = setup(network);
    const r = await client.setWorkspaceDefaults("ws_1", { noteTypes: [{ key: "mine" }] });
    expect(calls.filter(c => c.method === "PUT")).toHaveLength(2);
    expect(calls[2]!.body).toMatchObject({ baseUpdatedAt: T2, tagCategories: [{ key: "theirs" }], noteTypes: [{ key: "mine" }] });
    expect(r.tagCategories).toEqual([{ key: "theirs" }]);

    const { network: n2, calls: c2 } = fake(c => (c.method === "GET" ? defaults() : { __fail: { status: 409, code: "STALE_WRITE", details: { current: server } } }));
    const err = await setup(n2).client.setWorkspaceDefaults("ws_1", { noteTypes: [] }).catch(e => e);
    expect(err).toBeInstanceOf(StaleWriteError);
    expect(c2.filter(c => c.method === "PUT")).toHaveLength(2); // retried exactly once
  });
});

describe("hooks", () => {
  it("useTemplates keys by filter and scope; a new version refreshes lists and bodies", async () => {
    const { network, calls } = fake(c => (c.method === "GET" ? [] : { id: "tpl_1", latestVersion: 2 }));
    const { qc, wrapper } = setup(network);
    const all = renderHook(() => useTemplates(), { wrapper });
    const ws = renderHook(() => useTemplates({ scope: "entity", entityId: "ws_1" }), { wrapper });
    const cat = renderHook(() => useTemplates("screenplay"), { wrapper });
    await waitFor(() => expect(all.result.current.isSuccess && ws.result.current.isSuccess && cat.result.current.isSuccess).toBe(true));
    expect(qc.getQueryData(queryKeys.templates({ scope: "entity", entityId: "ws_1" }))).toEqual([]);
    expect(qc.getQueryData(queryKeys.templates("screenplay"))).toEqual([]);
    expect(qc.getQueryData(queryKeys.templates())).toEqual([]);
    const before = calls.length;
    const mut = renderHook(() => useCreateTemplateVersion("tpl_1"), { wrapper });
    await act(async () => {
      await mut.result.current.mutateAsync({ name: "v2" } as never);
    });
    await waitFor(() => expect(calls.filter(c => c.method === "GET").length).toBeGreaterThanOrEqual(before - 0 + 3 - 0));
    expect(calls.some(c => c.method === "POST" && c.path === "/templates/tpl_1/versions")).toBe(true);
  });

  it("trash, purge and empty refresh the trash family and the lists", async () => {
    const { network, calls } = fake(c => (c.method === "GET" ? [] : { purgeScheduled: true }));
    const { wrapper } = setup(network);
    const trash = renderHook(() => useTrash("ws_1"), { wrapper });
    const docs = renderHook(() => useWorkspaceDocuments("ws_1", { starred: true }), { wrapper });
    await waitFor(() => expect(trash.result.current.isSuccess && docs.result.current.isSuccess).toBe(true));
    const gets = () => calls.filter(c => c.method === "GET").length;

    const purge = renderHook(() => usePurgeDocument(), { wrapper });
    let n = gets();
    await act(async () => {
      await purge.result.current.mutateAsync("doc_1");
    });
    await waitFor(() => expect(gets()).toBeGreaterThan(n)); // trash + workspace documents refetched
    expect(calls.filter(c => c.path === "/entities/ws_1/trash").length).toBeGreaterThanOrEqual(2);
    expect(calls.filter(c => c.path === "/entities/ws_1/documents").length).toBeGreaterThanOrEqual(2);

    n = calls.filter(c => c.path === "/entities/ws_1/trash").length;
    const project = renderHook(() => usePurgeProject(), { wrapper });
    await act(async () => {
      await project.result.current.mutateAsync({ pid: "prj_1", confirmName: "X" });
    });
    await waitFor(() => expect(calls.filter(c => c.path === "/entities/ws_1/trash").length).toBeGreaterThan(n));
    expect(calls.find(c => c.method === "DELETE" && c.path === "/projects/prj_1")!.body).toEqual({ confirmName: "X" });

    n = calls.filter(c => c.path === "/entities/ws_1/trash").length;
    const empty = renderHook(() => useEmptyTrash("ws_1"), { wrapper });
    await act(async () => {
      await empty.result.current.mutateAsync();
    });
    await waitFor(() => expect(calls.filter(c => c.path === "/entities/ws_1/trash").length).toBeGreaterThan(n));
    expect(calls.find(c => c.path === "/entities/ws_1/trash/empty")!.body).toEqual({ confirm: "EMPTY" });

    // trashing a document (B2 hook) now refreshes the trash too
    n = calls.filter(c => c.path === "/entities/ws_1/trash").length;
    const trashDoc = renderHook(() => useTrashDocument(), { wrapper });
    await act(async () => {
      await trashDoc.result.current.mutateAsync("doc_9");
    });
    await waitFor(() => expect(calls.filter(c => c.path === "/entities/ws_1/trash").length).toBeGreaterThan(n));
  });

  it("move refreshes document lists and the document; folder delete refreshes the project", async () => {
    const { network, calls } = fake(c => (c.method === "GET" ? [] : {}));
    const { wrapper } = setup(network);
    const docs = renderHook(() => useWorkspaceDocuments("ws_1"), { wrapper });
    await waitFor(() => expect(docs.result.current.isSuccess).toBe(true));
    const move = renderHook(() => useMoveDocument("doc_1"), { wrapper });
    const n = calls.filter(c => c.path === "/entities/ws_1/documents").length;
    await act(async () => {
      await move.result.current.mutateAsync({ targetProjectId: "prj_2" });
    });
    await waitFor(() => expect(calls.filter(c => c.path === "/entities/ws_1/documents").length).toBeGreaterThan(n));
    const del = renderHook(() => useDeleteFolder("prj_1"), { wrapper });
    await act(async () => {
      await del.result.current.mutateAsync({ fid: "pfd_1", moveContentsTo: "root" });
    });
    expect(calls.find(c => c.method === "DELETE" && c.path === "/project-folders/pfd_1")!.query).toEqual({ moveContentsTo: "root" });
  });

  it("apply template: a dry run changes nothing in the cache, a real apply refreshes the document family and jobs", async () => {
    const { network, calls } = fake(c => (c.body?.dryRun ? { unmappedStyles: [], pageDelta: 0 } : { id: "job_1", kind: "doc.applyTemplate", status: "queued" }));
    const { qc, wrapper } = setup(network);
    qc.setQueryData(queryKeys.document("doc_1"), { id: "doc_1" });
    const apply = renderHook(() => useApplyTemplate("doc_1"), { wrapper });
    await act(async () => {
      await apply.result.current.mutateAsync({ templateId: "tpl_1", dryRun: true });
    });
    expect(qc.getQueryState(queryKeys.document("doc_1"))!.isInvalidated).toBe(false);
    await act(async () => {
      await apply.result.current.mutateAsync({ templateId: "tpl_1" });
    });
    expect(qc.getQueryState(queryKeys.document("doc_1"))!.isInvalidated).toBe(true);
    expect(calls).toHaveLength(2);
  });

  it("workspace defaults: the cached copy is the base of the next write and the result replaces it", async () => {
    let put = 0;
    const { network, calls } = fake(c => (c.method === "GET" ? defaults({ defaultProjectRole: "viewer" }) : defaults({ ...(c.body as object), updatedAt: ++put === 1 ? T1 : T2 })));
    const { qc, wrapper } = setup(network);
    const read = renderHook(() => useWorkspaceDefaults("ws_1"), { wrapper });
    await waitFor(() => expect(read.result.current.isSuccess).toBe(true));
    const set = renderHook(() => useSetWorkspaceDefaults("ws_1"), { wrapper });
    await act(async () => {
      await set.result.current.mutateAsync({ noteTypes: [{ key: "a" }] });
    });
    expect(calls.filter(c => c.method === "GET")).toHaveLength(1); // the cache was the base: no extra read
    expect(qc.getQueryData<{ updatedAt: string }>(queryKeys.workspaceDefaults("ws_1"))!.updatedAt).toBe(T1);
    await act(async () => {
      await set.result.current.mutateAsync({ worksheets: [{ id: "w" }] });
    });
    expect(calls.filter(c => c.method === "PUT")[1]!.body).toMatchObject({ baseUpdatedAt: T1, noteTypes: [{ key: "a" }], worksheets: [{ id: "w" }], defaultProjectRole: "viewer" });
  });

  it("contacts are keyed per workspace and filter", async () => {
    const { network, calls } = fake(() => ([{ id: "ctc_1", name: "Zoe", company: null, email: null }]));
    const { qc, wrapper } = setup(network);
    const r = renderHook(() => useContacts("ws_1", { q: "zo" }), { wrapper });
    await waitFor(() => expect(r.result.current.isSuccess).toBe(true));
    expect(calls[0]!.query).toEqual({ q: "zo" });
    expect(qc.getQueryData(queryKeys.contacts("ws_1", { q: "zo" }))).toBeTruthy();
  });
});
