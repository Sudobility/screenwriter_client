// @vitest-environment happy-dom
/**
 * B17 client: every new route method (path, query, body) and the hooks. Fake-network-only, matching B12's
 * precedent (see notifications.test.tsx) — the real API is covered by screenwriter_api's own tests, plus
 * `tests/jobs-integration.test.ts`'s "AI job is the same job through /jobs and /ai/jobs" case here.
 */
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import {
  ScreenwriterClient,
  ScreenwriterClientProvider,
  readRequestBody,
  useAcceptAiConsent,
  useAiConsent,
  useAiEstimate,
  useAiReport,
  useAiReports,
  useConvertAiNote,
  useCreatePurchaseHandoff,
  useCreditProducts,
  useCreditPurchases,
  useCreditUsages,
  useCreditsBalance,
  useMyAiActivity,
  useWorkspaceAiActivity,
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

describe("B17 client methods", () => {
  it("consent: get and accept", async () => {
    const { network, sent } = scripted([ok({ currentVersion: 1, acceptedVersion: null, acceptedAt: null }), ok({ acceptedVersion: 1, acceptedAt: "2026-01-01T00:00:00Z" })]);
    const client = clientFor(network);
    await client.getAiConsent();
    await client.acceptAiConsent({ version: 1 });
    expect(pathOf(sent[0]!)).toBe("/me/ai-consents");
    expect(sent[1]!).toMatchObject({ req: { method: "POST" }, body: { version: 1 } });
  });

  it("estimate, activity (me and workspace), reports list/get, note convert", async () => {
    const { network, sent } = scripted([
      ok({ credits: 40, basis: { pages: 80 }, withinLimit: true, balance: 100 }),
      ok([]),
      ok([]),
      ok([{ jobId: "job_1", task: "coverage", status: "succeeded", createdAt: "x", finishedAt: "y" }]),
      ok({ logline: "L", summary: "S", genre: [], verdict: "consider", verdictRationale: "", strengths: [], weaknesses: [], notesByScene: [], stats: { scenes: 1, chunks: 1, droppedItems: 0 } }),
      ok({ scriptNoteId: "note_1" }),
    ]);
    const client = clientFor(network);
    await client.estimateAiJob("doc_1", { task: "coverage" });
    await client.listMyAiActivity({ documentId: "doc_1" });
    await client.listWorkspaceAiActivity("ws_1", { userId: "u1" });
    await client.listAiReports("doc_1");
    await client.getAiReport("doc_1", "job_1");
    await client.convertAiNote("doc_1", "job_1", "strengths:0");
    expect(pathOf(sent[0]!)).toBe("/documents/doc_1/ai/estimate");
    expect(sent[0]!.req.method).toBe("POST");
    expect(pathOf(sent[1]!)).toBe("/me/ai-activity?documentId=doc_1");
    expect(pathOf(sent[2]!)).toBe("/entities/ws_1/ai-activity?userId=u1");
    expect(pathOf(sent[3]!)).toBe("/documents/doc_1/ai/reports");
    expect(pathOf(sent[4]!)).toBe("/documents/doc_1/ai/reports/job_1");
    expect(pathOf(sent[5]!)).toBe("/documents/doc_1/ai/reports/job_1/notes/strengths%3A0/convert");
    expect(sent[5]!.req.method).toBe("POST");
  });

  it("decideSuggestions", async () => {
    const { network, sent } = scripted([ok({ accepted: ["sug_1"], rejected: [], skippedStale: [], skippedConflicted: [], autoSnapshotId: null, epoch: 3 })]);
    const client = clientFor(network);
    const r = await client.decideSuggestions("sset_1", { accept: "allPending", reject: [] });
    expect(pathOf(sent[0]!)).toBe("/ai/suggestion-sets/sset_1/decide");
    expect(sent[0]!.body).toEqual({ accept: "allPending", reject: [] });
    expect(r.accepted).toEqual(["sug_1"]);
  });

  it("credits: balance, purchases, usages, products (no auth header), purchase handoff", async () => {
    const { network, sent } = scripted([
      ok({ balance: 60, initial_credits: 100 }),
      ok([{ id: 1, credits: 100, source: "free", transaction_ref_id: null, product_id: null, price_cents: null, currency: null, created_at: "x" }]),
      ok([{ id: 1, credits: 40, reference: "job:job_1", filename: null, created_at: "x" }]),
      ok([{ productId: "fadewright_credits_500", credits: 500 }]),
      ok({ handoffUrl: "https://app.example/credits/buy?h=tok", expiresAt: "2026-01-01T00:00:00Z" }),
    ]);
    const client = clientFor(network);
    await client.getCreditsBalance();
    await client.listCreditPurchases({ limit: 5 });
    await client.listCreditUsages();
    await client.listCreditProducts();
    await client.createPurchaseHandoff({ returnTo: "fadewright://credits" });
    expect(pathOf(sent[0]!)).toBe("/consumables/balance");
    expect(pathOf(sent[1]!)).toBe("/consumables/purchases?limit=5");
    expect(pathOf(sent[2]!)).toBe("/consumables/usages");
    expect(pathOf(sent[3]!)).toBe("/consumables/products");
    expect(sent[3]!.req.headers?.Authorization).toBeUndefined(); // "none" auth mode: works signed out
    expect(pathOf(sent[4]!)).toBe("/purchases/handoff");
  });
});

describe("B17 hooks", () => {
  const setup = (network: NetworkClient) => {
    const client = clientFor(network);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children?: ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, createElement(ScreenwriterClientProvider, { client, children }));
    return { client, qc, wrapper };
  };

  it("useAiConsent, useAcceptAiConsent invalidates it", async () => {
    const { network } = scripted([
      ok({ currentVersion: 1, acceptedVersion: null, acceptedAt: null }),
      ok({ acceptedVersion: 1, acceptedAt: "2026-01-01T00:00:00Z" }),
      ok({ currentVersion: 1, acceptedVersion: 1, acceptedAt: "2026-01-01T00:00:00Z" }),
    ]);
    const { wrapper } = setup(network);
    const consent = renderHook(() => useAiConsent(), { wrapper });
    await waitFor(() => expect(consent.result.current.data?.acceptedVersion).toBeNull());
    const accept = renderHook(() => useAcceptAiConsent(), { wrapper });
    accept.result.current.mutate({ version: 1 });
    await waitFor(() => expect(accept.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(consent.result.current.data?.acceptedVersion).toBe(1));
  });

  it("useAiEstimate is a mutation (not cached: depends on the live balance)", async () => {
    const { network } = scripted([ok({ credits: 40, basis: { pages: 80 }, withinLimit: true, balance: 60 })]);
    const { wrapper } = setup(network);
    const est = renderHook(() => useAiEstimate("doc_1"), { wrapper });
    est.result.current.mutate({ task: "coverage" });
    await waitFor(() => expect(est.result.current.data?.credits).toBe(40));
  });

  it("useMyAiActivity, useWorkspaceAiActivity", async () => {
    const { network } = scripted([ok([]), ok([])]);
    const { wrapper } = setup(network);
    const mine = renderHook(() => useMyAiActivity(), { wrapper });
    await waitFor(() => expect(mine.result.current.isSuccess).toBe(true));
    const ws = renderHook(() => useWorkspaceAiActivity("ws_1"), { wrapper });
    await waitFor(() => expect(ws.result.current.isSuccess).toBe(true));
  });

  it("useAiReports, useAiReport, useConvertAiNote", async () => {
    const report = { logline: "L", summary: "S", genre: [], verdict: "consider", verdictRationale: "", strengths: [], weaknesses: [], notesByScene: [], stats: { scenes: 1, chunks: 1, droppedItems: 0 } };
    const { network } = scripted([ok([{ jobId: "job_1", task: "coverage", status: "succeeded", createdAt: "x", finishedAt: "y" }]), ok(report), ok({ scriptNoteId: "note_1" })]);
    const { wrapper } = setup(network);
    const list = renderHook(() => useAiReports("doc_1"), { wrapper });
    await waitFor(() => expect(list.result.current.data?.data!.length).toBe(1));
    const one = renderHook(() => useAiReport("doc_1", "job_1"), { wrapper });
    await waitFor(() => expect(one.result.current.data?.logline).toBe("L"));
    const convert = renderHook(() => useConvertAiNote("doc_1"), { wrapper });
    convert.result.current.mutate({ jobId: "job_1", noteId: "strengths:0" });
    await waitFor(() => expect(convert.result.current.data?.scriptNoteId).toBe("note_1"));
  });

  it("useCreditsBalance, useCreditPurchases, useCreditUsages, useCreditProducts, useCreatePurchaseHandoff", async () => {
    // Several of these hooks' queries fire concurrently, so the fake network must answer by path, not by call order.
    const network: NetworkClient = {
      async request(req) {
        const path = new URL(req.url).pathname.replace("/api/v1", "");
        if (path === "/consumables/balance") return ok({ balance: 60, initial_credits: 100 });
        if (path === "/consumables/purchases") return ok([]);
        if (path === "/consumables/usages") return ok([]);
        if (path === "/consumables/products") return ok([{ productId: "p1", credits: 500 }]);
        if (path === "/purchases/handoff") return ok({ handoffUrl: "https://x/credits/buy?h=t", expiresAt: "2026-01-01T00:00:00Z" });
        throw new Error(`unexpected request: ${path}`);
      },
    };
    const { wrapper } = setup(network);
    const balance = renderHook(() => useCreditsBalance(), { wrapper });
    await waitFor(() => expect(balance.result.current.data?.balance).toBe(60));
    renderHook(() => useCreditPurchases(), { wrapper });
    renderHook(() => useCreditUsages(), { wrapper });
    const products = renderHook(() => useCreditProducts(), { wrapper });
    await waitFor(() => expect(products.result.current.data?.length).toBe(1));
    const handoff = renderHook(() => useCreatePurchaseHandoff(), { wrapper });
    handoff.result.current.mutate({ returnTo: "fadewright://credits" });
    await waitFor(() => expect(handoff.result.current.isSuccess).toBe(true));
  });
});
