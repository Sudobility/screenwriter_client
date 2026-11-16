// @vitest-environment happy-dom
/**
 * B12 client: every route method (path, query, body), `openNotificationStream` (fetch-stream SSE reader with
 * reconnect/backoff, since EventSource cannot send Authorization), and the hooks. The real API is not spawned here
 * (no *-integration.test.ts for this slice, matching B11's precedent of fake-network-only coverage).
 */
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import {
  ScreenwriterClient,
  ScreenwriterClientProvider,
  newChatMessageId,
  readRequestBody,
  useActivity,
  useChat,
  useDeleteChatMessage,
  useDevices,
  useEditChatMessage,
  useNotificationPrefs,
  useNotificationStream,
  useNotifications,
  useRegisterDevice,
  useSendChatMessage,
  useUnreadCount,
  useWorkspaceActivity,
  type NetworkClient,
  type NetworkRequest,
  type NetworkResponse,
  type NotificationStreamEvent,
} from "../src";

const enc = (v: unknown) => new TextEncoder().encode(JSON.stringify(v));
const ok = (data: unknown, status = 200, headers: Record<string, string> = {}): NetworkResponse => ({ status, headers, body: enc({ success: true, data }) });

interface Sent {
  req: NetworkRequest;
  body: unknown;
}
function scripted(script: Array<NetworkResponse | ((req: NetworkRequest) => NetworkResponse)>) {
  const sent: Sent[] = [];
  let i = 0;
  const network: NetworkClient = {
    async request(req) {
      const text = await readRequestBody(req);
      sent.push({ req, body: text ? JSON.parse(text) : undefined });
      const next = script[Math.min(i++, script.length - 1)]!;
      return typeof next === "function" ? next(req) : next;
    },
  };
  return { network, sent };
}
const pathOf = (s: Sent) => new URL(s.req.url).pathname.replace("/api/v1", "") + new URL(s.req.url).search;

function clientFor(network: NetworkClient) {
  return new ScreenwriterClient({ network, baseUrl: "http://x", getToken: async () => "tok", newIdempotencyKey: () => "key-1" });
}

