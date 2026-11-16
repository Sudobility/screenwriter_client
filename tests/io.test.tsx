// @vitest-environment happy-dom
/**
 * B16 client: the seven job-based import/export/watermark methods, the upload helpers, typed errors and the useImportJob /
 * useExportJob hooks, all against a fake NetworkClient. The real API is in io-integration.test.ts.
 */
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import {
  API_ROUTE_METHODS,
  ApiError,
  FormatUnsupportedError,
  OcrUnavailableError,
  ScreenwriterClient,
  ScreenwriterClientProvider,
  UploadIncompleteError,
  WatermarkNotFoundError,
  bytesToBase64,
  readRequestBody,
  sha256Hex,
  useExportJob,
  useImportJob,
  useWatermarkLookup,
  type NetworkClient,
  type NetworkRequest,
  type NetworkResponse,
} from "../src";
import type { Job } from "@sudobility/screenwriter_types";

const enc = (v: unknown) => new TextEncoder().encode(JSON.stringify(v));
const ok = (data: unknown, status = 200): NetworkResponse => ({ status, headers: {}, body: enc({ success: true, data }) });
const fail = (status: number, code: string, details?: object): NetworkResponse => ({ status, headers: {}, body: enc({ success: false, error: code, code, ...(details ? { details } : {}) }) });
const job = (over: Partial<Job> = {}): Job => ({
  id: "job_1",
  kind: "import.fountain",
  subkind: null,
  status: "queued",
  progress: { fraction: 0, stage: null, message: null },
  documentId: null,
  requestSummary: {},
  sources: [],
  cancelRequested: false,
  attempt: 0,
  createdAt: "2026-01-01T00:00:00Z",
  startedAt: null,
  finishedAt: null,
  ...over,
});
const text = (s: string) => new TextEncoder().encode(s);

interface Sent {
  method: string;
  path: string;
  body: unknown;
  req: NetworkRequest;
}
function setup(handler: (s: Sent) => NetworkResponse) {
  const sent: Sent[] = [];
  const network: NetworkClient = {
    async request(req) {
      const raw = await readRequestBody(req);
      const isJson = req.headers?.["Content-Type"] === "application/json";
      const s: Sent = { method: req.method, path: new URL(req.url).pathname.replace("/api/v1", "") + new URL(req.url).search, body: isJson && raw ? JSON.parse(raw) : req.body, req };
      sent.push(s);
      return handler(s);
    },
  };
  let n = 0;
  const client = new ScreenwriterClient({ network, baseUrl: "http://x", getToken: async () => "tok", retry: false, newIdempotencyKey: () => `key-${++n}` });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children?: ReactNode }) => createElement(QueryClientProvider, { client: qc }, createElement(ScreenwriterClientProvider, { client, children }));
  return { client, sent, qc, wrapper };
}

