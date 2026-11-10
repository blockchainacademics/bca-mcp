/**
 * 429 answers: a call the per-second limit turned away is sent again, every
 * other limit is returned at once. All HTTP is mocked and the waits run on a
 * fake clock; nothing here reaches the network.
 */
import { describe, it, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

import { BcaClient } from "../src/client.js";
import { BcaRateLimitError } from "../src/errors.js";

const SIGNUP = "https://blockchainacademics.com/crypto-api/signup?ref=mcp-demo-rate";
const CODE = { "x-bca-error-code": "BCA_RATE_LIMIT" };

// The API's 429 answers, as it sends them: [detail, headers].
type Limit = [string, Record<string, string>];
const DEMO_PER_SECOND: Limit = [
  `Demo tier is at its per-second cap. Free account is 2,000/month: ${SIGNUP}`,
  { "retry-after": "1", ...CODE },
];
const KEYED_PER_SECOND: Limit = ["Rate limit exceeded: 2 requests/second for free tier", {}];
const KEYED_DAILY: Limit = ["Daily limit exceeded: 87 requests/day for free tier", {}];
const DEMO_PER_IP: Limit = [
  `Demo per-IP limit reached (20/day). Free account is 2,000/month: ${SIGNUP}`,
  { "retry-after": "3600", ...CODE },
];
const JOB_QUEUE: Limit = [
  "You already have 3 jobs queued or running. Wait for one to finish before starting another.",
  { "retry-after": "60", ...CODE },
];
// Sent after the call was counted, with the seconds left in the vendor's window.
const VENDOR: Limit = ["Upstream vendor rate limit, retry after 1s", { "retry-after": "1" }];

const limited = ([detail, headers]: Limit) => (): Response =>
  new Response(JSON.stringify({ detail }), {
    status: 429,
    headers: { "content-type": "application/json", ...headers },
  });

const ok = (): Response =>
  new Response(
    JSON.stringify({
      data: { ok: true },
      attribution: { citations: [] },
      meta: {
        status: "complete",
        request_id: "req_t",
        pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );

/** A client whose fetch gives each answer in turn (the last one repeats), and its call count. */
function scripted(...answers: Array<() => Response>) {
  const sent = { calls: 0 };
  const fake: typeof fetch = async () => {
    sent.calls++;
    return answers[Math.min(sent.calls, answers.length) - 1]!();
  };
  return { client: new BcaClient({ apiKey: "k", fetchImpl: fake }), sent };
}

/** Fake setTimeout, and a fixed Math.random so the jitter is known (0.5 gives 200 ms). */
function fakeClock(random = 0.5): void {
  mock.method(Math, "random", () => random);
  mock.timers.enable({ apis: ["setTimeout"] });
}

/** Let the work already queued (the fake fetch, the body read) run. */
async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve));
}

describe("a 429 from the per-second limit", () => {
  afterEach(() => {
    mock.timers.reset();
    mock.restoreAll();
  });

  it("is sent again after Retry-After plus jitter", async () => {
    fakeClock();
    const { client, sent } = scripted(limited(DEMO_PER_SECOND), ok);
    const pending = client.request<{ ok: boolean }>("/v1/market/price");
    await settle();
    assert.equal(sent.calls, 1);
    mock.timers.tick(1199);
    await settle();
    assert.equal(sent.calls, 1, "still waiting at 1,199 ms");
    mock.timers.tick(1);
    assert.equal((await pending).data.ok, true);
    assert.equal(sent.calls, 2);
  });

  it("waits 1 s when there is no Retry-After and the detail names the limit", async () => {
    fakeClock();
    const { client, sent } = scripted(limited(KEYED_PER_SECOND), ok);
    const pending = client.request<{ ok: boolean }>("/v1/market/price");
    await settle();
    mock.timers.tick(1199);
    await settle();
    assert.equal(sent.calls, 1);
    mock.timers.tick(1);
    assert.equal((await pending).data.ok, true);
    assert.equal(sent.calls, 2);
  });

  it("adds 100 to 300 ms of jitter", async () => {
    for (const [random, wait] of [
      [0, 1100],
      [0.999, 1300],
    ] as const) {
      fakeClock(random);
      const { client, sent } = scripted(limited(DEMO_PER_SECOND), ok);
      const pending = client.request("/v1/market/price");
      await settle();
      mock.timers.tick(wait - 1);
      await settle();
      assert.equal(sent.calls, 1, `random ${random}: still waiting at ${wait - 1} ms`);
      mock.timers.tick(1);
      await pending;
      assert.equal(sent.calls, 2);
      mock.timers.reset();
      mock.restoreAll();
    }
  });

  it("gives up after two retries", async () => {
    fakeClock();
    const { client, sent } = scripted(limited(DEMO_PER_SECOND));
    const pending = client.request("/v1/market/price");
    for (let retry = 0; retry < 2; retry++) {
      await settle();
      mock.timers.tick(1200);
    }
    await assert.rejects(pending, (err: unknown) => {
      assert.ok(err instanceof BcaRateLimitError);
      assert.equal(err.code, "BCA_RATE_LIMIT");
      assert.equal(err.retryAfter, 1);
      return true;
    });
    assert.equal(sent.calls, 3);
  });

  it("never repeats a POST", async () => {
    const { client, sent } = scripted(limited(DEMO_PER_SECOND), ok);
    await assert.rejects(
      client.post("/v1/agent-jobs", { kind: "due_diligence" }),
      (err: unknown) => err instanceof BcaRateLimitError,
    );
    assert.equal(sent.calls, 1);
  });
});

describe("every other 429 is returned at once", () => {
  // No fake clock: a retry here would wait for real and show as a second call.
  const cases: Array<[string, Limit, number | undefined]> = [
    ["a keyed daily cap", KEYED_DAILY, undefined],
    ["the no-key daily cap per IP", DEMO_PER_IP, 3600],
    ["the job queue cap", JOB_QUEUE, 60],
    ["a vendor limit with a short Retry-After and no error code", VENDOR, 1],
    ["a Retry-After over 2 seconds", [DEMO_PER_SECOND[0], { "retry-after": "3", ...CODE }], 3],
    [
      "a Retry-After that is an HTTP date",
      [DEMO_PER_SECOND[0], { "retry-after": "Wed, 11 Nov 2026 07:28:00 GMT", ...CODE }],
      undefined,
    ],
  ];
  for (const [name, limit, retryAfter] of cases) {
    it(name, async () => {
      const { client, sent } = scripted(limited(limit), ok);
      await assert.rejects(client.request("/v1/market/price"), (err: unknown) => {
        assert.ok(err instanceof BcaRateLimitError);
        assert.equal(err.retryAfter, retryAfter);
        return true;
      });
      assert.equal(sent.calls, 1);
    });
  }
});
