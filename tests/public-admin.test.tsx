// @vitest-environment happy-dom
/**
 * B18 client: every new route method (path, query, body) and the hooks. Fake-network-only (the real API is
 * covered by screenwriter_api's own tests/public-admin.test.ts).
 */
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import {
  ClientOutdatedError,
  ScreenwriterClient,
  ScreenwriterClientProvider,
  apiErrorFrom,
  readRequestBody,
  useAdminJobs,
  useAdminUser,
  useDeepHealth,
  useNamesDb,
  usePublicConfig,
  usePublicTemplates,
  type NetworkClient,
  type NetworkRequest,
  type NetworkResponse,
} from "../src";

const enc = (v: unknown) => new TextEncoder().encode(JSON.stringify(v));
const ok = (data: unknown, status = 200): NetworkResponse => ({ status, headers: {}, body: enc({ success: true, data }) });

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

describe("B18 client methods", () => {
  it("public: config, templates, names-db, deep health, watermarked download — no Authorization header", async () => {
    const { network, sent } = scripted([
      ok({ aiConsentVersion: 1, minClientVersion: { web: "0.0.0" } }),
      ok([{ id: "tpl_1", scope: "builtin", builtinKey: "screenplay-standard" }]),
      ok({ id: "tpl_1", key: "screenplay-standard" }),
      ok({ version: 1, names: [] }),
      ok({ db: "ok", storage: "unconfigured", ai: "unconfigured", email: "unconfigured" }),
      ok({ documentTitle: "T", senderName: "S", url: "https://x/file", expiresAt: "2026-01-01T00:00:00Z" }),
    ]);
    const client = clientFor(network);
    await client.getPublicConfig();
    await client.listPublicTemplates("feature");
    await client.getPublicTemplate("screenplay-standard");
    await client.getNamesDb(1);
    await client.getDeepHealth();
    await client.getWatermarkedDownload("exp_1", "tok_1");
    expect(pathOf(sent[0]!)).toBe("/public/config");
    expect(pathOf(sent[1]!)).toBe("/public/templates?category=feature");
    expect(pathOf(sent[2]!)).toBe("/public/templates/screenplay-standard");
    expect(pathOf(sent[3]!)).toBe("/public/names-db/1");
    expect(pathOf(sent[4]!)).toBe("/public/health/deep");
    expect(pathOf(sent[5]!)).toBe("/public/watermarked/exp_1/tok_1");
    for (const s of sent) expect(s.req.headers?.Authorization).toBeUndefined();
  });

  it("redeemPurchaseHandoff, sendTelemetry (sends the bearer, never throws)", async () => {
    const { network, sent } = scripted([ok({ customToken: "ct_1" }), ok({ accepted: true })]);
    const client = clientFor(network);
    const redeemed = await client.redeemPurchaseHandoff({ token: "h_1" });
    expect(redeemed.customToken).toBe("ct_1");
    expect(sent[0]!.req.headers?.Authorization).toBeUndefined();
    const tele = await client.sendTelemetry({ events: [{ name: "doc.opened", ts: "2026-01-01T00:00:00Z" }] });
    expect(tele.accepted).toBe(true);
    expect(sent[1]!.req.headers?.Authorization).toBe("Bearer tok");

    const broken = clientFor({ request: async () => { throw new Error("network down"); } });
    expect(await broken.sendTelemetry({ events: [] })).toEqual({ accepted: false });
  });

  it("admin methods: users, jobs, job-kinds, document meta", async () => {
    const { network, sent } = scripted([
      ok({ id: "b18-u1", email: "u1@x.co" }),
      ok({ restored: true }),
      ok({ deletionScheduledFor: "2026-01-01T00:00:00Z" }),
      ok([]),
      ok({ id: "job_1", status: "queued" }),
      ok({ refundedCredits: 40, balance: 60 }),
      ok({ kind: "test.echo", enabled: true, maxAttempts: 3 }),
      ok({ id: "doc_1", title: "T" }),
    ]);
    const client = clientFor(network);
    await client.adminLookupUser("u1@x.co");
    await client.adminRestoreUser("b18-u1");
    await client.adminPurgeUser("b18-u1");
    await client.adminListJobs({ status: "failed" });
    await client.adminRetryJob("job_1");
    await client.adminRefundJob("job_1", { credits: 40 });
    await client.adminUpdateJobKind("test.echo", { maxAttempts: 3 });
    await client.adminGetDocumentMeta("doc_1");
    expect(pathOf(sent[0]!)).toBe("/admin/users?email=u1%40x.co");
    expect(pathOf(sent[1]!)).toBe("/admin/users/b18-u1/restore");
    expect(sent[1]!.req.method).toBe("POST");
    expect(pathOf(sent[2]!)).toBe("/admin/users/b18-u1");
    expect(sent[2]!.req.method).toBe("DELETE");
    expect(pathOf(sent[3]!)).toBe("/admin/jobs?status=failed");
    expect(pathOf(sent[4]!)).toBe("/admin/jobs/job_1/retry");
    expect(pathOf(sent[5]!)).toBe("/admin/jobs/job_1/refund");
    expect(sent[5]!.body).toEqual({ credits: 40 });
    expect(pathOf(sent[6]!)).toBe("/admin/job-kinds/test.echo");
    expect(sent[6]!.req.method).toBe("PATCH");
    expect(pathOf(sent[7]!)).toBe("/admin/documents/doc_1/meta");
  });

  it("ClientOutdatedError: CLIENT_TOO_OLD maps to it, with minVersion from details", () => {
    const e = apiErrorFrom("too old", "CLIENT_TOO_OLD", 426, { minVersion: "2.0.0" });
    expect(e).toBeInstanceOf(ClientOutdatedError);
    expect((e as ClientOutdatedError).minVersion).toBe("2.0.0");
  });
});

describe("B18 hooks", () => {
  const setup = (network: NetworkClient) => {
    const client = clientFor(network);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children?: ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, createElement(ScreenwriterClientProvider, { client, children }));
    return { client, qc, wrapper };
  };

  it("usePublicConfig, usePublicTemplates, useNamesDb, useDeepHealth", async () => {
    const { network } = scripted([
      ok({ aiConsentVersion: 1 }),
      ok([{ id: "tpl_1", scope: "builtin", builtinKey: "k" }]),
      ok({ version: 1, names: [] }),
      ok({ db: "ok", storage: "unconfigured", ai: "unconfigured", email: "unconfigured" }),
    ]);
    const { wrapper } = setup(network);
    const config = renderHook(() => usePublicConfig(), { wrapper });
    await waitFor(() => expect(config.result.current.data?.aiConsentVersion).toBe(1));
    const templates = renderHook(() => usePublicTemplates(), { wrapper });
    await waitFor(() => expect(templates.result.current.data?.length).toBe(1));
    const names = renderHook(() => useNamesDb(1), { wrapper });
    await waitFor(() => expect(names.result.current.data?.version).toBe(1));
    const health = renderHook(() => useDeepHealth(), { wrapper });
    await waitFor(() => expect(health.result.current.data?.db).toBe("ok"));
  });

  it("useAdminUser, useAdminJobs (only enabled with an email / at all times for jobs)", async () => {
    const { network } = scripted([ok({ id: "b18-u1", email: "u1@x.co" }), ok([])]);
    const { wrapper } = setup(network);
    const user = renderHook(() => useAdminUser("u1@x.co"), { wrapper });
    await waitFor(() => expect(user.result.current.data?.id).toBe("b18-u1"));
    const jobs = renderHook(() => useAdminJobs(), { wrapper });
    await waitFor(() => expect(jobs.result.current.isSuccess).toBe(true));
  });
});