describe("B16 routes and methods", () => {
  it("every new route has its method; the synchronous ones are still served", () => {
    expect(API_ROUTE_METHODS.uploadState).toBe("uploadState");
    expect(API_ROUTE_METHODS.importCreate).toBe("createImportJob");
    expect(API_ROUTE_METHODS.importStart).toBe("startImport");
    expect(API_ROUTE_METHODS.documentImportOver).toBe("importOver");
    expect(API_ROUTE_METHODS.documentExportCreate).toBe("createExportJob");
    expect(API_ROUTE_METHODS.documentExportCombined).toBe("exportCombined");
    expect(API_ROUTE_METHODS.watermarkLookup).toBe("lookupWatermark");
    expect(API_ROUTE_METHODS.documentImport).toBe("importDocument");
    expect(API_ROUTE_METHODS.documentExport).toBe("exportDocument");
    expect(API_ROUTE_METHODS.formatsList).toBe("getFormats");
  });

  it("each method sends its request with an Idempotency-Key and returns the unwrapped data", async () => {
    const { client, sent } = setup(s => {
      if (s.path === "/uploads/state") return ok({ uploadKey: "upl_1", url: "http://x/u", expiresAt: "2026-01-01T00:00:00Z" }, 201);
      if (s.path === "/imports" || s.path.endsWith("/import-over")) return ok({ importId: "upl_2", upload: { url: "http://x/p", expiresAt: "2026-01-01T00:00:00Z" } }, 201);
      if (s.path.endsWith("/watermark-lookup")) return ok({ matches: [] });
      return ok(job(), 202);
    });
    const sha = "a".repeat(64);
    expect((await client.uploadState({ sizeBytes: 3, sha256Hex: sha })).uploadKey).toBe("upl_1");
    expect((await client.createImportJob({ targetProjectId: "prj_1", filename: "a.fdx", sizeBytes: 3, sha256Hex: sha })).importId).toBe("upl_2");
    expect((await client.importOver("doc_1", { filename: "a.fdx", sizeBytes: 3, sha256Hex: sha })).importId).toBe("upl_2");
    expect((await client.startImport("upl 2")).id).toBe("job_1");
    expect((await client.createExportJob("doc_1", { format: "fountain", options: { batchWatermark: { recipients: [{ name: "A" }] } } })).id).toBe("job_1");
    expect((await client.exportCombined({ documentIds: ["doc_1", "doc_2"], format: "fdx" })).id).toBe("job_1");
    expect((await client.lookupWatermark("ws_1", { exportId: "X" })).matches).toEqual([]);
    expect(sent.map(s => `${s.method} ${s.path}`)).toEqual([
      "POST /uploads/state",
      "POST /imports",
      "POST /documents/doc_1/import-over",
      "POST /imports/upl%202/start",
      "POST /documents/doc_1/exports",
      "POST /documents/export-combined",
      "POST /entities/ws_1/watermark-lookup",
    ]);
    expect(sent.every(s => s.req.headers?.["Idempotency-Key"])).toBe(true);
    expect(sent[4]!.body).toMatchObject({ format: "fountain", options: { batchWatermark: { recipients: [{ name: "A" }] } } });
  });

  it("importFile: declare (with size and sha256), PUT the bytes without credentials, then start", async () => {
    const bytes = text("INT. ROOM - DAY\n\nHello.\n");
    const { client, sent } = setup(s => {
      if (s.path === "/imports") return ok({ importId: "upl_9", upload: { url: "http://x/api/v1/storage-fixture/tok", expiresAt: "z" } }, 201);
      if (s.method === "PUT") return { status: 200, headers: {}, body: new Uint8Array() };
      return ok(job({ id: "job_9" }), 202);
    });
    const j = await client.importFile({ projectId: "prj_1" }, { filename: "a.fountain", bytes, options: { ocr: "off" } });
    expect(j.id).toBe("job_9");
    expect(sent.map(s => `${s.method} ${s.path}`)).toEqual(["POST /imports", "PUT /storage-fixture/tok", "POST /imports/upl_9/start"]);
    expect(sent[0]!.body).toEqual({ targetProjectId: "prj_1", filename: "a.fountain", sizeBytes: bytes.byteLength, sha256Hex: await sha256Hex(bytes), options: { ocr: "off" } });
    expect(sent[1]!.req.headers?.Authorization).toBeUndefined(); // presigned: no bearer
    expect(sent[1]!.req.headers?.["Idempotency-Key"]).toBeUndefined();
    expect(sent[1]!.body).toEqual(bytes);
    // a document target goes through import-over
    const over = setup(s => (s.path.endsWith("/import-over") ? ok({ importId: "upl_1", upload: { url: "http://x/p", expiresAt: "z" } }, 201) : s.method === "PUT" ? { status: 200, headers: {}, body: new Uint8Array() } : ok(job({ kind: "doc.importOver" }), 202)));
    expect((await over.client.importFile({ documentId: "doc_7" }, { filename: "a.fdx", bytes })).kind).toBe("doc.importOver");
    expect(over.sent[0]!.path).toBe("/documents/doc_7/import-over");
    expect(over.sent[0]!.body).not.toHaveProperty("targetProjectId");
  });

  it("uploadStateBytes hashes, requests, PUTs and returns the key; a refused PUT is an ApiError", async () => {
    const bytes = text("state");
    const { client, sent } = setup(s => {
      if (s.path === "/uploads/state") return ok({ uploadKey: "upl_5", url: "http://x/u", expiresAt: "z" }, 201);
      return { status: 200, headers: {}, body: new Uint8Array() };
    });
    expect(await client.uploadStateBytes(bytes, "watermark_lookup")).toBe("upl_5");
    expect(sent[0]!.body).toEqual({ sizeBytes: 5, sha256Hex: await sha256Hex(bytes), purpose: "watermark_lookup" });
    const gone = setup(s => (s.method === "PUT" ? fail(410, "UPLOAD_EXPIRED") : ok({})));
    await expect(gone.client.putUpload("http://x/u", bytes)).rejects.toMatchObject({ code: "UPLOAD_EXPIRED", status: 410 });
    expect(await sha256Hex(text("abc"))).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  it("fetchJobOutput decodes data: URLs and fetches presigned ones without credentials", async () => {
    const { client, sent } = setup(() => ({ status: 200, headers: {}, body: text("from storage") }));
    expect(new TextDecoder().decode(await client.fetchJobOutput({ url: `data:text/plain;base64,${bytesToBase64(text("inline!"))}` }))).toBe("inline!");
    expect(new TextDecoder().decode(await client.fetchJobOutput({ url: "data:text/plain,a%20b" }))).toBe("a b");
    expect(new TextDecoder().decode(await client.fetchJobOutput({ url: "http://x/api/v1/storage-fixture/t" }))).toBe("from storage");
    expect(sent).toHaveLength(1);
    expect(sent[0]!.req.headers).toBeUndefined();
  });

  it("importTemplate takes {importId} as well as the inline file", async () => {
    const { client, sent } = setup(() => ok({ id: "tpl_1" }, 201));
    await client.importTemplate({ importId: "upl_3" });
    await client.importTemplate({ scope: "user", filename: "t.fwtemplate.json", bytes: text("{}") });
    expect(sent[0]!.body).toEqual({ importId: "upl_3" });
    expect(sent[1]!.body).toMatchObject({ scope: "user", filename: "t.fwtemplate.json", contentB64: bytesToBase64(text("{}")) });
  });
});

describe("B16 typed errors", () => {
  it("maps the new codes to subclasses", async () => {
    const script: Record<string, NetworkResponse> = {
      "/imports": fail(415, "IMPORT_FORMAT_UNSUPPORTED", { format: "pdf", supported: ["fountain", "fdx", "fadein"], reason: "pdfImportNotBuilt" }),
      "/documents/d/exports": fail(415, "EXPORT_FORMAT_UNSUPPORTED", { format: "pdf", supported: ["fountain", "fdx", "json"] }),
      "/imports/i/start": fail(409, "UPLOAD_INCOMPLETE", { reason: "size" }),
      "/uploads/state": fail(503, "OCR_UNAVAILABLE"),
      "/entities/w/watermark-lookup": fail(404, "WATERMARK_NOT_FOUND", { reason: "pdfNotSupported" }),
    };
    const { client } = setup(s => script[s.path] ?? ok({}));
    const sha = "a".repeat(64);
    const imp = await client.createImportJob({ targetProjectId: "p", filename: "a.pdf", sizeBytes: 1, sha256Hex: sha }).catch(e => e);
    expect(imp).toBeInstanceOf(FormatUnsupportedError);
    expect(imp).toMatchObject({ direction: "import", format: "pdf", supported: ["fountain", "fdx", "fadein"], reason: "pdfImportNotBuilt", status: 415 });
    const exp = await client.createExportJob("d", { format: "pdf" }).catch(e => e);
    expect(exp).toBeInstanceOf(FormatUnsupportedError);
    expect(exp.direction).toBe("export");
    expect(exp).toBeInstanceOf(ApiError);
    expect(await client.startImport("i").catch(e => e)).toMatchObject({ reason: "size" });
    expect(await client.startImport("i").catch(e => e)).toBeInstanceOf(UploadIncompleteError);
    expect(await client.uploadState({ sizeBytes: 1, sha256Hex: sha }).catch(e => e)).toBeInstanceOf(OcrUnavailableError);
    const wm = await client.lookupWatermark("w", { exportId: "X" }).catch(e => e);
    expect(wm).toBeInstanceOf(WatermarkNotFoundError);
    expect(wm.reason).toBe("pdfNotSupported");
  });
});

describe("B16 hooks", () => {
  it("useImportJob: start uploads and creates the job, polls it, then reads the outputs and refreshes document lists", async () => {
    let reads = 0;
    const { wrapper, sent, qc } = setup(s => {
      if (s.path === "/imports") return ok({ importId: "upl_1", upload: { url: "http://x/api/v1/storage-fixture/t", expiresAt: "z" } }, 201);
      if (s.method === "PUT") return { status: 200, headers: {}, body: new Uint8Array() };
      if (s.path === "/imports/upl_1/start") return ok(job({ id: "job_5", status: "queued" }), 202);
      if (s.path === "/jobs/job_5") return ok(job({ id: "job_5", status: ++reads < 2 ? "running" : "succeeded" }));
      if (s.path === "/jobs/job_5/outputs") return ok({ outputs: [{ name: "conversion-report.json", mimeType: "application/json", sizeBytes: 2, url: "data:application/json;base64,e30=", expiresAt: null, documentId: "doc_new" }] });
      return ok([]);
    });
    qc.setQueryData(["screenwriter", "document-lists", "prj_1", {}], { success: true, data: [], timestamp: "2026-01-01T00:00:00.000Z", pagination: { hasNextPage: false, nextCursor: null, pageSize: 0 } });
    const { result } = renderHook(() => useImportJob({ projectId: "prj_1" }), { wrapper });
    await act(async () => void (await result.current.start({ filename: "a.fountain", bytes: text("x") })));
    expect(result.current.jobId).toBe("job_5");
    await waitFor(() => expect(result.current.job?.status).toBe("succeeded"), { timeout: 6000 });
    await waitFor(() => expect(result.current.outputs?.outputs[0]?.documentId).toBe("doc_new"));
    expect(qc.getQueryState(["screenwriter", "document-lists", "prj_1", {}])?.isInvalidated).toBe(true);
    expect(sent.some(s => s.path === "/jobs/job_5/outputs")).toBe(true);
    act(() => result.current.reset());
    expect(result.current.jobId).toBeNull();
  }, 15000);

  it("useImportJob surfaces a refused start as the typed error", async () => {
    const { wrapper } = setup(s => (s.path === "/imports" ? fail(503, "OCR_UNAVAILABLE") : ok({})));
    const { result } = renderHook(() => useImportJob({ projectId: "prj_1" }), { wrapper });
    await act(async () => {
      await result.current.start({ filename: "a.pdf", bytes: text("x"), options: { ocr: "force" } }).catch(() => undefined);
    });
    await waitFor(() => expect(result.current.starting.error).toBeInstanceOf(OcrUnavailableError));
    expect(result.current.jobId).toBeNull();
  });

  it("useExportJob follows the job and offers the outputs; useWatermarkLookup mutates", async () => {
    const { wrapper } = setup(s => {
      if (s.path === "/documents/doc_1/exports") return ok(job({ id: "job_7", kind: "export.fountain", status: "succeeded" }), 202);
      if (s.path === "/jobs/job_7") return ok(job({ id: "job_7", kind: "export.fountain", status: "succeeded" }));
      if (s.path === "/jobs/job_7/outputs") return ok({ outputs: [{ name: "a.fountain", mimeType: "text/plain", sizeBytes: 1, url: "data:text/plain,x", expiresAt: null }] });
      if (s.path === "/entities/ws_1/watermark-lookup") return ok({ matches: [{ exportId: "E" }] });
      return ok({});
    });
    const ex = renderHook(() => useExportJob("doc_1"), { wrapper });
    await act(async () => void (await ex.result.current.start({ format: "fountain" })));
    await waitFor(() => expect(ex.result.current.outputs?.outputs[0]?.name).toBe("a.fountain"));
    expect(ex.result.current.job?.kind).toBe("export.fountain");
    const lk = renderHook(() => useWatermarkLookup("ws_1"), { wrapper });
    const r = await act(async () => lk.result.current.mutateAsync({ exportId: "E" }));
    expect((r as unknown as { matches: unknown[] }).matches).toHaveLength(1);
  });
});
