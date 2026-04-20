import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { BcaClient, setClient } from "../src/client.js";
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
  it("injects X-API-Key header and parses response envelope", async () => {
    const fake: typeof fetch = async (_url, init) => {
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("x-api-key"), "test-key");
      assert.ok(headers.get("user-agent")?.includes("@blockchainacademics/mcp"));
      return new Response(
        JSON.stringify({
          data: { articles: [], total: 0 },
          cite_url: "https://x.test/c",
          as_of: "2026-04-19T00:00:00Z",
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
    assert.equal(out.cite_url, "https://x.test/c");
    assert.equal(out.as_of, "2026-04-19T00:00:00Z");
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

  it("wraps non-enveloped JSON responses under { data }", async () => {
    const fake: typeof fetch = async () =>
      new Response(JSON.stringify({ articles: [], total: 0 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    const c = new BcaClient({ apiKey: "k", fetchImpl: fake });
    const out = await c.request<{ articles: unknown[]; total: number }>(
      "/v1/articles/search",
    );
    assert.equal(out.data.total, 0);
    assert.equal(out.cite_url, undefined);
  });
});
