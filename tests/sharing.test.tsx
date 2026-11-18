// @vitest-environment happy-dom
/** B8 client: typed errors, credential modes, unlock-session header, dispatchers and hooks, against a fake network. */
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import {
  ApiError,
  RoleInsufficientError,
  ScreenwriterClient,
  ScreenwriterClientProvider,
  ShareLinkExpiredError,
  isRoleInsufficient,
  isShareLinkExpired,
  queryKeys,
  useMembers,
  useRemoveMember,
  useShareLink,
  useUpdateMemberRole,
  type NetworkClient,
  type NetworkRequest,
} from "../src";

interface Rec {
  method: string;
  path: string;
  query: string;
  auth: string | undefined;
  unlock: string | undefined;
  body: unknown;
}

/** Fake API: `handler(req) -> [status, envelope]`; every request is recorded. */
function fake(handler: (r: Rec) => [number, object] | undefined = () => undefined) {
  const calls: Rec[] = [];
  const network: NetworkClient = {
    async request(req: NetworkRequest) {
      const u = new URL(req.url);
      const rec: Rec = {
        method: req.method,
        path: u.pathname.replace("/api/v1", ""),
        query: u.search,
        auth: req.headers?.Authorization,
        unlock: req.headers?.["X-Doc-Unlock"],
        body: req.body ? JSON.parse(req.body as string) : undefined,
      };
      calls.push(rec);
      const [status, env] = handler(rec) ?? [200, { success: true, data: {} }];
      return { status, headers: {}, body: new TextEncoder().encode(JSON.stringify(env)) };
    },
  };
  const client = (token: string | null = "user-token") => new ScreenwriterClient({ network, baseUrl: "http://x", getToken: async () => token });
  return { calls, client };
}
const ok = (data: unknown): [number, object] => [200, { success: true, data }];
const fail = (status: number, code: string, details?: object): [number, object] => [status, { success: false, error: code, code, ...(details ? { details } : {}) }];

describe("typed errors", () => {
  it("a 403 with details.requiredRole is a RoleInsufficientError (still an ApiError); one without is a plain ApiError", async () => {
    const { client } = fake(r =>
      r.path.endsWith("/commands")
        ? fail(403, "FORBIDDEN", { permission: "document.edit", requiredRole: "manager", role: "member" })
        : fail(403, "FORBIDDEN")
    );
    const e = await client().applyCommands("doc_1", { commands: [], baseEpoch: 0 }).catch(x => x);
    expect(e).toBeInstanceOf(RoleInsufficientError);
    expect(e).toBeInstanceOf(ApiError);
    expect(isRoleInsufficient(e)).toBe(true);
    expect(e.requiredRole).toBe("manager");
    expect(e.role).toBe("member");
    expect(e.permission).toBe("document.edit");
    expect(e.code).toBe("FORBIDDEN");
    expect(e.status).toBe(403);
    const plain = await client().getDocument("doc_1").catch(x => x);
    expect(plain).toBeInstanceOf(ApiError);
    expect(plain).not.toBeInstanceOf(RoleInsufficientError);
  });

  it("SHARE_LINK_INVALID is a ShareLinkExpiredError with the reason", async () => {
    const { client } = fake(() => fail(404, "SHARE_LINK_INVALID", { reason: "expired" }));
    const e = await client(null).resolveShareLink("fws_x").catch(x => x);
    expect(e).toBeInstanceOf(ShareLinkExpiredError);
    expect(isShareLinkExpired(e)).toBe(true);
    expect(e.reason).toBe("expired");
    expect(e.code).toBe("SHARE_LINK_INVALID");
    const bare = fake(() => fail(404, "SHARE_LINK_INVALID"));
    expect((await bare.client().unlockShareLink("t").catch(x => x)).reason).toBe("unknown");
  });
});

