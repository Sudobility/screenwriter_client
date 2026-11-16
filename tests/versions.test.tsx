// @vitest-environment happy-dom
/**
 * B15 with a fake network: every route (method, path, query, body), the idempotency rules, typed errors, the offline-edits helper
 * (upload, PUT, snapshot with `state: {uploadKey}`) and hook invalidation.
 */
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor, act } from "@testing-library/react";
import {
  AnchorNotFoundError,
  ApiError,
  CompareTooLargeError,
  LimitExceededError,
  ScreenwriterClient,
  ScreenwriterClientProvider,
  isAnchorNotFound,
  isCompareTooLarge,
  isLimitExceeded,
  queryKeys,
  sha256Hex,
  useAddSnapshotComment,
  useAddSnapshotNote,
  useCompare,
  useCopyCommentToLive,
  useElementHistory,
  usePresence,
  useResolveSnapshotComment,
  useRestoreVersionAsCopy,
  useSetSnapshotPrefs,
  useSnapshotComments,
  useSnapshotNotes,
  useSnapshots,
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
      const isJson = typeof req.body === "string";
      const c: Call = {
        method: req.method,
        path: u.pathname.replace("/api/v1", ""),
        query: Object.fromEntries(u.searchParams),
        body: isJson ? JSON.parse(req.body as string) : undefined,
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
const failWith = (status: number, code: string, details?: object): Fail => ({ __fail: { status, code, details } });

const setup = (network: NetworkClient) => {
  const client = new ScreenwriterClient({ network, baseUrl: "http://x", getToken: async () => "t", retry: false });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children?: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, createElement(ScreenwriterClientProvider, { client, children }));
  return { client, qc, wrapper };
};

const T0 = "2026-09-21T10:00:00.000Z";
const summary = (id: string, over: object = {}) => ({
  id, documentId: "doc_1", parentId: null, name: "Draft", note: null, kind: "manual", autoReason: null, stats: { pages: 0, scenes: 1, words: 3 },
  createdBy: "u1", createdOnDevice: null, createdAt: T0, receivedAt: T0, forkedDocumentIds: [], hiddenForMe: false, noteCount: 0, ...over,
});
const comment = (id: string, over: object = {}) => ({
  id, snapshotId: "snap_1", anchor: { elementId: "el_1", offset: 0, length: 4 }, body: "Cut", mentions: [], authorId: "u1", viaLinkId: null,
  resolvedAt: null, resolvedBy: null, copiedToLiveNoteId: null, createdAt: T0, ...over,
});

describe("B15 client methods hit the documented routes", () => {
  it("every route, method, path, query and body; idempotency keys only where a POST creates", async () => {
    const { network, calls } = fake(c => {
      if (c.path === "/uploads/state") return { uploadKey: "upl_1", url: "http://x/put", expiresAt: T0 };
      return {};
    });
    const { client } = setup(network);
    await client.restoreVersionAsCopy("doc_1", "ver_1", { title: "Copy of v1", targetProjectId: "prj_2" });
    await client.getElementHistory("doc_1", "el_1", { limit: 5, cursor: "abc" });
    await client.getPresence("doc_1");
    await client.setSnapshotPrefs("snap_1", true);
    await client.listSnapshotNotes("snap_1");
    await client.addSnapshotNote("snap_1", "why this branch");
    await client.listSnapshotComments("snap_1", { limit: 10 });
    await client.addSnapshotComment("snap_1", { anchor: { elementId: "el_1", offset: 1, length: 2 }, body: "tighten", mentions: ["u2"] });
    await client.copyCommentToLive("snc_1");
    await client.resolveSnapshotComment("snc_1", true);
    await client.compare("doc_1", { base: { kind: "snapshot", snapshotId: "snap_1" }, target: { kind: "live", documentId: "doc_1" }, granularity: "word" });

    const by = (m: string, p: string) => calls.find(c => c.method === m && c.path === p)!;
    expect(by("POST", "/documents/doc_1/versions/ver_1/restore-as-copy")).toMatchObject({ body: { title: "Copy of v1", targetProjectId: "prj_2" } });
    expect(by("POST", "/documents/doc_1/versions/ver_1/restore-as-copy").idem).toBeTruthy(); // creates a document: retry-safe
    expect(by("GET", "/documents/doc_1/elements/el_1/history").query).toEqual({ limit: "5", cursor: "abc" });
    expect(by("GET", "/documents/doc_1/presence")).toBeTruthy();
    expect(by("PUT", "/snapshots/snap_1/prefs").body).toEqual({ hidden: true });
    expect(by("GET", "/snapshots/snap_1/notes")).toBeTruthy();
    expect(by("POST", "/snapshots/snap_1/notes")).toMatchObject({ body: { body: "why this branch" } });
    expect(by("POST", "/snapshots/snap_1/notes").idem).toBeTruthy();
    expect(by("GET", "/snapshots/snap_1/comments").query).toEqual({ limit: "10" });
    expect(by("POST", "/snapshots/snap_1/comments").body).toEqual({ anchor: { elementId: "el_1", offset: 1, length: 2 }, body: "tighten", mentions: ["u2"] });
    expect(by("POST", "/snapshot-comments/snc_1/copy-to-live")).toBeTruthy();
    expect(by("POST", "/snapshot-comments/snc_1/resolve").body).toEqual({ resolved: true });
    const cmp = by("POST", "/documents/doc_1/compare");
    expect(cmp.body).toEqual({ base: { kind: "snapshot", snapshotId: "snap_1" }, target: { kind: "live", documentId: "doc_1" }, granularity: "word" });
    expect(cmp.idem).toBeUndefined(); // a read dressed as a POST
    expect(calls.filter(c => c.method === "GET" || c.method === "PUT").every(c => c.idem === undefined)).toBe(true);
  });

  it("createSnapshotFromState uploads the replica, then files the offline-edits snapshot with state.uploadKey", async () => {
    const { network, calls } = fake(c => {
      if (c.path === "/uploads/state") return { uploadKey: "upl_77", url: "http://x/put", expiresAt: T0 };
      if (c.method === "POST" && c.path === "/documents/doc_1/snapshots") return { ...summary("snap_off", { kind: "auto", autoReason: "offline-edits" }), reparentedLive: false };
      return {};
    });
    const { client } = setup(network);
    const state = new Uint8Array([1, 2, 3, 4]);
    const made = await client.createSnapshotFromState("doc_1", state, {
      name: "Offline edits from tablet", kind: "auto", autoReason: "offline-edits", clientSnapshotId: "offline-edits:tablet:0",
      sourceEpoch: 0, assumedParentId: "snap_p", createdAt: T0, createdOnDevice: "tablet",
    });
    expect(made).toMatchObject({ id: "snap_off", reparentedLive: false });
    expect(calls.map(c => `${c.method} ${c.path}`)).toEqual(["POST /uploads/state", "PUT /put", "POST /documents/doc_1/snapshots"]);
    expect(calls[0]!.body).toEqual({ sizeBytes: 4, sha256Hex: await sha256Hex(state), purpose: "state" });
    expect(calls[2]!.body).toEqual({
      name: "Offline edits from tablet", kind: "auto", autoReason: "offline-edits", clientSnapshotId: "offline-edits:tablet:0",
      sourceEpoch: 0, assumedParentId: "snap_p", createdAt: T0, createdOnDevice: "tablet", state: { uploadKey: "upl_77" },
    });
  });
});

describe("B15 typed errors", () => {
  it("maps ANCHOR_NOT_FOUND, COMPARE_TOO_LARGE and LIMIT_EXCEEDED to subclasses", async () => {
    const script: Record<string, Fail> = {
      "/snapshots/s/comments": failWith(404, "ANCHOR_NOT_FOUND", { elementId: "el_9" }),
      "/documents/d/compare": failWith(413, "COMPARE_TOO_LARGE", { pages: 500, max: 400 }),
      "/snapshots/s/notes": failWith(409, "LIMIT_EXCEEDED", { limit: 200 }),
      "/snapshot-comments/c/copy-to-live": failWith(404, "ANCHOR_NOT_FOUND", { elementId: "el_1" }),
    };
    const { client } = setup(fake(c => script[c.path]).network);

    const anchor = await client.addSnapshotComment("s", { anchor: { elementId: "el_9", offset: 0, length: 1 }, body: "x" }).catch(e => e);
    expect(anchor).toBeInstanceOf(AnchorNotFoundError);
    expect(anchor).toBeInstanceOf(ApiError);
    expect(isAnchorNotFound(anchor)).toBe(true);
    expect((anchor as AnchorNotFoundError).elementId).toBe("el_9");
    expect(await client.copyCommentToLive("c").catch(e => e)).toBeInstanceOf(AnchorNotFoundError);

    const big = await client.compare("d", { base: { kind: "live", documentId: "d" }, target: { kind: "live", documentId: "d" } }).catch(e => e);
    expect(isCompareTooLarge(big)).toBe(true);
    expect(big).toBeInstanceOf(CompareTooLargeError);
    expect(big).toMatchObject({ pages: 500, max: 400, status: 413, code: "COMPARE_TOO_LARGE" });

    const cap = await client.addSnapshotNote("s", "one too many").catch(e => e);
    expect(isLimitExceeded(cap)).toBe(true);
    expect(cap).toBeInstanceOf(LimitExceededError);
    expect((cap as LimitExceededError).limit).toBe(200);
  });
});

describe("B15 hooks", () => {
  it("useSetSnapshotPrefs refreshes the document's snapshot list; useAddSnapshotNote refreshes notes and counts", async () => {
    let hidden = false;
    let notes = 0;
    const { network, calls } = fake(c => {
      if (c.method === "GET" && c.path === "/documents/doc_1/snapshots") return { liveParentSnapshotId: null, snapshots: [summary("snap_1", { hiddenForMe: hidden, noteCount: notes })] };
      if (c.method === "PUT" && c.path === "/snapshots/snap_1/prefs") {
        hidden = (c.body as { hidden: boolean }).hidden;
        return { hidden };
      }
      if (c.method === "GET" && c.path === "/snapshots/snap_1/notes") return Array.from({ length: notes }, (_, i) => ({ id: `snn_${i}`, snapshotId: "snap_1", body: `n${i}`, authorId: "u1", createdAt: T0 }));
      if (c.method === "POST" && c.path === "/snapshots/snap_1/notes") {
        notes++;
        return { id: "snn_new", snapshotId: "snap_1", body: "hi", authorId: "u1", createdAt: T0 };
      }
      return {};
    });
    const { wrapper } = setup(network);
    const list = renderHook(() => useSnapshots("doc_1"), { wrapper });
    const noteList = renderHook(() => useSnapshotNotes("snap_1"), { wrapper });
    await waitFor(() => expect(list.result.current.data?.snapshots[0]!.hiddenForMe).toBe(false));
    await waitFor(() => expect(noteList.result.current.data).toEqual([]));

    const prefs = renderHook(() => useSetSnapshotPrefs("doc_1"), { wrapper });
    await act(async () => {
      await prefs.result.current.mutateAsync({ snapshotId: "snap_1", hidden: true });
    });
    await waitFor(() => expect(list.result.current.data?.snapshots[0]!.hiddenForMe).toBe(true));

    const add = renderHook(() => useAddSnapshotNote("snap_1", "doc_1"), { wrapper });
    await act(async () => {
      await add.result.current.mutateAsync("hi");
    });
    await waitFor(() => expect(noteList.result.current.data).toHaveLength(1));
    await waitFor(() => expect(list.result.current.data?.snapshots[0]!.noteCount).toBe(1));
    expect(calls.filter(c => c.method === "GET" && c.path === "/documents/doc_1/snapshots").length).toBeGreaterThanOrEqual(3);
  });

  it("comments: add and resolve refresh the list, copy-to-live also refreshes the document family", async () => {
    let comments = [comment("snc_1")];
    const { network } = fake(c => {
      if (c.method === "GET" && c.path === "/snapshots/snap_1/comments") return comments;
      if (c.method === "POST" && c.path === "/snapshots/snap_1/comments") {
        comments = [...comments, comment("snc_2")];
        return comments[1];
      }
      if (c.path === "/snapshot-comments/snc_1/resolve") {
        comments = [comment("snc_1", { resolvedAt: T0, resolvedBy: "u1" }), ...comments.slice(1)];
        return comments[0];
      }
      if (c.path === "/snapshot-comments/snc_1/copy-to-live") return { noteId: "note_1" };
      return {};
    });
    const { wrapper, qc } = setup(network);
    const list = renderHook(() => useSnapshotComments("snap_1"), { wrapper });
    await waitFor(() => expect(list.result.current.data?.data!).toHaveLength(1));

    const add = renderHook(() => useAddSnapshotComment("snap_1"), { wrapper });
    await act(async () => {
      await add.result.current.mutateAsync({ anchor: { elementId: "el_1", offset: 0, length: 2 }, body: "second" });
    });
    await waitFor(() => expect(list.result.current.data?.data!).toHaveLength(2));

    const resolve = renderHook(() => useResolveSnapshotComment("snap_1"), { wrapper });
    await act(async () => {
      await resolve.result.current.mutateAsync({ commentId: "snc_1", resolved: true });
    });
    await waitFor(() => expect(list.result.current.data?.data![0]!.resolvedAt).toBe(T0));

    qc.setQueryData(queryKeys.documentContent("doc_1"), { stale: true });
    const copy = renderHook(() => useCopyCommentToLive("snap_1", "doc_1"), { wrapper });
    await act(async () => {
      expect(await copy.result.current.mutateAsync("snc_1")).toEqual({ noteId: "note_1" });
    });
    expect(qc.getQueryState(queryKeys.documentContent("doc_1"))?.isInvalidated).toBe(true);
  });

  it("useCompare idles without a request, stays cached for immutable sides, and surfaces CompareTooLargeError without retrying", async () => {
    let n = 0;
    const { network, calls } = fake(c => {
      if (c.path === "/documents/doc_1/compare") {
        n++;
        return (c.body as { base: { snapshotId?: string } }).base.snapshotId === "snap_huge"
          ? failWith(413, "COMPARE_TOO_LARGE", { pages: 900, max: 400 })
          : { scenes: [], titlePage: [], beats: [], entities: [], summary: { scenesAdded: 0, scenesRemoved: 0, scenesModified: 0, scenesMoved: 0, wordsAdded: 0, wordsRemoved: 0, pageDelta: 0 } };
      }
      return {};
    });
    const { wrapper } = setup(network);
    const idle = renderHook(() => useCompare("doc_1", undefined), { wrapper });
    expect(idle.result.current.fetchStatus).toBe("idle");
    expect(calls).toHaveLength(0);

    const req = { base: { kind: "snapshot", snapshotId: "snap_1" }, target: { kind: "snapshot", snapshotId: "snap_2" } } as const;
    const a = renderHook(() => useCompare("doc_1", req), { wrapper });
    await waitFor(() => expect(a.result.current.data?.summary.scenesModified).toBe(0));
    renderHook(() => useCompare("doc_1", req), { wrapper }); // same key: served from cache
    await new Promise(r => setTimeout(r, 30));
    expect(n).toBe(1);

    const huge = renderHook(() => useCompare("doc_1", { base: { kind: "snapshot", snapshotId: "snap_huge" }, target: { kind: "live", documentId: "doc_1" } }), { wrapper });
    await waitFor(() => expect(huge.result.current.error).toBeInstanceOf(CompareTooLargeError));
    expect(n).toBe(2); // no retry
  });

  it("useElementHistory and usePresence read their routes; restore-as-copy refreshes the document lists only", async () => {
    const { network, calls } = fake(c => {
      if (c.path === "/documents/doc_1/elements/el_1/history") return [{ at: T0, authors: ["u1"], text: "v2", source: "update" }];
      if (c.path === "/documents/doc_1/presence") return [{ userId: "u1", displayName: "A", colour: "#e6194b", since: T0, deviceId: "d", deviceName: null, mode: "edit", role: "owner" }];
      if (c.path === "/documents/doc_1/versions/ver_1/restore-as-copy") return { id: "doc_2", title: "Copy" };
      return {};
    });
    const { wrapper, qc } = setup(network);
    const hist = renderHook(() => useElementHistory("doc_1", "el_1"), { wrapper });
    await waitFor(() => expect(hist.result.current.data?.data![0]!.text).toBe("v2"));
    const off = renderHook(() => useElementHistory("doc_1", undefined), { wrapper });
    expect(off.result.current.fetchStatus).toBe("idle");
    const pres = renderHook(() => usePresence("doc_1"), { wrapper });
    await waitFor(() => expect(pres.result.current.data?.[0]!.colour).toBe("#e6194b"));

    qc.setQueryData(queryKeys.documentLists(), { lists: true });
    qc.setQueryData(queryKeys.documentContent("doc_1"), { content: true });
    const copy = renderHook(() => useRestoreVersionAsCopy("doc_1"), { wrapper });
    await act(async () => {
      expect(await copy.result.current.mutateAsync({ versionId: "ver_1", title: "Copy" })).toMatchObject({ id: "doc_2" });
    });
    expect(calls.some(c => c.method === "POST" && c.path.endsWith("/restore-as-copy"))).toBe(true);
    expect(qc.getQueryState(queryKeys.documentContent("doc_1"))?.isInvalidated).toBe(false); // the source is untouched
    expect(qc.getQueryState(queryKeys.presence("doc_1"))?.isInvalidated).toBe(false);
  });
});
