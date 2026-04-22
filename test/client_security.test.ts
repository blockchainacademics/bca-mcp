import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import {
  BcaClient,
  __resetNonDefaultBaseWarning,
  isAllowedBase,
  formatAllowlistError,
} from "../src/client.js";
import { BcaError } from "../src/errors.js";

const DEFAULT_BASE = "https://api.blockchainacademics.com";

function envelopeBody() {
  return JSON.stringify({
    data: {},
    attribution: { citations: [] },
    meta: {
      status: "complete",
      request_id: "req_t",
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: null,
        endCursor: null,
      },
    },
  });
}

describe("BcaClient — H-1 BCA_API_BASE allowlist (v0.3.1)", () => {
  // Each test restores process.env entries we mutate so ordering is irrelevant.
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => {
    for (const k of [
      "BCA_API_BASE",
      "BCA_API_BASE_URL",
      "BCA_ALLOW_INSECURE_BASE",
    ]) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
    __resetNonDefaultBaseWarning();
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    __resetNonDefaultBaseWarning();
  });

  it("isAllowedBase accepts prod, staging, localhost, 127.0.0.1", () => {
    assert.equal(isAllowedBase("https://api.blockchainacademics.com"), true);
    assert.equal(
      isAllowedBase("https://staging-api.blockchainacademics.com"),
      true,
    );
    assert.equal(isAllowedBase("http://localhost"), true);
    assert.equal(isAllowedBase("http://localhost:8000"), true);
    assert.equal(isAllowedBase("http://127.0.0.1"), true);
    assert.equal(isAllowedBase("http://127.0.0.1:3000"), true);
  });

  it("isAllowedBase rejects arbitrary https hosts, bare https, prefix-bypass", () => {
    assert.equal(isAllowedBase("https://attacker.example.com"), false);
    assert.equal(isAllowedBase("https://"), false);
    // Prefix-bypass attempts — must NOT be mistaken for localhost.
    assert.equal(isAllowedBase("http://localhost.evil.com"), false);
    assert.equal(isAllowedBase("http://127.0.0.1.evil.com"), false);
    assert.equal(isAllowedBase("http://127.0.0.1:"), false);
    assert.equal(isAllowedBase("http://127.0.0.1:abc"), false);
    assert.equal(isAllowedBase("http://localhost:99999999"), false);
    // http:// to a non-loopback host is rejected.
    assert.equal(isAllowedBase("http://1.2.3.4"), false);
    // Protocol confusion.
    assert.equal(isAllowedBase("ftp://api.blockchainacademics.com"), false);
  });

  it("constructor throws BcaError with allowlist message for arbitrary https host", () => {
    assert.throws(
      () =>
        new BcaClient({ apiKey: "k", baseUrl: "https://attacker.example.com" }),
      (err: unknown) => {
        assert.ok(err instanceof BcaError, "expected BcaError");
        assert.match(
          (err as BcaError).message,
          /Refusing to use BCA_API_BASE='https:\/\/attacker\.example\.com'/,
        );
        assert.match((err as BcaError).message, /Allowed values/);
        return true;
      },
    );
  });

  it("constructor throws for http://attacker.local (non-loopback http)", () => {
    assert.throws(
      () => new BcaClient({ apiKey: "k", baseUrl: "http://attacker.local" }),
      (err: unknown) => err instanceof BcaError,
    );
  });

  it("env BCA_API_BASE=http://localhost:8000 is accepted (no opt-in flag needed)", () => {
    process.env["BCA_API_BASE"] = "http://localhost:8000";
    const c = new BcaClient({ apiKey: "k" });
    assert.ok(c);
  });

  it("env BCA_API_BASE=http://127.0.0.1:3000 is accepted", () => {
    process.env["BCA_API_BASE"] = "http://127.0.0.1:3000";
    const c = new BcaClient({ apiKey: "k" });
    assert.ok(c);
  });

  it("staging base is accepted", () => {
    process.env["BCA_API_BASE"] = "https://staging-api.blockchainacademics.com";
    const c = new BcaClient({ apiKey: "k" });
    assert.ok(c);
  });

  it("BCA_ALLOW_INSECURE_BASE=1 no longer rescues arbitrary http hosts", () => {
    process.env["BCA_ALLOW_INSECURE_BASE"] = "1";
    assert.throws(
      () => new BcaClient({ apiKey: "k", baseUrl: "http://attacker.local" }),
      (err: unknown) => err instanceof BcaError,
    );
  });

  it("formatAllowlistError contains the rejected URL and the allowed set", () => {
    const msg = formatAllowlistError("https://evil.io");
    assert.match(msg, /https:\/\/evil\.io/);
    assert.match(msg, /api\.blockchainacademics\.com/);
    assert.match(msg, /staging-api\.blockchainacademics\.com/);
    assert.match(msg, /localhost/);
    assert.match(msg, /127\.0\.0\.1/);
  });

  it("does not warn when using the hardcoded default base", async () => {
    const warnings: string[] = [];
    const origWarn = console.warn;
    console.warn = (msg: unknown) => {
      warnings.push(String(msg));
    };
    try {
      const fake: typeof fetch = async () =>
        new Response(envelopeBody(), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      const c = new BcaClient({ apiKey: "k", fetchImpl: fake });
      await c.request("/v1/ping");
      assert.equal(
        warnings.filter((w) => w.includes("non-default BCA_API_BASE")).length,
        0,
        "should not warn on default base",
      );
    } finally {
      console.warn = origWarn;
    }
  });

  it("warns exactly once when a non-default https base is in use", async () => {
    const warnings: string[] = [];
    const origWarn = console.warn;
    console.warn = (msg: unknown) => {
      warnings.push(String(msg));
    };
    try {
      const fake: typeof fetch = async () =>
        new Response(envelopeBody(), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      const c = new BcaClient({
        apiKey: "k",
        baseUrl: "https://staging-api.blockchainacademics.com",
        fetchImpl: fake,
      });
      await c.request("/v1/ping");
      await c.request("/v1/ping");
      await c.request("/v1/ping");
      const matched = warnings.filter((w) =>
        w.includes(
          "warning: using non-default BCA_API_BASE='https://staging-api.blockchainacademics.com'",
        ),
      );
      assert.equal(matched.length, 1, "should warn exactly once per process");
    } finally {
      console.warn = origWarn;
    }
  });
});

describe("BcaClient — response size cap", () => {
  it("rejects responses that exceed the 10MB cap (stream path)", async () => {
    // Construct a streaming response whose first chunk already exceeds 10MB.
    const huge = new Uint8Array(10 * 1024 * 1024 + 1024); // 10MB + 1KB
    huge.fill(0x7b); // "{" — shape doesn't matter, we should bail before JSON.parse
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(huge);
        controller.close();
      },
    });
    const fake: typeof fetch = async () =>
      new Response(stream, {
        status: 200,
        headers: { "content-type": "application/json" },
      });

    const c = new BcaClient({ apiKey: "k", fetchImpl: fake });
    await assert.rejects(
      () => c.request("/v1/ping"),
      (err: unknown) => {
        assert.ok(err instanceof BcaError, "expected BcaError");
        assert.match((err as BcaError).message, /exceeded .* byte cap/);
        return true;
      },
    );
  });

  it("accepts small responses under the cap (no regression)", async () => {
    const body = JSON.stringify({
      data: { ok: true },
      attribution: { citations: [] },
      meta: {
        status: "complete",
        request_id: "req_ok",
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
      },
    });
    const fake: typeof fetch = async () =>
      new Response(body, {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    const c = new BcaClient({ apiKey: "k", fetchImpl: fake });
    const out = await c.request<{ ok: boolean }>("/v1/ping");
    assert.equal(out.data.ok, true);
  });
});

describe("module exports smoke", () => {
  it("BcaClient and reset helper are exported", () => {
    assert.equal(typeof BcaClient, "function");
    assert.equal(typeof __resetNonDefaultBaseWarning, "function");
    assert.equal(typeof isAllowedBase, "function");
    assert.equal(typeof formatAllowlistError, "function");
    assert.equal(DEFAULT_BASE, "https://api.blockchainacademics.com");
  });
});
