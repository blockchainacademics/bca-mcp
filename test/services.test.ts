/**
 * Service tools (probe unit F34, shared decision 4): the MCP schemas mirror
 * the API request models in app/api/v1/services.py (API main), so a call
 * that validates here is not rejected upstream with a 422. HTTP is mocked;
 * these write tools are never called for real.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { callTool, listTools } from "../src/index.js";
import { BcaClient, setClient } from "../src/client.js";
import {
  bookKolCampaignInputSchema,
  requestCustomResearchInputSchema,
  submitListingInputSchema,
} from "../src/tools/extended.js";

/** Capture the POST the tool sends; answer like the API does (201). */
function capture(): { calls: Array<{ url: string; method: string; body: unknown }> } {
  const calls: Array<{ url: string; method: string; body: unknown }> = [];
  const fake: typeof fetch = async (url, init) => {
    calls.push({
      url: String(url),
      method: String(init?.method),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return new Response(
      JSON.stringify({
        data: { request_id: "42", status: "new", next_step: "We reply within 2 business days." },
        attribution: { citations: [] },
        meta: {
          status: "complete",
          request_id: "req_svc",
          pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
        },
      }),
      { status: 201, headers: { "content-type": "application/json" } },
    );
  };
  setClient(new BcaClient({ apiKey: "k", fetchImpl: fake }));
  return { calls };
}

const required = (name: string) =>
  listTools().find((t) => t.name === name)!.inputSchema["required"];

const kol = {
  contact_email: "founder@example.com",
  project_name: "Example Protocol",
  campaign_type: "thread",
  budget_usd: 500,
};

describe("book_kol_campaign matches KOLCampaignRequest", () => {
  it("requires contact_email, project_name, campaign_type and budget_usd", () => {
    assert.deepEqual(required("book_kol_campaign"), [
      "contact_email",
      "project_name",
      "campaign_type",
      "budget_usd",
    ]);
  });

  it("enforces the API's bounds", () => {
    const bad = (patch: Record<string, unknown>) =>
      assert.equal(bookKolCampaignInputSchema.safeParse({ ...kol, ...patch }).success, false, JSON.stringify(patch));
    bad({ budget_usd: 499 });
    bad({ budget_usd: 2_000_001 });
    bad({ budget_usd: 750.5 });
    bad({ campaign_type: "tweet" });
    bad({ project_name: "X" });
    bad({ contact_email: "not-an-email" });
    bad({ target_chains: Array.from({ length: 13 }, (_, i) => `chain${i}`) });
    for (const t of ["thread", "video", "space", "podcast", "hybrid"]) {
      assert.ok(bookKolCampaignInputSchema.safeParse({ ...kol, campaign_type: t }).success, t);
    }
  });

  it("POSTs the API's field names and nothing from the 0.6.2 shape", async () => {
    const { calls } = capture();
    const res = await callTool("book_kol_campaign", {
      ...kol,
      target_chains: ["solana"],
      notes: "Launch week",
      objective: "dropped: not an API field",
    });
    assert.equal(res.isError, undefined);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.method, "POST");
    assert.ok(calls[0]!.url.endsWith("/v1/services/book-kol-campaign"));
    assert.deepEqual(calls[0]!.body, { ...kol, target_chains: ["solana"], notes: "Launch week" });
  });

  it("the old 0.6.2 arguments now fail locally with a clear message", async () => {
    capture();
    const res = await callTool("book_kol_campaign", {
      contact_email: "founder@example.com",
      budget_usd: 100,
      objective: "awareness",
    });
    assert.equal(res.isError, true);
    const err = JSON.parse(res.content[0]!.text).error;
    assert.equal(err.code, "BCA_BAD_REQUEST");
    assert.match(err.message, /project_name: Required/);
    assert.match(err.message, /campaign_type: Required/);
    assert.match(err.message, /budget_usd: Number must be greater than or equal to 500/);
  });

  it("describes what the API requires and returns", () => {
    const d = listTools().find((t) => t.name === "book_kol_campaign")!.description;
    assert.match(d, /request_id, status and next_step/);
    assert.ok(!/campaign_id|Pro tier/.test(d), d);
  });
});

describe("submit_listing matches ListingSubmissionRequest", () => {
  const listing = {
    contact_email: "team@example.com",
    directory: "trading_bots",
    listing_name: "Example Bot",
    listing_url: "https://example.com",
    description: "An example trading bot for tests.",
  };

  it("requires listing_url and description and uses the underscore directories", () => {
    assert.deepEqual(required("submit_listing"), [
      "contact_email",
      "directory",
      "listing_name",
      "listing_url",
      "description",
    ]);
    const props = listTools().find((t) => t.name === "submit_listing")!.inputSchema[
      "properties"
    ] as Record<string, Record<string, unknown>>;
    assert.deepEqual(props["directory"]!["enum"], [
      "vcs",
      "aggregators",
      "trading_bots",
      "mcps",
      "nft_communities",
      "jobs",
      "stablecoins",
      "trading_yields",
    ]);
    assert.equal(props["description"]!["minLength"], 20);
    assert.equal(props["listing_url"]!["format"], "uri");
  });

  it("enforces the API's bounds", () => {
    const bad = (patch: Record<string, unknown>) =>
      assert.equal(submitListingInputSchema.safeParse({ ...listing, ...patch }).success, false, JSON.stringify(patch));
    bad({ directory: "trading-bots" });
    bad({ description: "too short" });
    bad({ listing_url: "ftp://example.com" });
    bad({ listing_url: "not a url" });
    bad({ listing_name: "X" });
    bad({ tags: Array.from({ length: 25 }, (_, i) => `t${i}`) });
    assert.ok(submitListingInputSchema.safeParse(listing).success);
  });

  it("POSTs the API's field names", async () => {
    const { calls } = capture();
    const res = await callTool("submit_listing", { ...listing, entity: "dropped" });
    assert.equal(res.isError, undefined);
    assert.ok(calls[0]!.url.endsWith("/v1/services/submit-listing"));
    assert.deepEqual(calls[0]!.body, listing);
  });
});

describe("request_custom_research matches CustomResearchRequest", () => {
  it("topic needs at least 4 characters and at most 240", () => {
    const base = { contact_email: "analyst@example.com" };
    assert.equal(requestCustomResearchInputSchema.safeParse({ ...base, topic: "abc" }).success, false);
    assert.equal(requestCustomResearchInputSchema.safeParse({ ...base, topic: "x".repeat(241) }).success, false);
    assert.ok(requestCustomResearchInputSchema.safeParse({ ...base, topic: "restaking" }).success);
    assert.deepEqual(required("request_custom_research"), ["contact_email", "topic"]);
  });

  it("POSTs the API's field names with its defaults", async () => {
    const { calls } = capture();
    const res = await callTool("request_custom_research", {
      contact_email: "analyst@example.com",
      topic: "Restaking risk",
      deadline: "within 2 weeks",
    });
    assert.equal(res.isError, undefined);
    assert.ok(calls[0]!.url.endsWith("/v1/services/custom-research"));
    assert.deepEqual(calls[0]!.body, {
      contact_email: "analyst@example.com",
      topic: "Restaking risk",
      depth: "standard",
      target_wordcount: 3000,
      deadline: "within 2 weeks",
    });
  });

  it("describes what the API requires and returns", () => {
    const d = listTools().find((t) => t.name === "request_custom_research")!.description;
    assert.match(d, /request_id, status and next_step/);
    assert.ok(!/order_id|Pro tier/.test(d), d);
  });
});