describe("credentials and headers", () => {
  it("resolveShareLink sends no Authorization at all; unlock sends the user's token; a link session goes as the bearer with no 401 retry", async () => {
    const { calls, client } = fake(r => (r.auth === "Bearer fls_session" ? fail(401, "UNAUTHORIZED") : ok({})));
    const c = client("user-token");
    await c.resolveShareLink("fws_a");
    expect(calls[0]).toMatchObject({ method: "GET", path: "/public/share/fws_a", auth: undefined });
    await c.unlockShareLink("fws_a", "pw");
    expect(calls[1]).toMatchObject({ method: "POST", path: "/share/fws_a/unlock", auth: "Bearer user-token", body: { password: "pw" } });
    await c.unlockShareLink("fws_a");
    expect(calls[2]!.body).toEqual({});
    await expect(c.getSharedState("fws_a", { linkSession: "fls_session", documentId: "doc_9" })).rejects.toBeInstanceOf(ApiError);
    expect(calls.slice(3)).toHaveLength(1); // a 401 on a link session is not retried with a refreshed user token
    expect(calls[3]).toMatchObject({ path: "/share/fws_a/state", query: "?documentId=doc_9", auth: "Bearer fls_session" });
    // signed out: no header, still works
    const out = fake();
    await out.client(null).resolveShareLink("fws_a");
    expect(out.calls[0]!.auth).toBeUndefined();
  });

  it("an unlock session is remembered per document and sent as X-Doc-Unlock on that document's routes only", async () => {
    const { calls, client } = fake(r => (r.path.endsWith("/unlock-session") ? ok({ sessionToken: "tok123", expiresAt: "2030-01-01T00:00:00Z" }) : ok({})));
    const c = client();
    await c.createUnlockSession("doc_a");
    expect(c.getDocumentUnlock("doc_a")).toBe("tok123");
    await c.getDocumentContent("doc_a");
    await c.getDocumentContent("doc_b");
    await c.getSnapshot("snap_x");
    expect(calls.find(r => r.path === "/documents/doc_a/content")!.unlock).toBe("tok123");
    expect(calls.find(r => r.path === "/documents/doc_b/content")!.unlock).toBeUndefined();
    await c.unlockDocument("doc_a"); // unlocking forgets the token
    expect(c.getDocumentUnlock("doc_a")).toBeNull();
    c.setDocumentUnlock("doc_b", "manual");
    await c.getDocument("doc_b");
    expect(calls.at(-1)!.unlock).toBe("manual");
  });
});

describe("methods and dispatchers", () => {
  it("map onto the routes", async () => {
    const { calls, client } = fake();
    const c = client();
    await c.inviteMember({ type: "entity", id: "ws_1" }, { email: "a@b.co", role: "member" });
    await c.inviteMember({ type: "project", id: "prj_1" }, { email: "a@b.co", role: "manager" });
    await c.inviteMember({ type: "document", id: "doc_1" }, { email: "a@b.co", role: "member" });
    await c.createShareLink({ type: "document", id: "doc_1" }, { access: "view" });
    await c.createShareLink({ type: "project", id: "prj_1" }, { access: "comment", generalAccess: "restricted" });
    await c.createShareLink({ type: "snapshot", id: "snap_1" }, { access: "view" });
    await c.listShareLinks({ type: "document", id: "doc_1" });
    await c.listShareLinks({ type: "project", id: "prj_1" });
    await c.listGrants({ type: "document", id: "doc_1" });
    await c.listGrants({ type: "project", id: "prj_1" });
    await c.updateShareLink("shl_1", { clearPassword: true });
    await c.revokeShareLink("shl_1");
    await c.updateGrant("grt_1", { role: "manager" });
    await c.removeGrant("grt_1");
    await c.updateMemberRole("ws_1", "u2", "manager");
    await c.removeMember("ws_1", "u2");
    await c.deleteManagedEntity("ws_1", "Name");
    await c.transferManagedEntity("ws_1", "u2");
    await c.acceptInvitation("tok");
    await c.declineInvitation("inv_1");
    await c.listSharedWithMe({ limit: 5 });
    expect(calls.map(r => `${r.method} ${r.path}${r.query}`)).toEqual([
      "POST /entities/ws_1/invitations",
      "POST /projects/prj_1/invitations",
      "POST /documents/doc_1/invitations",
      "POST /documents/doc_1/share-links",
      "POST /projects/prj_1/share-links",
      "POST /snapshots/snap_1/share-links",
      "GET /documents/doc_1/share-links",
      "GET /projects/prj_1/share-links",
      "GET /documents/doc_1/grants",
      "GET /projects/prj_1/grants",
      "PATCH /share-links/shl_1",
      "DELETE /share-links/shl_1",
      "PATCH /grants/grt_1",
      "DELETE /grants/grt_1",
      "PATCH /entities/ws_1/members/u2",
      "DELETE /entities/ws_1/members/u2",
      "DELETE /entities/ws_1",
      "POST /entities/ws_1/transfer",
      "POST /invitations/accept",
      "POST /invitations/inv_1/decline",
      "GET /me/shared?limit=5",
    ]);
    expect(calls[16]!.body).toEqual({ confirmName: "Name" });
    expect(calls[18]!.body).toEqual({ token: "tok" });
  });

  it("downloadEntityAudit returns the CSV text and passes the range", async () => {
    const calls: string[] = [];
    const network: NetworkClient = {
      async request(req) {
        calls.push(req.url);
        return { status: 200, headers: { "content-type": "text/csv" }, body: new TextEncoder().encode("created_at,actor\r\n") };
      },
    };
    const c = new ScreenwriterClient({ network, baseUrl: "http://x", getToken: async () => "t" });
    expect(await c.downloadEntityAudit("ws_1", { from: "2026-01-01T00:00:00Z", to: "2026-02-01T00:00:00Z" })).toBe("created_at,actor\r\n");
    expect(calls[0]).toContain("/entities/ws_1/audit.csv?from=2026-01-01T00%3A00%3A00Z&to=2026-02-01T00%3A00%3A00Z");
  });
});

