/**
 * B9 against the REAL screenwriter_api (spawned under Bun, dev auth, `screenwriter_test`): jobs end to end through the
 * client, gzip bodies, Idempotency-Key replay after a lost response (the retry policy's reason to exist), typed errors
 * and the rate limit with Retry-After. A second server with tiny limits proves RATE_LIMITED.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn, type ChildProcess } from "node:child_process";
import { AI_CONSENT_VERSION } from "@sudobility/screenwriter_types";
import {
  ApiError,
  JobKindDisabledError,
  RateLimitedError,
  ScreenwriterClient,
  createFetchNetworkClient,
  type NetworkClient,
} from "../src";

const API_DIR = new URL("../../screenwriter_api/", import.meta.url).pathname;
const PORT = 19900 + Math.floor(Math.random() * 40);
const LIMITED_PORT = PORT + 50;
const servers: ChildProcess[] = [];

async function boot(port: number, extra: Record<string, string> = {}) {
  const s = spawn("bun", ["run", "src/index.ts"], {
    cwd: API_DIR,
    env: {
      ...process.env,
      PORT: String(port),
      DATABASE_URL: "postgres://localhost:5432/screenwriter_test",
      PUBLIC_APP_URL: "http://localhost:5143",
      AI_TEST_MODE: "1",
      LOG_LEVEL: "error",
      JOB_POLL_MS: "50",
      ...extra,
    },
    stdio: "ignore",
  });
  servers.push(s);
  for (let i = 0; i < 200; i++) {
    try {
      if ((await fetch(`http://localhost:${port}/health`)).ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error("API did not start");
}

const make = (port: number, uid: string, over: Partial<ConstructorParameters<typeof ScreenwriterClient>[0]> = {}) =>
  new ScreenwriterClient({
    network: createFetchNetworkClient(),
    baseUrl: `http://localhost:${port}`,
    getToken: async () => `dev:${uid}:${uid}@x.co`,
    clientTag: "web/test",
    ...over,
  });

const uid = `jc-${Date.now().toString(36)}`;
const rest = () => make(PORT, uid);

async function until<T>(fn: () => Promise<T>, done: (v: T) => boolean, ms = 10000): Promise<T> {
  const t0 = Date.now();
  for (;;) {
    const v = await fn();
    if (done(v)) return v;
    if (Date.now() - t0 > ms) throw new Error("timeout");
    await new Promise(r => setTimeout(r, 50));
  }
}

beforeAll(async () => {
  await boot(PORT);
  await boot(LIMITED_PORT, { RATE_LIMIT_MULTIPLIER: "0.1" }); // default bucket: 60/min, burst 12
  await rest().me(); // dev-auth users exist once /me has run (jobs.user_id is a foreign key)
}, 60000);

afterAll(async () => {
  for (const s of servers) {
    const exited = new Promise(r => s.once("exit", r));
    s.kill("SIGTERM");
    await exited;
  }
});

describe("jobs through the client against the real API", () => {
  it("runs a job: create, long-poll, outputs, list", async () => {
    const c = rest();
    const created = await c.createJob({ kind: "test.echo", input: { text: "hi", steps: 2, delayMs: 30, output: true } });
    expect(created).toMatchObject({ kind: "test.echo", status: "queued" });
    const done = await until(() => c.getJob(created.id, { wait: 5 }), j => j.status === "succeeded");
    expect(done.progress.fraction).toBe(1);
    const out = await c.getJobOutputs(created.id);
    expect(out.outputs[0]!.url).toBe(`data:text/plain;base64,${btoa("hi")}`);
    const list = await c.listJobs({ kind: "test.", limit: 50 });
    expect(list.data!.some(j => j.id === created.id)).toBe(true);
    expect(await c.createJob({ kind: "test.echo", dryRun: true })).toEqual({ estimate: { credits: 0, billable: false } });
  });

  it("a caller-chosen idempotencyKey replays the job; a changed input is IDEMPOTENCY_KEY_REUSED", async () => {
    const c = rest();
    const key = `k-${Date.now()}`;
    const a = await c.createJob({ kind: "test.echo", input: { text: "same" }, idempotencyKey: key });
    const b = await c.createJob({ kind: "test.echo", input: { text: "same" }, idempotencyKey: key });
    expect(b.id).toBe(a.id);
    const err = await c.createJob({ kind: "test.echo", input: { text: "different" }, idempotencyKey: key }).catch(e => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("IDEMPOTENCY_KEY_REUSED");
  });

  it("a lost response is retried with the same key and creates exactly one job", async () => {
    const inner = createFetchNetworkClient();
    let dropped = 0;
    const lossy: NetworkClient = {
      async request(req) {
        const res = await inner.request(req); // the server saw and processed it...
        if (req.method === "POST" && req.url.endsWith("/jobs") && dropped++ === 0) throw new Error("connection reset"); // ...the answer never arrived
        return res;
      },
    };
    const c = make(PORT, uid, { network: lossy, retry: { sleep: async () => {} } });
    const text = `lost-${Date.now()}`;
    const job = await c.createJob({ kind: "test.echo", input: { text } });
    expect(dropped).toBe(2); // the first answer was lost, the retry got the stored one
    await until(() => c.getJob(job.id), j => j.status === "succeeded");
    const mine = (await c.listJobs({ kind: "test.echo", limit: 200 })).data!.filter(j => j.requestSummary.text === text);
    expect(mine).toHaveLength(1);
  });

  it("gzips a large JSON body and the server understands it", async () => {
    const c = rest();
    const j = await c.createJob({ kind: "test.echo", input: { text: "g".repeat(1000), pad: "p".repeat(400) } as never });
    const done = await until(() => c.getJob(j.id), x => x.status === "succeeded");
    expect(done.requestSummary.text).toBeUndefined(); // > 80 chars: dropped from the summary, but the job ran
    expect(done.status).toBe("succeeded");
  });

  it("disabled and resource-route kinds are typed errors", async () => {
    const c = rest();
    const disabled = await c.createJob({ kind: "video.generate" }).catch(e => e);
    expect(disabled).toBeInstanceOf(JobKindDisabledError);
    expect(disabled.status).toBe(501);
    expect((await c.createJob({ kind: "export.pdf" }).catch(e => e)).code).toBe("JOB_KIND_NOT_GENERIC");
  });

  it("cancels a running job", async () => {
    const c = rest();
    const j = await c.createJob({ kind: "test.echo", input: { steps: 50, delayMs: 200 } });
    await until(() => c.getJob(j.id), x => x.status === "running");
    expect((await c.cancelJob(j.id)).cancelRequested).toBe(true);
    const done = await until(() => c.getJob(j.id), x => x.status === "cancelled");
    expect(done.outputs).toEqual([]);
    expect((await c.cancelJob(j.id).catch(e => e)).code).toBe("JOB_FINISHED");
  });

  it("an AI job is the same job through /jobs and /ai/jobs (D21a)", async () => {
    const c = rest();
    const me = await c.me();
    const project = await c.createProject(me.personalEntityId, { name: `jobs ${Date.now()}` });
    const doc = await c.createDocument(project.id, { title: "T", kind: "script" });
    await c.acceptAiConsent({ version: AI_CONSENT_VERSION }); // B17: AI job creation needs consent (spec 06 §9.3 gate 3)
    const started = await c.startAiJob(doc.id, { task: "coverage" });
    const viaJobs = await until(() => c.getJob(started.jobId), j => j.status === "succeeded" || j.status === "failed");
    expect(viaJobs).toMatchObject({ id: started.jobId, kind: "ai.review", subkind: "coverage" });
    expect((await c.getAiJob(started.jobId)).status).toBe(viaJobs.status);
    expect((await c.listJobs({ kind: "ai." })).data!.some(j => j.id === started.jobId)).toBe(true);
  });
});

describe("rate limits", () => {
  it("RATE_LIMITED carries Retry-After, is retried by policy and surfaces as RateLimitedError after exhaustion", async () => {
    const delays: number[] = [];
    const c = make(LIMITED_PORT, `${uid}-rl`, { retry: { sleep: async ms => void delays.push(ms) } });
    await c.me();
    let err: unknown = null;
    for (let i = 0; i < 40 && !err; i++) err = await c.listJobs().then(() => null, e => e);
    expect(err).toBeInstanceOf(RateLimitedError);
    const rl = err as RateLimitedError;
    expect(rl.status).toBe(429);
    expect(rl.bucket).toBe("rest");
    expect(rl.retryAfterS).toBeGreaterThanOrEqual(1);
    expect(delays.length).toBeGreaterThanOrEqual(2);
    expect(delays.slice(-2).every(d => d >= 1000)).toBe(true); // Retry-After honoured (seconds -> ms)
    // another user is unaffected
    await make(LIMITED_PORT, `${uid}-other`).me();
  });
});
