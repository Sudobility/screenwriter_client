// @vitest-environment happy-dom
/**
 * B11 client: the 17 asset/R2 methods, the `uploadAsset` multipart helper (parallel parts, retry, resume, dedup), typed
 * errors and the hooks, all against a fake NetworkClient. There is no assets-integration.test.ts in this slice (the API
 * side, including the real R2 signature algorithm, is proven in screenwriter_api's own tests).
 */
import { createElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import {
  API_ROUTE_METHODS,
  ApiError,
  AssetInUseError,
  AssetNotReadyError,
  AssetTypeRejectedError,
  AssetUploadInterruptedError,
  RoleNotAllowedForTargetError,
  ScreenwriterClient,
  ScreenwriterClientProvider,
  StorageQuotaExceededError,
  readRequestBody,
  useAsset,
  useAssetLinks,
  useAssets,
  useCreateAssetLink,
  useDeleteAsset,
  useStaleness,
  useUploadAsset,
  type NetworkClient,
  type NetworkRequest,
  type NetworkResponse,
} from "../src";

const enc = (v: unknown) => new TextEncoder().encode(JSON.stringify(v));
const ok = (data: unknown, status = 200): NetworkResponse => ({ status, headers: {}, body: enc({ success: true, data }) });
const fail = (status: number, code: string, details?: object): NetworkResponse => ({ status, headers: {}, body: enc({ success: false, error: code, code, ...(details ? { details } : {}) }) });

interface Sent {
  method: string;
  path: string;
  body: unknown;
  req: NetworkRequest;
}
function setup(handler: (s: Sent) => NetworkResponse | Promise<NetworkResponse>) {
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

const assetSummary = (over: object = {}) => ({
  id: "asset_1", entityId: "ws_1", kind: "image", title: "a.png", description: "", currentVersionId: "asv_1", versionCount: 1,
  mime: "image/png", sizeBytes: 30, status: "ready", origin: "upload", rights: { ownership: "unknown", aiTrainingAllowed: false },
  hasThumbnail: false, createdBy: "u1", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", deletedAt: null, ...over,
});

describe("B11 routes and methods", () => {
  it("every asset route has its own method", () => {
    expect(API_ROUTE_METHODS.assetUploadCreate).toBe("initAssetUpload");
    expect(API_ROUTE_METHODS.assetUploadGet).toBe("getAssetUpload");
    expect(API_ROUTE_METHODS.assetUploadParts).toBe("signAssetUploadParts");
    expect(API_ROUTE_METHODS.assetUploadComplete).toBe("completeAssetUpload");
    expect(API_ROUTE_METHODS.assetUploadAbort).toBe("abortAssetUpload");
    expect(API_ROUTE_METHODS.assetsList).toBe("listAssets");
    expect(API_ROUTE_METHODS.assetGet).toBe("getAsset");
    expect(API_ROUTE_METHODS.assetUrl).toBe("getAssetUrl");
    expect(API_ROUTE_METHODS.assetUpdate).toBe("updateAsset");
    expect(API_ROUTE_METHODS.assetDelete).toBe("deleteAsset");
    expect(API_ROUTE_METHODS.assetRestore).toBe("restoreAsset");
    expect(API_ROUTE_METHODS.assetLinkCreate).toBe("createAssetLink");
    expect(API_ROUTE_METHODS.documentAssetLinks).toBe("listDocumentAssetLinks");
    expect(API_ROUTE_METHODS.assetLinkUpdate).toBe("updateAssetLink");
    expect(API_ROUTE_METHODS.assetLinkDelete).toBe("unlinkAsset");
    expect(API_ROUTE_METHODS.documentStaleness).toBe("getDocumentStaleness");
    expect(API_ROUTE_METHODS.assetLinkStaleness).toBe("getAssetLinkStaleness");
  });

  it("each method sends its request with an Idempotency-Key (writes) and returns unwrapped data", async () => {
    const { client, sent } = setup(s => {
      if (s.path === "/entities/ws_1/assets/uploads") return ok({ uploadId: "upl_1", assetId: "asset_1", versionId: "asv_1", partSizeBytes: 8_000_000, partCount: 0, parts: [], expiresAt: "z", deduplicated: false }, 201);
      if (s.path === "/assets/uploads/upl_1") return ok({ uploadId: "upl_1", assetId: "asset_1", versionId: "asv_1", partSizeBytes: 8_000_000, partCount: 1, completedParts: [], expiresAt: "z", completedAt: null });
      if (s.path === "/assets/uploads/upl_1/parts") return ok({ parts: [{ partNumber: 1, url: "http://x/p1", expiresAt: "z" }] });
      if (s.path === "/assets/uploads/upl_1/complete") return ok(assetSummary());
      if (s.path === "/assets/uploads/upl_1") return ok({ aborted: true });
      if (s.path.startsWith("/assets?")) return ok([assetSummary()]);
      if (s.path === "/assets/asset_1") return ok({ ...assetSummary(), versions: [], links: [] });
      if (s.path === "/assets/asset_1/versions/asv_1/url") return ok({ url: "http://x/dl", expiresAt: "z" });
      if (s.path === "/documents/doc_1/asset-links") return ok([]);
      if (s.path === "/documents/doc_1/staleness") return ok([{ targetKind: "scene", targetId: "el_1", fresh: 1, stale: 0, deleted: 0 }]);
      if (s.path === "/asset-links/al_1/staleness") return ok({ staleness: "fresh" });
      if (s.path.startsWith("/asset-links")) return ok({ id: "al_1", entityId: "ws_1", assetId: "asset_1", pinnedVersionId: null, documentId: "doc_1", targetKind: "entity", targetId: "ent_1", role: "headshot", sortOrder: 0, sourceHash: null, sourceSnapshotId: null, originalTargetId: null, note: "", createdBy: "u1", createdAt: "z", deletedAt: null }, 201);
      return fail(404, "NOT_FOUND");
    });
    expect((await client.initAssetUpload("ws_1", { filename: "a.png", mimeType: "image/png", sizeBytes: 3, kind: "image" })).uploadId).toBe("upl_1");
    expect((await client.getAssetUpload("upl_1")).partCount).toBe(1);
    expect((await client.signAssetUploadParts("upl_1", [1])).parts).toHaveLength(1);
    expect((await client.completeAssetUpload("upl_1", { parts: [] })).id).toBe("asset_1");
    expect((await client.listAssets({ entityId: "ws_1" })).data!).toHaveLength(1);
    expect((await client.getAsset("asset_1")).id).toBe("asset_1");
    expect((await client.getAssetUrl("asset_1", "asv_1")).url).toBe("http://x/dl");
    expect((await client.updateAsset("asset_1", { title: "New" })).id).toBe("asset_1");
    const link = await client.createAssetLink({ assetId: "asset_1", documentId: "doc_1", target: { kind: "entity", id: "ent_1" }, role: "headshot" });
    expect(link.id).toBe("al_1");
    expect(await client.listDocumentAssetLinks("doc_1")).toEqual([]);
    expect((await client.updateAssetLink("al_1", { note: "x" })).id).toBe("al_1");
    expect((await client.getDocumentStaleness("doc_1"))[0]).toMatchObject({ targetId: "el_1", fresh: 1 });
    expect((await client.getAssetLinkStaleness("al_1")).staleness).toBe("fresh");
    const posts = sent.filter(s => s.method === "POST");
    expect(posts.every(s => s.req.headers?.["Idempotency-Key"])).toBe(true);
  });

  it("abortAssetUpload, deleteAsset, restoreAsset, unlinkAsset", async () => {
    const { client, sent } = setup(s => {
      if (s.method === "DELETE" && s.path === "/assets/uploads/upl_9") return ok({ aborted: true });
      if (s.method === "DELETE" && s.path === "/assets/asset_1") return ok({ deletedAt: "z" });
      if (s.path === "/assets/asset_1/restore") return ok(assetSummary({ deletedAt: null }));
      if (s.method === "DELETE" && s.path === "/asset-links/al_1") return ok({ deletedAt: "z" });
      return fail(404, "NOT_FOUND");
    });
    expect((await client.abortAssetUpload("upl_9")).aborted).toBe(true);
    expect((await client.deleteAsset("asset_1")).deletedAt).toBe("z");
    expect((await client.restoreAsset("asset_1")).deletedAt).toBeNull();
    expect((await client.unlinkAsset("al_1")).deletedAt).toBe("z");
    expect(sent.map(s => `${s.method} ${s.path}`)).toEqual(["DELETE /assets/uploads/upl_9", "DELETE /assets/asset_1", "POST /assets/asset_1/restore", "DELETE /asset-links/al_1"]);
  });
});

describe("B11 typed errors", () => {
  it("maps the new codes to subclasses", async () => {
    const script: Record<string, NetworkResponse> = {
      "/assets/uploads/x/complete": fail(415, "ASSET_TYPE_REJECTED", { reason: "magic" }),
      "/assets/y/versions/v/url": fail(409, "ASSET_NOT_READY", { reason: "noDerivative" }),
      "/assets/z": fail(409, "ASSET_IN_USE"),
      "/entities/w/assets/uploads": fail(507, "STORAGE_QUOTA_EXCEEDED", { quotaBytes: 10, usedBytes: 9, requestedBytes: 5 }),
      "/asset-links": fail(422, "ROLE_NOT_ALLOWED_FOR_TARGET", { role: "headshot", allowed: ["entity"] }),
    };
    const { client } = setup(s => script[s.path] ?? ok({}));
    const rejected = await client.completeAssetUpload("x", { parts: [] }).catch(e => e);
    expect(rejected).toBeInstanceOf(AssetTypeRejectedError);
    expect(rejected).toMatchObject({ reason: "magic", status: 415 });
    const notReady = await client.getAssetUrl("y", "v").catch(e => e);
    expect(notReady).toBeInstanceOf(AssetNotReadyError);
    expect(notReady.reason).toBe("noDerivative");
    const inUse = await client.deleteAsset("z").catch(e => e);
    expect(inUse).toBeInstanceOf(AssetInUseError);
    expect(inUse).toBeInstanceOf(ApiError);
    const quota = await client.initAssetUpload("w", { filename: "a.png", mimeType: "image/png", sizeBytes: 5, kind: "image" }).catch(e => e);
    expect(quota).toBeInstanceOf(StorageQuotaExceededError);
    expect(quota).toMatchObject({ quotaBytes: 10, usedBytes: 9, requestedBytes: 5 });
    const role = await client.createAssetLink({ assetId: "a", target: { kind: "scene", id: "s" }, role: "headshot" }).catch(e => e);
    expect(role).toBeInstanceOf(RoleNotAllowedForTargetError);
    expect(role.allowed).toEqual(["entity"]);
  });
});

describe("B11 uploadAsset (the multipart helper)", () => {
  it("single-part: hashes small files up front, PUTs the one part, completes", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const { client, sent } = setup(s => {
      if (s.path === "/entities/ws_1/assets/uploads") return ok({ uploadId: "upl_1", assetId: "asset_1", versionId: "asv_1", partSizeBytes: 8_000_000, partCount: 1, parts: [{ partNumber: 1, url: "http://x/p1", expiresAt: "z" }], expiresAt: "z", deduplicated: false }, 201);
      if (s.method === "PUT") return { status: 200, headers: { etag: '"e1"' }, body: new Uint8Array() };
      if (s.path === "/assets/uploads/upl_1/complete") return ok(assetSummary());
      return fail(404, "NOT_FOUND");
    });
    const progress: number[] = [];
    const asset = await client.uploadAsset("ws_1", new Blob([bytes], { type: "image/png" }), { kind: "image", onProgress: f => progress.push(f) });
    expect(asset.id).toBe("asset_1");
    expect(sent.map(s => `${s.method} ${s.path}`)).toEqual(["POST /entities/ws_1/assets/uploads", "PUT /p1", "POST /assets/uploads/upl_1/complete"]);
    expect(sent[0]!.body).toMatchObject({ filename: "upload", mimeType: "image/png", sizeBytes: 5, kind: "image" });
    expect((sent[0]!.body as { sha256Hex: string }).sha256Hex).toMatch(/^[0-9a-f]{64}$/); // small file: hashed up front
    expect(sent[2]!.body).toMatchObject({ parts: [{ partNumber: 1, etag: "e1" }] });
    expect(progress[0]).toBe(0);
    expect(progress.at(-1)).toBe(1);
  });

  it("multipart: several parts run with the configured concurrency and each carries the right byte range", async () => {
    const bytes = new Uint8Array(25).map((_, i) => i); // 25 bytes, part size 10 -> parts of 10,10,5
    const puts: { url: string; body: Uint8Array }[] = [];
    const { client, sent } = setup(s => {
      if (s.path === "/entities/ws_1/assets/uploads") {
        return ok({
          uploadId: "upl_1", assetId: "asset_1", versionId: "asv_1", partSizeBytes: 10, partCount: 3,
          parts: [1, 2, 3].map(n => ({ partNumber: n, url: `http://x/p${n}`, expiresAt: "z" })),
          expiresAt: "z", deduplicated: false,
        }, 201);
      }
      if (s.method === "PUT") {
        puts.push({ url: s.path, body: s.body as Uint8Array });
        return { status: 200, headers: { etag: `"e${s.path.slice(-1)}"` }, body: new Uint8Array() };
      }
      if (s.path === "/assets/uploads/upl_1/complete") return ok(assetSummary());
      return fail(404, "NOT_FOUND");
    });
    const asset = await client.uploadAsset("ws_1", new Blob([bytes]), { kind: "data", concurrency: 2 });
    expect(asset.id).toBe("asset_1");
    expect(puts).toHaveLength(3);
    const byPart = new Map(puts.map(p => [p.url, p.body]));
    expect(byPart.get("/p1")).toEqual(bytes.slice(0, 10));
    expect(byPart.get("/p2")).toEqual(bytes.slice(10, 20));
    expect(byPart.get("/p3")).toEqual(bytes.slice(20, 25));
    const complete = sent.find(s => s.path === "/assets/uploads/upl_1/complete")!;
    expect((complete.body as { parts: { partNumber: number; etag: string }[] }).parts.map(p => p.partNumber).sort()).toEqual([1, 2, 3]);
  });

  it("a part that never recovers throws AssetUploadInterruptedError with the uploadId to resume", async () => {
    const bytes = new Uint8Array(10);
    const { client } = setup(s => {
      if (s.path === "/entities/ws_1/assets/uploads") {
        return ok({ uploadId: "upl_bad", assetId: "asset_1", versionId: "asv_1", partSizeBytes: 10, partCount: 1, parts: [{ partNumber: 1, url: "http://x/p1", expiresAt: "z" }], expiresAt: "z", deduplicated: false }, 201);
      }
      if (s.method === "PUT") return fail(500, "INTERNAL");
      return fail(404, "NOT_FOUND");
    });
    const err = await client.uploadAsset("ws_1", new Blob([bytes]), { kind: "data", partRetries: 1 }).catch(e => e);
    expect(err).toBeInstanceOf(AssetUploadInterruptedError);
    expect(err.uploadId).toBe("upl_bad");
  });

  it("resumeUploadId: only the missing parts are re-signed and sent (F-TAG acceptance: interrupted after part 2 resumes and completes)", async () => {
    const part1 = new Uint8Array(10).fill(1);
    const part2 = new Uint8Array(10).fill(2);
    const part3 = new Uint8Array(5).fill(3);
    const bytes = new Uint8Array([...part1, ...part2, ...part3]);
    const puts: string[] = [];
    const { client, sent } = setup(s => {
      if (s.path === "/assets/uploads/upl_r") {
        return ok({ uploadId: "upl_r", assetId: "asset_1", versionId: "asv_1", partSizeBytes: 10, partCount: 3, completedParts: [{ partNumber: 1, etag: "e1", sizeBytes: 10 }, { partNumber: 2, etag: "e2", sizeBytes: 10 }], expiresAt: "z", completedAt: null });
      }
      if (s.path === "/assets/uploads/upl_r/parts") {
        expect((s.body as { partNumbers: number[] }).partNumbers).toEqual([3]);
        return ok({ parts: [{ partNumber: 3, url: "http://x/p3", expiresAt: "z" }] });
      }
      if (s.method === "PUT") {
        puts.push(s.path);
        return { status: 200, headers: { etag: '"e3"' }, body: new Uint8Array() };
      }
      if (s.path === "/assets/uploads/upl_r/complete") return ok(assetSummary());
      return fail(404, "NOT_FOUND");
    });
    const progress: number[] = [];
    const asset = await client.uploadAsset("ws_1", new Blob([bytes]), { kind: "data", resumeUploadId: "upl_r", onProgress: f => progress.push(f) });
    expect(asset.id).toBe("asset_1");
    expect(puts).toEqual(["/p3"]); // only the missing part was uploaded
    expect(sent.some(s => s.path === "/entities/ws_1/assets/uploads")).toBe(false); // no fresh init on resume
    const complete = sent.find(s => s.path === "/assets/uploads/upl_r/complete")!;
    expect((complete.body as { parts: { partNumber: number }[] }).parts.map(p => p.partNumber).sort()).toEqual([1, 2, 3]);
    expect(progress[0]).toBe(0);
    // progress should reflect the 20 already-resumed bytes plus the 5 just sent, out of 25 total
    expect(progress.some(p => p > 0.79 && p < 1)).toBe(true);
  });

  it("a deduplicated init sends no parts and completes immediately", async () => {
    const { client, sent } = setup(s => {
      if (s.path === "/entities/ws_1/assets/uploads") return ok({ uploadId: "upl_1", assetId: "asset_1", versionId: "asv_1", partSizeBytes: 8_000_000, partCount: 0, parts: [], expiresAt: "z", deduplicated: true }, 201);
      if (s.path === "/assets/uploads/upl_1/complete") return ok(assetSummary());
      return fail(404, "NOT_FOUND");
    });
    const asset = await client.uploadAsset("ws_1", new Blob([new Uint8Array(5)]), { kind: "data" });
    expect(asset.id).toBe("asset_1");
    expect(sent.map(s => s.method)).toEqual(["POST", "POST"]); // no PUT at all
  });

  it("{uri, name, type} input is read through fetch", async () => {
    const bytes = new Uint8Array([9, 9, 9]);
    const fetchMock = vi.fn(async () => new Response(bytes, { headers: { "content-type": "audio/mpeg" } }));
    vi.stubGlobal("fetch", fetchMock);
    try {
      const { client, sent } = setup(s => {
        if (s.path === "/entities/ws_1/assets/uploads") return ok({ uploadId: "upl_1", assetId: "asset_1", versionId: "asv_1", partSizeBytes: 8_000_000, partCount: 1, parts: [{ partNumber: 1, url: "http://x/p1", expiresAt: "z" }], expiresAt: "z", deduplicated: false }, 201);
        if (s.method === "PUT") return { status: 200, headers: { etag: '"e1"' }, body: new Uint8Array() };
        if (s.path === "/assets/uploads/upl_1/complete") return ok(assetSummary());
        return fail(404, "NOT_FOUND");
      });
      const asset = await client.uploadAsset("ws_1", { uri: "file:///tmp/song.mp3", name: "song.mp3", type: "audio/mpeg" }, { kind: "audio" });
      expect(asset.id).toBe("asset_1");
      expect(fetchMock).toHaveBeenCalledWith("file:///tmp/song.mp3");
      expect(sent[0]!.body).toMatchObject({ filename: "song.mp3", mimeType: "audio/mpeg", sizeBytes: 3 });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe("B11 hooks", () => {
  it("useAssets, useAsset, useAssetLinks, useStaleness read; useCreateAssetLink and useDeleteAsset invalidate (refetch) them", async () => {
    const { wrapper, sent } = setup(s => {
      if (s.path.startsWith("/assets?")) return ok([assetSummary()]);
      if (s.path === "/assets/asset_1") return ok({ ...assetSummary(), versions: [], links: [] });
      if (s.path === "/documents/doc_1/asset-links") return ok([]);
      if (s.path === "/documents/doc_1/staleness") return ok([]);
      if (s.path === "/asset-links") return ok({ id: "al_1", documentId: "doc_1", assetId: "asset_1", targetKind: "entity", targetId: "ent_1", role: "headshot" }, 201);
      if (s.method === "DELETE") return ok({ deletedAt: "z" });
      return fail(404, "NOT_FOUND");
    });
    const list = renderHook(() => useAssets({ entityId: "ws_1" }), { wrapper });
    await waitFor(() => expect(list.result.current.data?.data!).toHaveLength(1));
    const one = renderHook(() => useAsset("asset_1"), { wrapper });
    await waitFor(() => expect(one.result.current.data?.id).toBe("asset_1"));
    const links = renderHook(() => useAssetLinks("doc_1"), { wrapper });
    await waitFor(() => expect(links.result.current.data).toEqual([]));
    const stale = renderHook(() => useStaleness("doc_1"), { wrapper });
    await waitFor(() => expect(stale.result.current.data).toEqual([]));

    const linksReadsBefore = sent.filter(s => s.path === "/documents/doc_1/asset-links").length;
    const create = renderHook(() => useCreateAssetLink(), { wrapper });
    await act(async () => void (await create.result.current.mutateAsync({ assetId: "asset_1", documentId: "doc_1", target: { kind: "entity", id: "ent_1" }, role: "headshot" })));
    // an active useAssetLinks("doc_1") observer is refetched by the invalidation
    await waitFor(() => expect(sent.filter(s => s.path === "/documents/doc_1/asset-links").length).toBeGreaterThan(linksReadsBefore));

    const assetReadsBefore = sent.filter(s => s.path === "/assets/asset_1").length;
    const del = renderHook(() => useDeleteAsset(), { wrapper });
    await act(async () => void (await del.result.current.mutateAsync("asset_1")));
    await waitFor(() => expect(sent.filter(s => s.path === "/assets/asset_1").length).toBeGreaterThan(assetReadsBefore));
  });

  it("useUploadAsset tracks live progress and invalidates the asset lists on success", async () => {
    const { wrapper, qc } = setup(s => {
      if (s.path === "/entities/ws_1/assets/uploads") return ok({ uploadId: "upl_1", assetId: "asset_1", versionId: "asv_1", partSizeBytes: 8_000_000, partCount: 1, parts: [{ partNumber: 1, url: "http://x/p1", expiresAt: "z" }], expiresAt: "z", deduplicated: false }, 201);
      if (s.method === "PUT") return { status: 200, headers: { etag: '"e1"' }, body: new Uint8Array() };
      if (s.path === "/assets/uploads/upl_1/complete") return ok(assetSummary());
      return fail(404, "NOT_FOUND");
    });
    qc.setQueryData(["screenwriter", "assets", "list", {}], { success: true, data: [], timestamp: "2026-01-01T00:00:00.000Z", pagination: { hasNextPage: false, nextCursor: null, pageSize: 0 } });
    const { result } = renderHook(() => useUploadAsset(), { wrapper });
    expect(result.current.progress).toBe(0);
    await act(async () => {
      await result.current.mutateAsync({ wid: "ws_1", file: new Blob([new Uint8Array([1, 2, 3])]), opts: { kind: "image" } });
    });
    expect(result.current.progress).toBe(1);
    expect(result.current.data?.id).toBe("asset_1");
    expect(qc.getQueryState(["screenwriter", "assets", "list", {}])?.isInvalidated).toBe(true);
  });
});