describe("sharing hooks", () => {
  const setup = (handler?: Parameters<typeof fake>[0]) => {
    const f = fake(handler);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const c = f.client();
    const wrapper = ({ children }: { children?: ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, createElement(ScreenwriterClientProvider, { client: c, children }));
    return { ...f, qc, wrapper };
  };

  it("useMembers loads, and changing a role refetches the member list", async () => {
    let role = "member";
    const { calls, wrapper } = setup(r => {
      if (r.method === "PATCH") {
        role = (r.body as { role: string }).role;
        return ok({ userId: "u2", role });
      }
      return ok([{ userId: "u2", role }]);
    });
    const list = renderHook(() => useMembers("ws_1"), { wrapper });
    await waitFor(() => expect(list.result.current.data?.data![0]!.role).toBe("member"));
    const upd = renderHook(() => useUpdateMemberRole("ws_1"), { wrapper });
    upd.result.current.mutate({ uid: "u2", role: "manager" });
    await waitFor(() => expect(list.result.current.data?.data![0]!.role).toBe("manager"));
    expect(calls.filter(c => c.method === "GET" && c.path === "/entities/ws_1/members").length).toBeGreaterThanOrEqual(2);
    // removing invalidates the sharing family too
    const rm = renderHook(() => useRemoveMember("ws_1"), { wrapper });
    rm.result.current.mutate("u2");
    await waitFor(() => expect(calls.some(c => c.method === "DELETE")).toBe(true));
  });

  it("useShareLink resolves without credentials and surfaces a dead link as ShareLinkExpiredError without retrying", async () => {
    let hits = 0;
    const { calls, wrapper } = setup(r => {
      hits++;
      return r.path.includes("dead") ? fail(404, "SHARE_LINK_INVALID", { reason: "revoked" }) : ok({ targetType: "document", title: "Pilot", access: "view" });
    });
    const good = renderHook(() => useShareLink("fws_good"), { wrapper });
    await waitFor(() => expect(good.result.current.data?.title).toBe("Pilot"));
    expect(calls[0]!.auth).toBeUndefined();
    const dead = renderHook(() => useShareLink("fws_dead"), { wrapper });
    await waitFor(() => expect(dead.result.current.isError).toBe(true));
    expect(dead.result.current.error).toBeInstanceOf(ShareLinkExpiredError);
    expect((dead.result.current.error as ShareLinkExpiredError).reason).toBe("revoked");
    expect(hits).toBe(2); // no retry of a 4xx
    // idle without a token
    const idle = renderHook(() => useShareLink(undefined), { wrapper });
    expect(idle.result.current.fetchStatus).toBe("idle");
  });

  it("keys sit under the sharing family", () => {
    expect(queryKeys.members("ws_1").slice(0, 2)).toEqual(queryKeys.sharing());
    expect(queryKeys.grants({ type: "document", id: "d" }).slice(0, 2)).toEqual(queryKeys.sharing());
    expect(queryKeys.myInvitations().slice(0, 2)).toEqual(queryKeys.sharing());
    expect(queryKeys.shareLink("t").slice(0, 2)).not.toEqual(queryKeys.sharing());
  });
});