describe("B12 client methods", () => {
  it("notification prefs: get and a sparse patch", async () => {
    const { network, sent } = scripted([ok({ kinds: {}, writingReminderTime: null }), ok({ kinds: { mention: { inApp: true, push: true, email: "off" } }, writingReminderTime: null })]);
    const client = clientFor(network);
    await client.getNotificationPrefs();
    await client.setNotificationPrefs({ kinds: { mention: { email: "off" } } });
    expect(pathOf(sent[0]!)).toBe("/me/notification-prefs");
    expect(sent[1]!.req.method).toBe("PUT");
    expect(sent[1]!.body).toEqual({ kinds: { mention: { email: "off" } } });
  });

  it("listNotifications reads X-Unread-Count; read/delete", async () => {
    const { network, sent } = scripted([
      ok([{ id: "ntf_1", kind: "mention", payload: {}, entityId: null, documentId: null, readAt: null, createdAt: "2026-01-01T00:00:00Z" }], 200, {
        "x-unread-count": "3",
      }),
      ok({ updated: 1 }),
      ok({ deleted: true }),
    ]);
    const client = clientFor(network);
    const list = await client.listNotifications({ unread: true });
    expect(list.unreadCount).toBe(3);
    expect(list.data!).toHaveLength(1);
    expect(pathOf(sent[0]!)).toBe("/notifications?unread=true");
    await client.markNotificationsRead({ all: true });
    expect(sent[1]!.body).toEqual({ all: true });
    await client.deleteNotification("ntf_1");
    expect(pathOf(sent[2]!)).toBe("/notifications/ntf_1");
    expect(sent[2]!.req.method).toBe("DELETE");
  });

  it("listMentionsWithoutAccess", async () => {
    const { network, sent } = scripted([ok([{ noteId: "note_1", userId: "u2", email: "u2@x.co", createdAt: "2026-01-01T00:00:00Z" }])]);
    const client = clientFor(network);
    const r = await client.listMentionsWithoutAccess("doc_1");
    expect(r).toHaveLength(1);
    expect(pathOf(sent[0]!)).toBe("/documents/doc_1/mentions-without-access");
  });

  it("chat: send auto-generates a clientMessageId, edit and delete hit the right paths", async () => {
    const { network, sent } = scripted([
      ok([]),
      ok({ id: "msg_x", documentId: "doc_1", authorId: "u1", body: "hi", mentions: [], createdAt: "2026-01-01T00:00:00Z", editedAt: null, deletedAt: null }),
      ok({ id: "msg_x", documentId: "doc_1", authorId: "u1", body: "fixed", mentions: [], createdAt: "2026-01-01T00:00:00Z", editedAt: "2026-01-01T00:01:00Z", deletedAt: null }),
      ok({ deletedAt: "2026-01-01T00:02:00Z" }),
    ]);
    const client = clientFor(network);
    await client.listChat("doc_1", { before: "2026-01-01T00:00:00Z" });
    expect(pathOf(sent[0]!)).toContain("/documents/doc_1/chat?before=");
    await client.sendChatMessage("doc_1", { body: "hi" });
    expect((sent[1]!.body as { clientMessageId: string }).clientMessageId).toMatch(/^msg_[A-Za-z0-9]{20,}$/);
    await client.editChatMessage("msg_x", { body: "fixed" });
    expect(pathOf(sent[2]!)).toBe("/chat-messages/msg_x");
    expect(sent[2]!.req.method).toBe("PATCH");
    await client.deleteChatMessage("msg_x");
    expect(sent[3]!.req.method).toBe("DELETE");
    expect(newChatMessageId()).toMatch(/^msg_[A-Za-z0-9]{20,}$/);
  });

  it("activity: kinds join as a comma-separated query string", async () => {
    const { network, sent } = scripted([ok([]), ok([])]);
    const client = clientFor(network);
    await client.listDocumentActivity("doc_1", { kinds: ["document.created", "snapshot.created"] });
    expect(pathOf(sent[0]!)).toBe("/documents/doc_1/activity?kinds=document.created%2Csnapshot.created");
    await client.listWorkspaceActivity("ws_1", { projectId: "prj_1" });
    expect(pathOf(sent[1]!)).toBe("/entities/ws_1/activity?projectId=prj_1");
  });

  it("devices: register, update, revoke, push token", async () => {
    const device = { id: "dev_1", displayName: "Mac", platform: "macos", appVersion: "1.0", lastSeenAt: "2026-01-01T00:00:00Z", revokedAt: null, current: false, settings: {} };
    const { network, sent } = scripted([ok([device]), ok(device, 201), ok({ ...device, displayName: "New" }), ok({ revokedAt: "2026-01-01T00:00:00Z" }), ok({ registeredAt: "2026-01-01T00:00:00Z" }), ok({ deleted: true })]);
    const client = clientFor(network);
    const list = await client.listDevices("dev_1");
    expect(list[0]).toMatchObject({ id: "dev_1" });
    expect(pathOf(sent[0]!)).toBe("/devices?deviceId=dev_1");
    await client.registerDevice({ id: "dev_1", installId: "i1", displayName: "Mac", platform: "macos", appVersion: "1.0" });
    expect(pathOf(sent[1]!)).toBe("/devices");
    await client.updateDevice("dev_1", { displayName: "New" });
    expect(pathOf(sent[2]!)).toBe("/devices/dev_1");
    await client.revokeDevice("dev_1");
    expect(pathOf(sent[3]!)).toBe("/devices/dev_1/revoke");
    await client.setPushToken("dev_1", { platform: "webpush", token: "tok" });
    expect(pathOf(sent[4]!)).toBe("/devices/dev_1/push-token");
    expect(sent[4]!.req.method).toBe("PUT");
    await client.clearPushToken("dev_1");
    expect(pathOf(sent[5]!)).toBe("/devices/dev_1/push-token");
    expect(sent[5]!.req.method).toBe("DELETE");
  });
});

describe("openNotificationStream", () => {
  function sseResponse(chunks: string[], ok2 = true): Response {
    let i = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (i < chunks.length) controller.enqueue(new TextEncoder().encode(chunks[i++]));
        else controller.close();
      },
    });
    return new Response(stream, { status: ok2 ? 200 : 500 });
  }

  it("parses `event:`/`data:` frames, sends the bearer token (never as EventSource would), and reconnects on drop", async () => {
    const calls: { authorization?: string }[] = [];
    let call = 0;
    const fetchImpl = (async (_url: unknown, init?: RequestInit) => {
      call++;
      calls.push({ authorization: (init?.headers as Record<string, string>)?.Authorization });
      if (call === 1) return sseResponse(['event: unread_count\ndata: {"count":2}\n\n', 'event: notification\ndata: {"id":"ntf_1"}\n\n']);
      return sseResponse(['event: unread_count\ndata: {"count":0}\n\n']);
    }) as unknown as typeof fetch;

    const client = new ScreenwriterClient({ network: { request: () => Promise.reject(new Error("unused")) }, baseUrl: "http://x", getToken: async () => "tok-1" });
    const events: NotificationStreamEvent[] = [];
    const statuses: string[] = [];
    const handle = client.openNotificationStream(e => events.push(e), { fetchImpl, onStatus: s => statuses.push(s), random: () => 0 });

    await waitFor(() => expect(events.length).toBeGreaterThanOrEqual(3)); // 2 from the first connection, 1 more after reconnect
    handle.close();
    const seenAfterClose = events.length;
    await new Promise(r => setTimeout(r, 30));
    expect(events.length).toBe(seenAfterClose); // stopped for good

    expect(events[0]).toEqual({ event: "unread_count", data: { count: 2 } });
    expect(events[1]).toEqual({ event: "notification", data: { id: "ntf_1" } });
    expect(calls.every(c => c.authorization === "Bearer tok-1")).toBe(true);
    expect(statuses).toContain("connecting");
    expect(statuses).toContain("open");
    expect(statuses).toContain("closed"); // the drop between the two connections
  });
});

