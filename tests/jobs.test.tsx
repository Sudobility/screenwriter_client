// @vitest-environment happy-dom
/**
 * B9 client: the request funnel (Idempotency-Key, X-Client, gzip, retry policy of spec 10 §2.4), the job methods and hooks.
 * Everything runs against a fake NetworkClient; the real API is in jobs-integration.test.ts.
 */
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import {
  ApiError,
  DEFAULT_RETRY,
  JobKindDisabledError,
  PayloadTooLargeError,
  RateLimitedError,
  ScreenwriterClient,
  ScreenwriterClientProvider,
  isRetryable,
  jobPollInterval,
  parseRetryAfter,
  readRequestBody,
  resolveRetry,
  retryDelayMs,
  useCancelJob,
  useCreateJob,
  useJob,
  useJobs,
  type NetworkClient,
  type NetworkRequest,
  type NetworkResponse,
} from "../src";
import type { Job } from "@sudobility/screenwriter_types";

const enc = (v: unknown) => new TextEncoder().encode(JSON.stringify(v));
const ok = (data: unknown, status = 200, headers: Record<string, string> = {}): NetworkResponse => ({ status, headers, body: enc({ success: true, data }) });
const fail = (status: number, code: string, headers: Record<string, string> = {}, details?: object): NetworkResponse => ({
  status,
  headers,
  body: enc({ success: false, error: code, code, ...(details ? { details } : {}) }),
});
const job = (over: Partial<Job> = {}): Job => ({
  id: "job_1",
  kind: "test.echo",
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

interface Sent {
  req: NetworkRequest;
  body: unknown;
}
/** A network whose responses come from a script (one entry per request, an Error means a transport failure). */
function scripted(script: Array<NetworkResponse | Error | ((req: NetworkRequest) => NetworkResponse)>) {
  const sent: Sent[] = [];
  let i = 0;
  const network: NetworkClient = {
    async request(req) {
      const text = await readRequestBody(req);
      sent.push({ req, body: text ? JSON.parse(text) : undefined });
      const next = script[Math.min(i++, script.length - 1)]!;
      if (next instanceof Error) throw next;
      return typeof next === "function" ? next(req) : next;
    },
  };
  return { network, sent };
}

/** A client with instant sleeps that records every delay it was asked to wait. */
function clientFor(network: NetworkClient, extra: Partial<ConstructorParameters<typeof ScreenwriterClient>[0]> = {}) {
  const delays: number[] = [];
  let n = 0;
  const client = new ScreenwriterClient({
    network,
    baseUrl: "http://x",
    getToken: async () => "tok",
    retry: { sleep: async ms => void delays.push(ms), random: () => 0.5 },
    newIdempotencyKey: () => `key-${++n}`,
    ...extra,
  });
  return { client, delays };
}

describe("retry policy (pure)", () => {
  it("retries GET/PUT/DELETE always, POST only with a key, PATCH never", () => {
    for (const m of ["GET", "PUT", "DELETE"] as const) expect(isRetryable(m, false, 503)).toBe(true);
    expect(isRetryable("POST", false, 503)).toBe(false);
    expect(isRetryable("POST", true, 503)).toBe(true);
    expect(isRetryable("PATCH", true, 503)).toBe(false);
  });
  it("retries no response, 408, 429 RATE_LIMITED, 502, 503, 504; never the rest", () => {
    for (const s of [0, 408, 502, 503, 504]) expect(isRetryable("GET", false, s), String(s)).toBe(true);
    expect(isRetryable("GET", false, 429, "RATE_LIMITED")).toBe(true);
    expect(isRetryable("GET", false, 429, "QUOTA_EXCEEDED")).toBe(false);
    for (const s of [400, 401, 402, 403, 404, 409, 413, 415, 422, 500]) expect(isRetryable("GET", false, s), String(s)).toBe(false);
    expect(isRetryable("GET", false, 503, "AI_UNAVAILABLE")).toBe(false); // "not configured" will not fix itself
    expect(isRetryable("GET", false, 503, "CONFIG_MISSING")).toBe(false);
  });
  it("full jitter within min(max, base * 2^(attempt-1)); Retry-After replaces it on 429/503, capped at 60 s", () => {
    const p = resolveRetry({ random: () => 0.999 });
    expect(retryDelayMs(p, 1, 503)).toBeLessThan(400);
    expect(retryDelayMs(p, 2, 503)).toBeLessThan(800);
    expect(retryDelayMs(p, 10, 503)).toBeLessThan(8000);
    expect(retryDelayMs(resolveRetry({ random: () => 0 }), 3, 503)).toBe(0);
    expect(retryDelayMs(p, 1, 429, 2500)).toBe(2500);
    expect(retryDelayMs(p, 1, 503, 120_000)).toBe(60_000);
    expect(retryDelayMs(p, 1, 502, 2500)).toBeLessThan(400); // Retry-After only on 429/503
    expect(DEFAULT_RETRY.maxAttempts).toBe(3);
    expect(resolveRetry(false).maxAttempts).toBe(1);
  });
  it("parses Retry-After seconds and dates", () => {
    expect(parseRetryAfter("3")).toBe(3000);
    expect(parseRetryAfter(undefined)).toBeUndefined();
    expect(parseRetryAfter("soon")).toBeUndefined();
    const now = Date.parse("2026-01-01T00:00:00Z");
    expect(parseRetryAfter("Thu, 01 Jan 2026 00:00:10 GMT", now)).toBe(10_000);
  });
});

describe("request funnel", () => {
  it("sends X-Client and an Idempotency-Key on creates, none on reads; the key reaches the body of createJob", async () => {
    const { network, sent } = scripted([ok(job(), 202), ok([])]);
    const { client } = clientFor(network, { clientTag: "web/1.2.3" });
    await client.createJob({ kind: "test.echo", input: { text: "a" } });
    await client.listJobs({ kind: "ai.", status: "running" });
    const [post, get] = sent;
    expect(post!.req.headers).toMatchObject({ "X-Client": "web/1.2.3", "Idempotency-Key": "key-1", Authorization: "Bearer tok" });
    expect(post!.body).toEqual({ kind: "test.echo", input: { text: "a" }, idempotencyKey: "key-1" });
    expect(get!.req.headers?.["Idempotency-Key"]).toBeUndefined();
    expect(get!.req.url).toContain("/api/v1/jobs?kind=ai.&status=running");
  });

  it("uses the caller's idempotencyKey as the header too", async () => {
    const { network, sent } = scripted([ok(job(), 202)]);
    const { client } = clientFor(network);
    await client.createJob({ kind: "test.echo", idempotencyKey: "mine" });
    expect(sent[0]!.req.headers?.["Idempotency-Key"]).toBe("mine");
  });

  it("file-body and read-only POSTs carry no key (export, import, batch reads)", async () => {
    const { network, sent } = scripted([ok({})]);
    const { client } = clientFor(network);
    await client.getScenes("doc_1", ["el_a"]);
    await client.getElements("doc_1", ["el_a"]);
    await client.applyCommands("doc_1", { commands: [], baseEpoch: 0 }).catch(() => {});
    expect(sent[0]!.req.headers?.["Idempotency-Key"]).toBeUndefined();
    expect(sent[1]!.req.headers?.["Idempotency-Key"]).toBeUndefined();
    expect(sent[2]!.req.headers?.["Idempotency-Key"]).toBe("key-1"); // commands are worth deduping
  });

  it("gzips JSON bodies of 1 KiB and more, leaves small ones plain, honours gzip:false", async () => {
    const big = { kind: "test.echo" as const, input: { text: "x".repeat(2000) } };
    const { network, sent } = scripted([ok(job(), 202)]);
    const { client } = clientFor(network);
    await client.createJob(big);
    await client.createJob({ kind: "test.echo", input: { text: "s" } });
    expect(sent[0]!.req.headers).toMatchObject({ "Content-Encoding": "gzip", "Content-Type": "application/json" });
    expect(sent[0]!.req.body).toBeInstanceOf(Uint8Array);
    expect((sent[0]!.req.body as Uint8Array).length).toBeLessThan(500); // it really compressed
    expect((sent[0]!.body as { input: { text: string } }).input.text).toHaveLength(2000); // and round-trips
    expect(sent[1]!.req.headers?.["Content-Encoding"]).toBeUndefined();
    expect(typeof sent[1]!.req.body).toBe("string");
    const off = scripted([ok(job(), 202)]);
    await clientFor(off.network, { gzip: false }).client.createJob(big);
    expect(typeof off.sent[0]!.req.body).toBe("string");
  });

  it("retries a POST with the SAME key across attempts (network error, then 503, then success)", async () => {
    const { network, sent } = scripted([new Error("offline"), fail(503, "INTERNAL"), ok(job(), 202)]);
    const { client, delays } = clientFor(network);
    const j = await client.createJob({ kind: "test.echo" });
    expect(j.id).toBe("job_1");
    expect(sent).toHaveLength(3);
    expect(new Set(sent.map(s => s.req.headers?.["Idempotency-Key"]))).toEqual(new Set(["key-1"]));
    expect(delays).toEqual([200, 400]); // random() = 0.5 of 400 and 800
  });

  it("retries a GET on 502 and stops at maxAttempts with the last error", async () => {
    const { network, sent } = scripted([fail(502, "INTERNAL")]);
    const { client } = clientFor(network);
    const err = await client.getJob("job_1").catch(e => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(502);
    expect(sent).toHaveLength(3);
  });

  it("a transport failure that never recovers surfaces as NETWORK_ERROR", async () => {
    const { network, sent } = scripted([new Error("offline")]);
    const { client } = clientFor(network);
    const err = await client.getJob("job_1").catch(e => e);
    expect([err.code, err.status]).toEqual(["NETWORK_ERROR", 0]);
    expect(sent).toHaveLength(3);
  });

  it("never retries PATCH, a POST it did not key, or a non-retryable status", async () => {
    const a = scripted([fail(503, "INTERNAL")]);
    await clientFor(a.network).client.updateMe({}).catch(() => {});
    expect(a.sent).toHaveLength(1);
    const b = scripted([fail(503, "INTERNAL")]);
    await clientFor(b.network).client.getScenes("doc_1", ["el_a"]).catch(() => {}); // POST without key
    expect(b.sent).toHaveLength(1);
    for (const [status, code] of [[404, "NOT_FOUND"], [409, "JOB_FINISHED"], [403, "FORBIDDEN"], [413, "PAYLOAD_TOO_LARGE"], [429, "QUOTA_EXCEEDED"]] as const) {
      const c = scripted([fail(status, code)]);
      await clientFor(c.network).client.getJob("job_1").catch(() => {});
      expect(c.sent, `${status} ${code}`).toHaveLength(1);
    }
  });

  it("honours Retry-After on RATE_LIMITED, then throws RateLimitedError with retryAfterS and bucket", async () => {
    const limited = fail(429, "RATE_LIMITED", { "retry-after": "7" }, { bucket: "rest", retryAfterS: 7 });
    const { network, sent } = scripted([limited, limited, limited]);
    const { client, delays } = clientFor(network);
    const err = await client.getJob("job_1").catch(e => e);
    expect(err).toBeInstanceOf(RateLimitedError);
    expect([err.retryAfterS, err.bucket, err.status]).toEqual([7, "rest", 429]);
    expect(sent).toHaveLength(3);
    expect(delays).toEqual([7000, 7000]);
    // recovers when the window passes
    const ok2 = scripted([limited, ok(job())]);
    const c2 = clientFor(ok2.network);
    expect((await c2.client.getJob("job_1")).id).toBe("job_1");
    expect(c2.delays).toEqual([7000]);
  });

  it("takes retryAfterS from the header when the body has none", async () => {
    const { network } = scripted([fail(429, "RATE_LIMITED", { "retry-after": "3" })]);
    const err = await clientFor(network, { retry: false }).client.getJob("j").catch(e => e);
    expect(err).toBeInstanceOf(RateLimitedError);
    expect(err.retryAfterS).toBe(3);
  });

  it("retry:false makes exactly one attempt", async () => {
    const { network, sent } = scripted([fail(503, "INTERNAL")]);
    await clientFor(network, { retry: false }).client.getJob("job_1").catch(() => {});
    expect(sent).toHaveLength(1);
  });

  it("refreshes the token once on 401 without spending a retry attempt", async () => {
    const tokens: Array<boolean | undefined> = [];
    const { network, sent } = scripted([fail(401, "UNAUTHORIZED"), ok(job())]);
    const { client } = clientFor(network, { getToken: async f => (tokens.push(f), "tok") });
    await client.getJob("job_1");
    expect(sent).toHaveLength(2);
    expect(tokens).toEqual([false, true]);
    // a second 401 is final
    const dead = scripted([fail(401, "UNAUTHORIZED")]);
    const err = await clientFor(dead.network).client.getJob("job_1").catch(e => e);
    expect(err.status).toBe(401);
    expect(dead.sent).toHaveLength(2);
  });

  it("maps typed errors", async () => {
    const dis = await clientFor(scripted([fail(501, "JOB_KIND_DISABLED", {}, { kind: "video.generate" })]).network).client.createJob({ kind: "video.generate" }).catch(e => e);
    expect(dis).toBeInstanceOf(JobKindDisabledError);
    expect(dis.kind).toBe("video.generate");
    const big = await clientFor(scripted([fail(413, "PAYLOAD_TOO_LARGE")]).network).client.createJob({ kind: "test.echo" }).catch(e => e);
    expect(big).toBeInstanceOf(PayloadTooLargeError);
  });
});

describe("job methods hit the documented routes", () => {
  it("list, get (wait), create, cancel, outputs, recipients", async () => {
    const { network, sent } = scripted([ok([]), ok(job()), ok(job(), 202), ok(job({ status: "cancelled" })), ok({ outputs: [] }), ok([])]);
    const { client } = clientFor(network);
    await client.listJobs({ documentId: "doc_1", limit: 5 });
    await client.getJob("job/1", { wait: 30 });
    await client.createJob({ kind: "test.echo", dryRun: false });
    await client.cancelJob("job_1");
    await client.getJobOutputs("job_1");
    await client.listJobRecipients("job_1");
    expect(sent.map(s => `${s.req.method} ${s.req.url.replace("http://x/api/v1", "")}`)).toEqual([
      "GET /jobs?documentId=doc_1&limit=5",
      "GET /jobs/job%2F1?wait=30",
      "POST /jobs",
      "POST /jobs/job_1/cancel",
      "GET /jobs/job_1/outputs",
      "GET /jobs/job_1/recipients",
    ]);
  });
});

describe("job hooks", () => {
  const setup = (network: NetworkClient) => {
    const { client } = clientFor(network);
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children?: ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, createElement(ScreenwriterClientProvider, { client, children }));
    return { client, qc, wrapper };
  };

  it("jobPollInterval: 1 s at first, 5 s later, stop when terminal", () => {
    expect(jobPollInterval(undefined, 0)).toBe(1000);
    expect(jobPollInterval(job({ status: "queued" }), 3)).toBe(1000);
    expect(jobPollInterval(job({ status: "running" }), 29)).toBe(1000);
    expect(jobPollInterval(job({ status: "running" }), 30)).toBe(5000);
    for (const status of ["succeeded", "failed", "cancelled"] as const) expect(jobPollInterval(job({ status }), 0)).toBe(false);
  });

  it("useJob polls while queued/running and stops after the terminal status", async () => {
    let reads = 0;
    const statuses: Job["status"][] = ["queued", "running", "succeeded"];
    const network: NetworkClient = {
      async request() {
        return ok(job({ status: statuses[Math.min(reads++, statuses.length - 1)]! }));
      },
    };
    const { wrapper } = setup(network);
    const { result } = renderHook(() => useJob("job_1"), { wrapper });
    await waitFor(() => expect(result.current.data?.status).toBe("succeeded"), { timeout: 6000 });
    const settled = reads;
    expect(settled).toBe(3);
    await act(async () => new Promise(r => setTimeout(r, 1300)));
    expect(reads).toBe(settled); // stopped polling
  }, 12000);

  it("useJob is idle without an id; useJobs lists; create and cancel update the cache", async () => {
    const calls: string[] = [];
    const network: NetworkClient = {
      async request(req) {
        const path = new URL(req.url).pathname.replace("/api/v1", "");
        calls.push(`${req.method} ${path}`);
        if (req.method === "POST" && path === "/jobs") return ok(job({ id: "job_9" }), 202);
        if (path.endsWith("/cancel")) return ok(job({ id: "job_9", status: "cancelled", cancelRequested: false }));
        if (path === "/jobs") return ok([job()]);
        return ok(job({ id: "job_9", status: "queued" }));
      },
    };
    const { wrapper, qc } = setup(network);
    renderHook(() => useJob(undefined), { wrapper });
    expect(calls).toEqual([]);
    const list = renderHook(() => useJobs({ kind: "test." }), { wrapper });
    await waitFor(() => expect(list.result.current.data?.data!).toHaveLength(1));
    const create = renderHook(() => useCreateJob(), { wrapper });
    await act(async () => void (await create.result.current.mutateAsync({ kind: "test.echo" })));
    expect(qc.getQueryData<Job>(["screenwriter", "jobs", "detail", "job_9"])?.status).toBe("queued");
    expect(calls.filter(c => c === "GET /jobs").length).toBe(2); // the create invalidated the list
    const cancel = renderHook(() => useCancelJob(), { wrapper });
    await act(async () => void (await cancel.result.current.mutateAsync("job_9")));
    expect(qc.getQueryData<Job>(["screenwriter", "jobs", "detail", "job_9"])?.status).toBe("cancelled");
  });
});
