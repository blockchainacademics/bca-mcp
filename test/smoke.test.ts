import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  BcaClient,
  setClient,
  __resetFlatEnvelopeWarning,
} from "../src/client.js";
import { BcaAuthError } from "../src/errors.js";
import {
  searchNewsInputSchema,
  runSearchNews,
} from "../src/tools/search_news.js";
import { getEntityInputSchema } from "../src/tools/get_entity.js";
import { getExplainerInputSchema } from "../src/tools/get_explainer.js";

describe("input schemas", () => {
  it("search_news accepts minimal input and applies default limit", () => {
    const v = searchNewsInputSchema.parse({ query: "ethereum" });
    assert.equal(v.limit, 10);
  });

  it("search_news rejects empty query", () => {
    assert.throws(() => searchNewsInputSchema.parse({ query: "" }));
  });

  it("get_entity requires exactly one of slug or ticker", () => {
    assert.throws(() => getEntityInputSchema.parse({}));
    assert.throws(() =>
      getEntityInputSchema.parse({ slug: "x", ticker: "Y" }),
    );
    assert.ok(getEntityInputSchema.parse({ slug: "ethereum" }));
    assert.ok(getEntityInputSchema.parse({ ticker: "ETH" }));
  });

  it("get_explainer requires exactly one of slug or topic", () => {
    assert.throws(() => getExplainerInputSchema.parse({}));
    assert.throws(() =>
      getExplainerInputSchema.parse({ slug: "a", topic: "b" }),
    );
    assert.ok(getExplainerInputSchema.parse({ topic: "liquidity" }));
    assert.ok(getExplainerInputSchema.parse({ slug: "what-is-a-blockchain" }));
  });
});