describe("B12 hooks", () => {
  const setup = (network: NetworkClient) => {
    const client = clientFor(network);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children?: ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, createElement(ScreenwriterClientProvider, { client, children }));
    return { client, qc, wrapper };
  };

  it("useNotificationPrefs, useNotifications, useUnreadCount", async () => {
    const { network } = scripted([
      ok({ kinds: {}, writingReminderTime: null }),
      ok([], 200, { "x-unread-count": "5" }),
      ok([], 200, { "x-unread-count": "5" }),
    ]);
    const { wrapper } = setup(network);
    const prefs = renderHook(() => useNotificationPrefs(), { wrapper });
    await waitFor(() => expect(prefs.result.current.data).toBeTruthy());
    const list = renderHook(() => useNotifications(), { wrapper });
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    const unread = renderHook(() => useUnreadCount(), { wrapper });
    await waitFor(() => expect(unread.result.current.data).toBe(5));
  });

  it("useSendChatMessage invalidates useChat; useEditChatMessage and useDeleteChatMessage too", async () => {
    const msg = { id: "msg_1", documentId: "doc_1", authorId: "u1", body: "hi", mentions: [], createdAt: "2026-01-01T00:00:00Z", editedAt: null, deletedAt: null };
    let listCalls = 0;
    const network: NetworkClient = {
      async request(req) {
        const path = new URL(req.url).pathname;
        if (req.method === "GET" && path.endsWith("/chat")) {
          listCalls++;
          return ok(listCalls > 1 ? [msg] : []);
        }
        if (req.method === "POST" && path.endsWith("/chat")) return ok(msg, 201);
        if (req.method === "PATCH") return ok({ ...msg, body: "fixed", editedAt: "2026-01-01T00:01:00Z" });
        return ok({ deletedAt: "2026-01-01T00:02:00Z" });
      },
    };
    const { wrapper } = setup(network);
    const list = renderHook(() => useChat("doc_1"), { wrapper });
    await waitFor(() => expect(list.result.current.data?.data!).toHaveLength(0));
    const send = renderHook(() => useSendChatMessage("doc_1"), { wrapper });
    await act(async () => void (await send.result.current.mutateAsync({ body: "hi" })));
    await waitFor(() => expect(list.result.current.data?.data!).toHaveLength(1)); // invalidated and refetched
    const edit = renderHook(() => useEditChatMessage("doc_1"), { wrapper });
    await act(async () => void (await edit.result.current.mutateAsync({ mid: "msg_1", body: { body: "fixed" } })));
    const del = renderHook(() => useDeleteChatMessage("doc_1"), { wrapper });
    await act(async () => void (await del.result.current.mutateAsync("msg_1")));
    expect(listCalls).toBeGreaterThanOrEqual(3);
  });

  it("useActivity and useWorkspaceActivity", async () => {
    const { network } = scripted([
      ok([{ id: "act_1", kind: "document.created", actorId: "u1", actorKind: "user", summary: { i18nKey: "x" }, targetIds: [], createdAt: "2026-01-01T00:00:00Z" }]),
      ok([]),
    ]);
    const { wrapper } = setup(network);
    const doc = renderHook(() => useActivity("doc_1"), { wrapper });
    await waitFor(() => expect(doc.result.current.data?.data!).toHaveLength(1));
    const ws = renderHook(() => useWorkspaceActivity("ws_1"), { wrapper });
    await waitFor(() => expect(ws.result.current.isSuccess).toBe(true));
  });

  it("useDevices lists; useRegisterDevice invalidates it", async () => {
    const device = { id: "dev_1", displayName: "Mac", platform: "macos", appVersion: "1.0", lastSeenAt: "2026-01-01T00:00:00Z", revokedAt: null, current: false, settings: {} };
    let n = 0;
    const network: NetworkClient = {
      async request(req) {
        if (req.method === "POST") return ok(device, 201);
        n++;
        return ok(n > 1 ? [device] : []);
      },
    };
    const { wrapper } = setup(network);
    const list = renderHook(() => useDevices(), { wrapper });
    await waitFor(() => expect(list.result.current.data).toHaveLength(0));
    const register = renderHook(() => useRegisterDevice(), { wrapper });
    await act(async () => void (await register.result.current.mutateAsync({ id: "dev_1", installId: "i1", displayName: "Mac", platform: "macos", appVersion: "1.0" })));
    await waitFor(() => expect(list.result.current.data).toHaveLength(1));
  });
});
