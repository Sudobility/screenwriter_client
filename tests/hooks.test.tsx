// @vitest-environment happy-dom
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import {
  ScreenwriterClient,
  ScreenwriterClientProvider,
  useCreateProject,
  useProjects,
  type NetworkClient,
} from "../src";

/** In-memory fake API: proves hooks hit the injected NetworkClient and invalidate the list on create. */
function fakeNetwork() {
  const projects: Array<{ id: string; name: string }> = [];
  const calls: string[] = [];
  const network: NetworkClient = {
    async request(req) {
      calls.push(`${req.method} ${new URL(req.url).pathname}`);
      const json = (status: number, data: unknown) => ({
        status,
        headers: {},
        body: new TextEncoder().encode(JSON.stringify({ success: true, data })),
      });
      if (req.method === "POST") {
        const p = { id: `prj_${projects.length + 1}`, ...JSON.parse((req.body as string | undefined) ?? "{}") };
        projects.push(p);
        return json(201, p);
      }
      return json(200, [...projects]);
    },
  };
  return { network, calls };
}

describe("hooks", () => {
  it("creating a project refreshes the project list", async () => {
    const { network, calls } = fakeNetwork();
    const client = new ScreenwriterClient({ network, baseUrl: "http://x", getToken: async () => "t" });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children?: ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, createElement(ScreenwriterClientProvider, { client, children }));

    const list = renderHook(() => useProjects("ws_1"), { wrapper });
    await waitFor(() => expect(list.result.current.data?.data!).toEqual([]));
    const create = renderHook(() => useCreateProject("ws_1"), { wrapper });
    create.result.current.mutate({ name: "Alpha" });
    await waitFor(() => expect(list.result.current.data?.data!.map(p => p.name)).toEqual(["Alpha"]));
    expect(calls).toEqual([
      "GET /api/v1/entities/ws_1/projects",
      "POST /api/v1/entities/ws_1/projects",
      "GET /api/v1/entities/ws_1/projects",
    ]);
  });
});

describe("AI hooks", () => {
  it("useAiJob polls until the job is terminal, then stops; acceptSuggestions surfaces CONTENT_CHANGED", async () => {
    const { useAiJob, useAcceptSuggestions, isApiError } = await import("../src");
    let polls = 0;
    const network: NetworkClient = {
      async request(req) {
        const path = new URL(req.url).pathname;
        const env = (status: number, body: object) => ({ status, headers: {}, body: new TextEncoder().encode(JSON.stringify(body)) });
        if (path.endsWith("/accept"))
          return env(409, { success: false, error: "changed", code: "CONTENT_CHANGED", details: { suggestionIds: ["sug_1"] } });
        polls++;
        return env(200, { success: true, data: { id: "job_1", status: polls < 3 ? "running" : "succeeded" } });
      },
    };
    const client = new ScreenwriterClient({ network, baseUrl: "http://x", getToken: async () => "t" });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children?: ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, createElement(ScreenwriterClientProvider, { client, children }));
    const job = renderHook(() => useAiJob("job_1", 20), { wrapper });
    await waitFor(() => expect(job.result.current.data?.status).toBe("succeeded"));
    const seen = polls;
    await new Promise(r => setTimeout(r, 120));
    expect(polls).toBe(seen);

    const accept = renderHook(() => useAcceptSuggestions("doc_1", "sset_1"), { wrapper });
    accept.result.current.mutate(["sug_1"]);
    await waitFor(() => expect(accept.result.current.isError).toBe(true));
    const err = accept.result.current.error;
    expect(isApiError(err) && err.code).toBe("CONTENT_CHANGED");
    expect(isApiError(err) && err.details?.suggestionIds).toEqual(["sug_1"]);
  });
});

describe("API key hooks", () => {
  it("useCreateApiKey returns the one-time key and refreshes the list, which never carries it", async () => {
    const { useApiKeys, useCreateApiKey, useRevokeApiKey } = await import("../src");
    const rows: Array<Record<string, unknown>> = [];
    const network: NetworkClient = {
      async request(req) {
        const env = (status: number, data: unknown) => ({
          status,
          headers: {},
          body: new TextEncoder().encode(JSON.stringify({ success: true, data })),
        });
        if (req.method === "POST") {
          const row = { id: "key_1", name: JSON.parse((req.body as string | undefined) ?? "{}").name, prefix: "abcd1234", revokedAt: null };
          rows.push(row);
          return env(201, { ...row, key: "fwk_abcd1234_secret" });
        }
        if (req.method === "DELETE") {
          rows[0]!.revokedAt = "now";
          return env(200, { revokedAt: "now" });
        }
        return env(200, [...rows]);
      },
    };
    const client = new ScreenwriterClient({ network, baseUrl: "http://x", getToken: async () => "t" });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children?: ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, createElement(ScreenwriterClientProvider, { client, children }));
    const list = renderHook(() => useApiKeys(), { wrapper });
    await waitFor(() => expect(list.result.current.data).toEqual([]));
    const create = renderHook(() => useCreateApiKey(), { wrapper });
    create.result.current.mutate({ name: "n", entityId: "ws_1", scope: "read" });
    await waitFor(() => expect(create.result.current.data?.key).toBe("fwk_abcd1234_secret"));
    await waitFor(() => expect(list.result.current.data).toHaveLength(1));
    expect(JSON.stringify(list.result.current.data)).not.toContain("secret");
    const revoke = renderHook(() => useRevokeApiKey(), { wrapper });
    revoke.result.current.mutate("key_1");
    await waitFor(() => expect(list.result.current.data?.[0]?.revokedAt).toBe("now"));
  });
});
