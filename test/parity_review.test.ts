/**
 * Parity review of pass 2 (2026-11-01): the TS and Python packages answer the
 * same inputs the same way, and both follow the API on mcp-fix/integration.
 * Each case below was a difference between the two packages; Python already
 * behaved this way. All HTTP is mocked.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { TOOLS, callTool, listTools } from "../src/index.js";
import { BcaClient, setClient } from "../src/client.js";
import type { JsonSchema } from "../src/schema.js";

type Call = { path: string; query: Record<string, string>; body: unknown };

function capture(data: unknown = {}): Call[] {
  const calls: Call[] = [];
  const fake: typeof fetch = async (url, init) => {
    const u = new URL(String(url));
    calls.push({
      path: u.pathname,
      query: Object.fromEntries(u.searchParams),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return new Response(
      JSON.stringify({ data, attribution: { citations: [] }, meta: { status: "complete", request_id: "r", pageInfo: {} } }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
  setClient(new BcaClient({ apiKey: "k", fetchImpl: fake }));
  return calls;
}

const tool = (name: string) => {
  const t = TOOLS.find((x) => x.name === name);
  assert.ok(t, `${name} is registered`);
  return t;
};
const props = (name: string) => tool(name).inputSchema["properties"] as Record<string, JsonSchema>;
const accepts = (name: string, args: unknown) => tool(name).schema.safeParse(args).success;
const description = (name: string) => listTools().find((t) => t.name === name)!.description;

describe("inputs the API accepts or rejects, same as the Python sibling", () => {
  it("summarize_whitepaper takes only http and https URLs (the API's HttpUrl)", () => {
    const url = props("summarize_whitepaper")["url"]!;
    assert.equal(url["minLength"], 1);
    assert.equal(url["maxLength"], 2048);
    assert.ok(typeof url["pattern"] === "string");
    assert.equal(accepts("summarize_whitepaper", { url: "ftp://example.com/wp.pdf" }), false);
    assert.equal(accepts("summarize_whitepaper", { url: "javascript:alert(1)" }), false);
    assert.ok(accepts("summarize_whitepaper", { url: "http://example.com/wp.pdf" }));
    assert.ok(accepts("summarize_whitepaper", { url: "https://example.com/wp.pdf" }));
  });

  it("monitor_keyword advertises the API's minimum webhook_url length", () => {
    assert.equal(props("monitor_keyword")["webhook_url"]!["minLength"], 1);
  });

  it("get_options_flow checks the two expiry forms the API reads", async () => {
    assert.ok(typeof props("get_options_flow")["expiry"]!["pattern"] === "string");
    for (const good of ["13NOV26", "01dec26", "2026-11-13"]) {
      assert.ok(accepts("get_options_flow", { symbol: "BTC", expiry: good }), good);
    }
    // 1DEC26 is 6 characters: the API's min_length of 7 refuses it too.
    for (const bad of ["2026/11/13", "13-NOV-26", "NOV1326", "1DEC26"]) {
      assert.equal(accepts("get_options_flow", { symbol: "BTC", expiry: bad }), false, bad);
    }
    const calls = capture();
    const res = await callTool("get_options_flow", { symbol: "ETH", expiry: "2026-11-13" });
    assert.equal(res.isError, undefined);
    assert.deepEqual(calls[0]!.query, { symbol: "ETH", expiry: "2026-11-13" });
  });

  it("search_news since takes a bare ISO date as well as a timestamp, up to 64 characters", async () => {
    const since = props("search_news")["since"]!;
    assert.equal(since["format"], undefined);
    assert.equal(since["maxLength"], 64);
    for (const value of ["2026-10-01", "2026-10-01T00:00:00Z", "2026-10-01T00:00:00+00:00"]) {
      const calls = capture({ results: [] });
      const res = await callTool("search_news", { query: "etf", since: value });
      assert.equal(res.isError, undefined, value);
      assert.equal(calls[0]!.query["since"], value);
    }
    assert.equal(accepts("search_news", { query: "etf", since: "2".repeat(65) }), false);
  });
});

describe("get_agent_job fences the whitepaper summary at every depth", () => {
  const FENCE = /^<untrusted_content source="summarize_whitepaper">\n[\s\S]*\n<\/untrusted_content>$/;

  it("fences strings inside nested objects and lists, and leaves other values alone", async () => {
    const { runGetAgentJob } = await import("../src/tools/agent_jobs.js");
    // JSON.parse, as the client does, so "__proto__" is an own key here.
    capture(
      JSON.parse(
        JSON.stringify({
          kind: "summarize-whitepaper",
          status: "done",
          result: {
            summary: {
              tldr: "A chain.",
              tokenomics: { supply: "21M", distribution: "mined", detail: { note: "deep" }, max: 21000000 },
              team: ["Satoshi", { name: "Hal" }],
              risks: ["custody"],
              empty: "",
              missing: null,
            },
          },
        }),
      ),
    );
    const res = await runGetAgentJob({ job_id: "j1" });
    const summary = (res.data as any).result.summary;
    assert.match(summary.tldr, FENCE);
    assert.match(summary.tokenomics.supply, FENCE);
    assert.match(summary.tokenomics.distribution, FENCE);
    assert.match(summary.tokenomics.detail.note, FENCE);
    assert.equal(summary.tokenomics.max, 21000000);
    assert.match(summary.team[0], FENCE);
    assert.match(summary.team[1].name, FENCE);
    assert.match(summary.risks[0], FENCE);
    assert.equal(summary.empty, "");
    assert.equal(summary.missing, null);
  });

  it("a __proto__ key in the payload is fenced as data and changes no prototype", async () => {
    const { runGetAgentJob } = await import("../src/tools/agent_jobs.js");
    capture(
      JSON.parse(
        '{"kind":"summarize_whitepaper","status":"done","result":{"summary":{"__proto__":{"polluted":"yes"},"tldr":"t"}}}',
      ),
    );
    const res = await runGetAgentJob({ job_id: "j2" });
    const summary = (res.data as any).result.summary;
    assert.equal(({} as any).polluted, undefined);
    assert.equal(Object.getPrototypeOf(summary), Object.prototype);
    assert.match(Object.getOwnPropertyDescriptor(summary, "__proto__")!.value.polluted, FENCE);
  });
});

describe("descriptions match what the routes return", () => {
  it("scan_contract lists the fields the API returns and no owner", () => {
    const d = description("scan_contract");
    assert.doesNotMatch(d, /owner when it can be read/);
    assert.match(d, /implementation address, license and a source preview/);
  });

  it("get_audit_reports is partial only when every row is a DefiLlama link", () => {
    assert.match(description("get_audit_reports"), /Partial when only such links are on file/);
  });

  it("get_mica_status answers a reviewed non-EU row instead of unseeded", () => {
    assert.match(description("get_mica_status"), /unseeded unless BCA has a reviewed row for it/);
  });
});
