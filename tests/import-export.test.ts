// @vitest-environment happy-dom
import { createElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import {
  base64ToBytes,
  bytesToBase64,
  ScreenwriterClient,
  ScreenwriterClientProvider,
  useImportDocument,
  useDocuments,
  type NetworkClient,
} from "../src";

const report = { direction: "import", format: "fountain", diagnostics: [], stats: { elements: 1, scenes: 1, durationMs: 1 }, summary: { info: 0, warn: 0, loss: 0, error: 0 } };

function fake() {
  const calls: Array<{ path: string; body: unknown }> = [];
  const docs: unknown[] = [];
  const network: NetworkClient = {
    async request(req) {
      const path = new URL(req.url).pathname;
      calls.push({ path, body: req.body ? JSON.parse(req.body as string) : undefined });
      const ok = (data: unknown) => ({ status: 200, headers: {}, body: new TextEncoder().encode(JSON.stringify({ success: true, data })) });
      if (path.endsWith("/documents/import")) {
        docs.push({ id: "doc_1", title: "Imported" });
        return ok({ document: { id: "doc_1", title: "Imported" }, report, format: "fountain" });
      }
      if (path.endsWith("/export")) return ok({ filename: "a.fountain", mimeType: "text/plain", contentB64: bytesToBase64(new TextEncoder().encode("INT. X - DAY")), report, format: "fountain" });
      if (path === "/api/v1/formats") return ok([{ id: "fountain", label: "Fountain", extensions: [".fountain"], canImport: true, canExport: true }]);
      return ok([...docs]);
    },
  };
  return { network, calls };
}

describe("base64", () => {
  it("round-trips bytes, including large ones", () => {
    const big = new Uint8Array(200_000).map((_, i) => i % 251);
    expect(Array.from(base64ToBytes(bytesToBase64(big)))).toEqual(Array.from(big));
  });
});

describe("import and export", () => {
  it("importDocument base64s the bytes; exportDocument decodes them", async () => {
    const { network, calls } = fake();
    const client = new ScreenwriterClient({ network, baseUrl: "http://x", getToken: async () => "t" });
    const r = await client.importDocument("prj_1", { filename: "a.fountain", bytes: new TextEncoder().encode("hi").buffer });
    expect(r.document.id).toBe("doc_1");
    expect(calls[0]).toEqual({ path: "/api/v1/projects/prj_1/documents/import", body: { filename: "a.fountain", contentB64: btoa("hi") } });
    const e = await client.exportDocument("doc_1", "fountain");
    expect(new TextDecoder().decode(e.bytes)).toBe("INT. X - DAY");
    expect(e.filename).toBe("a.fountain");
    expect((await client.getFormats())[0]?.id).toBe("fountain");
  });

  it("useImportDocument refreshes the document list", async () => {
    const { network } = fake();
    const client = new ScreenwriterClient({ network, baseUrl: "http://x", getToken: async () => "t" });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children?: ReactNode }) =>
      createElement(QueryClientProvider, { client: qc }, createElement(ScreenwriterClientProvider, { client, children }));
    const list = renderHook(() => useDocuments("prj_1"), { wrapper });
    await waitFor(() => expect(list.result.current.data?.data!).toEqual([]));
    const imp = renderHook(() => useImportDocument("prj_1"), { wrapper });
    imp.result.current.mutate({ filename: "a.fountain", bytes: new Uint8Array([104, 105]) });
    await waitFor(() => expect(list.result.current.data?.data!).toHaveLength(1));
  });
});
