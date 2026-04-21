import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import {
  BcaClient,
  __resetNonDefaultBaseWarning,
} from "../src/client.js";
import { BcaError } from "../src/errors.js";

const DEFAULT_BASE = "https://api.blockchainacademics.com";

describe("BcaClient — BCA_API_BASE hardening", () => {
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

  it("throws when baseUrl is http:// and opt-in flag is not set", () => {
    assert.throws(
      () => new BcaClient({ apiKey: "k", baseUrl: "http://attacker.local" }),
      (err: unknown) => {
        assert.ok(err instanceof BcaError, "expected BcaError");
        assert.match(
          (err as BcaError).message,
          /Refusing to use non-HTTPS BCA_API_BASE='http:\/\/attacker\.local'/,
        );
        assert.match(
          (err as BcaError).message,
          /BCA_ALLOW_INSECURE_BASE=1/,
        );
        return true;
      },
    );
  });

  it("throws when env BCA_API_BASE is http:// and opt-in not set", () => {
    process.env["BCA_API_BASE"] = "http://localhost:8000";
    assert.throws(
      () => new BcaClient({ apiKey: "k" }),
      (err: unknown) => err instanceof BcaError,
    );
  });

  it("allows http:// when BCA_ALLOW_INSECURE_BASE=1 is set (local dev)", () => {
    process.env["BCA_ALLOW_INSECURE_BASE"] = "1";
    const c = new BcaClient({ apiKey: "k", baseUrl: "http://localhost:8000" });
    assert.ok(c);
  });

  it("does not warn when using the hardcoded default base", async () => {
    const warnings: string[] = [];
    const origWarn = console.warn;
    console.warn = (msg: unknown) => {
      warnings.push(String(msg));
    };
    try {
      const fake: typeof fetch = async () =>
        new Response(JSON.stringify({ data: {} }), {
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
        new Response(JSON.stringify({ data: {} }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      const c = new BcaClient({
        apiKey: "k",
        baseUrl: "https://staging.blockchainacademics.com",
        fetchImpl: fake,
      });
      await c.request("/v1/ping");
      await c.request("/v1/ping");
      await c.request("/v1/ping");
      const matched = warnings.filter((w) =>
        w.includes(
          "warning: using non-default BCA_API_BASE='https://staging.blockchainacademics.com'",
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
    const body = JSON.stringify({ data: { ok: true } });
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
    assert.equal(DEFAULT_BASE, "https://api.blockchainacademics.com");
  });
});