describe("client", () => {
  it("injects X-API-Key header and parses canonical response envelope", async () => {
    const fake: typeof fetch = async (_url, init) => {
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("x-api-key"), "test-key");
      assert.ok(headers.get("user-agent")?.includes("@blockchainacademics/mcp"));
      return new Response(
        JSON.stringify({
          data: { articles: [], total: 0 },
          attribution: {
            citations: [
              {
                cite_url: "https://x.test/c",
                as_of: "2026-04-22T00:00:00Z",
                source_hash: "sha256:deadbeef",
              },
            ],
          },
          meta: {
            status: "unseeded",
            request_id: "req_abc123",
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: null,
              endCursor: null,
            },
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      );
    };
    const c = new BcaClient({ apiKey: "test-key", fetchImpl: fake });
    setClient(c);
    const out = await runSearchNews({ query: "ethereum", limit: 10 });
    assert.equal(out.attribution.citations[0]!.cite_url, "https://x.test/c");
    assert.equal(out.attribution.citations[0]!.as_of, "2026-04-22T00:00:00Z");
    assert.equal(out.attribution.citations[0]!.source_hash, "sha256:deadbeef");
    assert.equal(out.meta.status, "unseeded");
    assert.equal(out.meta.request_id, "req_abc123");
    assert.equal(out.meta.pageInfo.hasNextPage, false);
    assert.equal(out.data.total, 0);
  });

  it("maps HTTP 401 to BcaAuthError", async () => {
    const fake: typeof fetch = async () =>
      new Response("nope", { status: 401 });
    const c = new BcaClient({ apiKey: "bad", fetchImpl: fake });
    await assert.rejects(
      () => c.request("/v1/articles/search"),
      BcaAuthError,
    );
  });

  it("wraps non-enveloped JSON responses under canonical envelope", async () => {
    const fake: typeof fetch = async () =>
      new Response(JSON.stringify({ articles: [], total: 0 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    const c = new BcaClient({ apiKey: "k", fetchImpl: fake });
    const out = await c.request<{ articles: unknown[]; total: number }>(
      "/v1/articles/search",
    );
    // Raw payload is lifted into data, attribution has empty citations array,
    // meta is synthesised with a default status + request_id + pageInfo.
    assert.equal(out.data.total, 0);
    assert.deepEqual(out.attribution.citations, []);
    assert.equal(out.meta.status, "complete");
    assert.equal(typeof out.meta.request_id, "string");
    assert.ok(out.meta.request_id.length > 0);
    assert.equal(out.meta.pageInfo.hasNextPage, false);
  });

  it("auto-lifts legacy flat envelope into canonical (shim path)", async () => {
    __resetFlatEnvelopeWarning();
    const origWarn = console.warn;
    const warnings: string[] = [];
    console.warn = (msg: unknown) => {
      warnings.push(String(msg));
    };
    try {
      const fake: typeof fetch = async () =>
        new Response(
          JSON.stringify({
            data: { ok: true },
            cite_url: "https://legacy.test/c",
            as_of: "2026-04-20T00:00:00Z",
            source_hash: "sha256:legacyhash",
            status: "partial",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      const c = new BcaClient({ apiKey: "k", fetchImpl: fake });
      const out = await c.request<{ ok: boolean }>("/v1/ping");

      assert.equal(out.data.ok, true);
      assert.equal(out.attribution.citations.length, 1);
      assert.equal(out.attribution.citations[0]!.cite_url, "https://legacy.test/c");
      assert.equal(out.attribution.citations[0]!.as_of, "2026-04-20T00:00:00Z");
      assert.equal(out.attribution.citations[0]!.source_hash, "sha256:legacyhash");
      assert.equal(out.meta.status, "partial");
      assert.equal(typeof out.meta.request_id, "string");

      const matched = warnings.filter((w) =>
        w.includes("legacy flat envelope shape"),
      );
      assert.equal(matched.length, 1, "should warn exactly once");
    } finally {
      console.warn = origWarn;
      __resetFlatEnvelopeWarning();
    }
  });
});

describe("envelope shape canonical contract", () => {
  it("MCP tool call returns exact canonical shape end-to-end", async () => {
    const fake: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          data: { articles: [{ slug: "btc-x", title: "BTC X" }], total: 1 },
          attribution: {
            citations: [
              {
                cite_url: "https://blockchainacademics.com/articles/btc-x",
                as_of: "2026-04-22T12:00:00Z",
                source_hash: "sha256:abc",
              },
              {
                cite_url: "https://other.test/ref",
                as_of: "2026-04-22T11:59:00Z",
                source_hash: null,
              },
            ],
          },
          meta: {
            status: "complete",
            request_id: "req_xyz",
            pageInfo: {
              hasNextPage: true,
              hasPreviousPage: false,
              startCursor: "cur_a",
              endCursor: "cur_b",
            },
            diagnostic: { notes: "primary citation index 0" },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    const c = new BcaClient({ apiKey: "k", fetchImpl: fake });
    setClient(c);

    const out = await runSearchNews({ query: "bitcoin", limit: 10 });

    // Top-level canonical keys: data, attribution, meta — nothing else.
    const keys = Object.keys(out).sort();
    assert.deepEqual(keys, ["attribution", "data", "meta"]);

    // attribution.citations is array-only. citations[0] = primary.
    assert.ok(Array.isArray(out.attribution.citations));
    assert.equal(out.attribution.citations.length, 2);
    assert.equal(
      out.attribution.citations[0]!.cite_url,
      "https://blockchainacademics.com/articles/btc-x",
    );
    // Singular attribution.cite_url must NOT exist at root.
    assert.equal((out.attribution as any).cite_url, undefined);

    // meta contract: status + request_id (string) + pageInfo + optional diagnostic.
    assert.equal(out.meta.status, "complete");
    assert.equal(out.meta.request_id, "req_xyz");
    assert.equal(typeof out.meta.request_id, "string");
    assert.equal(out.meta.pageInfo.hasNextPage, true);
    assert.equal(out.meta.pageInfo.startCursor, "cur_a");
    assert.equal(out.meta.pageInfo.endCursor, "cur_b");
    assert.deepEqual(out.meta.diagnostic, { notes: "primary citation index 0" });

    // Errors do NOT appear as envelope status. "error" is not a valid value.
    const allowed = new Set(["complete", "unseeded", "partial", "stale"]);
    assert.ok(allowed.has(out.meta.status));

    // data is passed through verbatim.
    assert.equal(out.data.total, 1);
  });
});
