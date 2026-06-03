import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { BcaClient } from "../src/client.js";
import { BcaError, BcaAuthError } from "../src/errors.js";
import { BCA_DEMO_KEY_FALLBACK } from "../src/demo_key.js";
import { DEMO_BANNER } from "../src/demo_banner.js";

describe("demo key fallback chain", () => {
  it("falls back to BCA_DEMO_KEY_FALLBACK when no key is supplied", async () => {
    const prev = process.env["BCA_API_KEY"];
    delete process.env["BCA_API_KEY"];
    try {
      const fake: typeof fetch = async (_url, init) => {
        const headers = new Headers(init?.headers);
        assert.equal(
          headers.get("x-api-key"),
          BCA_DEMO_KEY_FALLBACK,
          "demo key fallback must be sent verbatim as X-API-Key",
        );
        return new Response(
          JSON.stringify({
            data: { price: 100000 },
            attribution: { citations: [] },
            meta: {
              status: "complete",
              request_id: "req_demo",
              pageInfo: {
                hasNextPage: false,
                hasPreviousPage: false,
                startCursor: null,
                endCursor: null,
              },
              tier: "demo",
              upgrade_url: "https://brain.blockchainacademics.com/signup?ref=mcp-demo-tier",
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      };
      const client = new BcaClient({ fetchImpl: fake });
      assert.equal(
        client.usingDemoKey,
        true,
        "usingDemoKey must be true when constructed without a key",
      );
      const env = await client.request<{ price: number }>("/v1/market/price");
      assert.equal(env.data.price, 100000);
    } finally {
      if (prev !== undefined) process.env["BCA_API_KEY"] = prev;
    }
  });

  it("explicit apiKey overrides demo fallback", async () => {
    let seen: string | null = null;
    const fake: typeof fetch = async (_url, init) => {
      seen = new Headers(init?.headers).get("x-api-key");
      return new Response(
        JSON.stringify({
          data: {},
          attribution: { citations: [] },
          meta: {
            status: "complete",
            request_id: "req_x",
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: null,
              endCursor: null,
            },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };
    const client = new BcaClient({
      apiKey: "bca_explicitly_supplied",
      fetchImpl: fake,
    });
    assert.equal(client.usingDemoKey, false);
    await client.request("/v1/market/price");
    assert.equal(seen, "bca_explicitly_supplied");
    assert.notEqual(seen, BCA_DEMO_KEY_FALLBACK);
  });

  it("env BCA_API_KEY overrides demo fallback", async () => {
    const prev = process.env["BCA_API_KEY"];
    process.env["BCA_API_KEY"] = "bca_from_env";
    try {
      let seen: string | null = null;
      const fake: typeof fetch = async (_url, init) => {
        seen = new Headers(init?.headers).get("x-api-key");
        return new Response(
          JSON.stringify({
            data: {},
            attribution: { citations: [] },
            meta: {
              status: "complete",
              request_id: "req_y",
              pageInfo: {
                hasNextPage: false,
                hasPreviousPage: false,
                startCursor: null,
                endCursor: null,
              },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      };
      const client = new BcaClient({ fetchImpl: fake });
      assert.equal(client.usingDemoKey, false);
      await client.request("/v1/market/price");
      assert.equal(seen, "bca_from_env");
    } finally {
      if (prev !== undefined) process.env["BCA_API_KEY"] = prev;
      else delete process.env["BCA_API_KEY"];
    }
  });
});

describe("tier + upgrade_url envelope passthrough", () => {
  it("passes meta.tier and meta.upgrade_url through unchanged", async () => {
    const fake: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          data: { fear_greed: 64 },
          attribution: { citations: [] },
          meta: {
            status: "complete",
            request_id: "req_z",
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: null,
              endCursor: null,
            },
            tier: "demo",
            upgrade_url:
              "https://brain.blockchainacademics.com/signup?ref=mcp-demo-tier",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    const client = new BcaClient({ apiKey: "x", fetchImpl: fake });
    const env = await client.request<{ fear_greed: number }>(
      "/v1/sentiment/fear-greed",
    );
    assert.equal(env.meta.tier, "demo");
    assert.equal(
      env.meta.upgrade_url,
      "https://brain.blockchainacademics.com/signup?ref=mcp-demo-tier",
    );
  });

  it("drops unknown tier values", async () => {
    const fake: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          data: {},
          attribution: { citations: [] },
          meta: {
            status: "complete",
            request_id: "req_w",
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: null,
              endCursor: null,
            },
            tier: "platinum-unicorn",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    const client = new BcaClient({ apiKey: "x", fetchImpl: fake });
    const env = await client.request("/v1/probe");
    assert.equal(env.meta.tier, undefined);
  });

  it("paid tiers get tier but no upgrade_url", async () => {
    const fake: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          data: {},
          attribution: { citations: [] },
          meta: {
            status: "complete",
            request_id: "req_p",
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: null,
              endCursor: null,
            },
            tier: "pro",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    const client = new BcaClient({ apiKey: "x", fetchImpl: fake });
    const env = await client.request("/v1/probe");
    assert.equal(env.meta.tier, "pro");
    assert.equal(env.meta.upgrade_url, undefined);
  });
});

describe("BCA_TIER_LOCKED upstream body peek", () => {
  it("surfaces upstream message verbatim on 403 with BCA_TIER_LOCKED", async () => {
    const upstreamDetail =
      "This tool requires a free account. Sign up in 30 seconds: " +
      "https://brain.blockchainacademics.com/signup?ref=mcp-demo-locked";
    const fake: typeof fetch = async () =>
      new Response(
        JSON.stringify({ detail: upstreamDetail }),
        {
          status: 403,
          headers: {
            "content-type": "application/json",
            "x-bca-error-code": "BCA_TIER_LOCKED",
          },
        },
      );
    const client = new BcaClient({ apiKey: "x", fetchImpl: fake });
    await assert.rejects(
      () => client.request("/v1/onchain/wallet"),
      (err) => {
        assert.ok(err instanceof BcaError);
        assert.equal((err as BcaError).code, "BCA_TIER_LOCKED");
        assert.ok(
          (err as BcaError).message.includes("Sign up in 30 seconds"),
          `expected message to include upstream detail, got: ${(err as Error).message}`,
        );
        assert.ok(
          (err as BcaError).message.includes("brain.blockchainacademics.com"),
        );
        return true;
      },
    );
  });

  it("falls back to BcaAuthError for plain 403 without TIER_LOCKED", async () => {
    const fake: typeof fetch = async () =>
      new Response("Forbidden", { status: 403 });
    const client = new BcaClient({ apiKey: "x", fetchImpl: fake });
    await assert.rejects(
      () => client.request("/v1/probe"),
      (err) => {
        assert.ok(err instanceof BcaAuthError);
        return true;
      },
    );
  });

  it("uses upstream error.code from {error:{code,message}} body shape", async () => {
    const fake: typeof fetch = async () =>
      new Response(
        JSON.stringify({
          error: { code: "BCA_TIER_LOCKED", message: "demo locked, upgrade" },
        }),
        { status: 403, headers: { "content-type": "application/json" } },
      );
    const client = new BcaClient({ apiKey: "x", fetchImpl: fake });
    await assert.rejects(
      () => client.request("/v1/probe"),
      (err) => {
        assert.equal((err as BcaError).code, "BCA_TIER_LOCKED");
        assert.equal((err as BcaError).message, "demo locked, upgrade");
        return true;
      },
    );
  });
});

describe("demo banner text", () => {
  it("is exactly 3 lines, ASCII-only, trailing newlines", () => {
    const lines = DEMO_BANNER.split("\n");
    assert.equal(
      lines.length,
      4,
      "DEMO_BANNER must be 3 lines + trailing empty",
    );
    assert.equal(lines[3], "", "DEMO_BANNER must end with \\n");
    for (const line of lines.slice(0, 3)) {
      assert.match(line, /^\[bca-mcp\] /, `line should start with prefix: ${line}`);
    }
    // ASCII-only: no chars above 0x7F.
    for (let i = 0; i < DEMO_BANNER.length; i++) {
      const c = DEMO_BANNER.charCodeAt(i);
      assert.ok(
        c < 0x80,
        `non-ASCII char at index ${i}: 0x${c.toString(16)}`,
      );
    }
  });

  it("mentions the signup URL and the BCA_API_KEY env var", () => {
    assert.ok(DEMO_BANNER.includes("brain.blockchainacademics.com/signup"));
    assert.ok(DEMO_BANNER.includes("BCA_API_KEY"));
    assert.ok(DEMO_BANNER.includes("DEMO mode"));
  });
});
