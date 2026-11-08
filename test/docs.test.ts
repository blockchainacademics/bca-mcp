/**
 * Docs stay in step with the code (probe units F36 and F51): the README
 * lists the 17 demo tools the API allowlists, the counts match, and no
 * user-facing copy carries an em dash.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { TOOLS } from "../src/index.js";
import { DEMO_BANNER } from "../src/demo_banner.js";

const root = new URL("../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

// Mirror of the API's app/api/v1/_demo_allowlist.py (2026-11-02: the 16 of
// 2026-10-31 plus get_article).
const DEMO_TOOLS = [
  "get_price",
  "get_trending",
  "get_fear_greed",
  "get_market_overview",
  "search_news",
  "get_article",
  "get_sentiment",
  "get_entity",
  "get_explainer",
  "get_recent_stories",
  "get_topic",
  "search_grants",
  "get_grant",
  "list_jobs",
  "get_job",
  "search_academy",
  "get_as_of_snapshot",
];

describe("README and registry copy", () => {
  const readme = read("README.md");

  it("the demo tools exist and the banner count matches", () => {
    const names = new Set(TOOLS.map((t) => t.name));
    for (const name of DEMO_TOOLS) assert.ok(names.has(name), `${name} is a tool`);
    assert.equal(DEMO_TOOLS.length, 17);
    assert.ok(DEMO_BANNER.includes(`${DEMO_TOOLS.length} tools work without a key`));
  });

  it("every demo tool's description says it works without a key", () => {
    for (const name of DEMO_TOOLS) {
      const tool = TOOLS.find((t) => t.name === name)!;
      // get_entity: only the slug form ("the slug form works without one").
      assert.match(tool.description, /works without (an API key|one)/i, name);
    }
    assert.match(TOOLS.find((t) => t.name === "get_article")!.description, /Works without an API key\./);
  });

  it("no submission, registry or launch copy still counts 16 demo tools", () => {
    const paths = [
      "README.md",
      "server.json",
      "ANTHROPIC_SUBMISSION.md",
      "SUBMISSION_CHECKLIST.md",
      "SUBMISSION_ENTRY.json",
      "docs/submissions/anthropic_mcp_directory.md",
      "docs/submissions/eliza_registry.md",
      "docs/submissions/virtuals_io_submission.md",
      "registry/eliza-plugin.md",
      "registry/virtuals-manifest.json",
      "docs/launch/hackernews_show_hn.md",
      "docs/launch/reddit_r_MachineLearning_or_cryptodev.md",
      "docs/launch/twitter_announcement_thread.md",
      "docs/launch/linkedin_post.md",
    ];
    for (const path of paths) {
      const text = read(path);
      assert.ok(!/\b16 tools\b|\b16 of (which|them)\b|\(16 without|\b89 of the 105\b|\bother 89\b/.test(text), `${path} counts 16 demo tools`);
    }
    assert.match(read("server.json"), /17 tools work under a shared daily cap/);
    assert.match(read("SUBMISSION_ENTRY.json"), /opens 17 tools \(/);
  });

  it("launch and submission copy keep the owner's bio and the verified test claim", () => {
    const paths = [
      "SUBMISSION_ENTRY.json",
      "ANTHROPIC_SUBMISSION.md",
      "SUBMISSION_CHECKLIST.md",
      "docs/submissions/anthropic_mcp_directory.md",
      "docs/submissions/eliza_registry.md",
      "docs/submissions/virtuals_io_submission.md",
      "registry/eliza-plugin.md",
      "registry/virtuals-manifest.json",
      "docs/launch/hackernews_show_hn.md",
      "docs/launch/reddit_r_MachineLearning_or_cryptodev.md",
      "docs/launch/twitter_announcement_thread.md",
      "docs/launch/twitter_single_tweet.md",
      "docs/launch/linkedin_post.md",
    ];
    for (const path of paths) {
      const text = read(path);
      // The launch copy is about the product (owner, 2026-11-02): no bio lines
      // about DEXTools or DEXT Force Ventures, and no fund figures anywhere.
      assert.ok(
        !/ex-DEXTools|I built DEXTools|founde(d|r of) DEXTools|DEXTools (co-?)?founder|DEXTools team|work(s)? at DEXTools|DEXT Force|DEXT Ventures|100\+ companies|\$15M/i.test(text),
        `${path}: owner bio`,
      );
      // DEXTools is his employer, never a sister company or part of a BCA group.
      assert.ok(!/DEXTools[^.\n]*\bsister\b|\bsister\b[^.\n]*DEXTools|BCA group/i.test(text), `${path}: DEXTools affiliation`);
      // Memos and theses have no content yet, from DEXT Force Ventures or anyone.
      assert.ok(!/(memos|theses)[^.\n]*from DEXT Force/i.test(text), `${path}: memos claim`);
      // The 2026-06-02 load test is not the claim; the 0.6.3 tool runs are.
      assert.ok(!/1,820|91% zero-error|zero-error under/i.test(text), `${path}: old load-test stat`);
      // Those runs left out the write and paid tools: never "every tool".
      assert.ok(!/every tool (was |were |is )?(tested|probed|called|exercised)/i.test(text), `${path}: every tool claim`);
      assert.ok(!text.includes("\u2014"), `${path}: em dash`);
    }
    // The probe records (keyed runs of 2026-10-31 and 2026-11-01): 92 tools
    // called live on both dates, zero crashes; 12 write or paid tools were
    // never called live, and get_tx waited on another call on 2026-11-01.
    assert.ok(
      read("SUBMISSION_ENTRY.json").includes(
        "92 of the 105 tools were called live against the production API on 2026-10-31 and again after the fixes on 2026-11-01, with zero crashes. Tools that write records or run paid compute were not called live.",
      ),
    );
  });

  it("the banner, README, server.json and submission copy give the free key's real reach", () => {
    // A tool on a paid plan names its tier in its description; the others are
    // the free tier (52 of the 105 on 2026-11-01).
    const paid = TOOLS.filter((t) => /\b(Starter|Pro|Team) tier\b/.test(t.description));
    const free = TOOLS.length - paid.length;
    assert.equal(free, 52);
    assert.ok(DEMO_BANNER.includes(`A free key opens ${free} tools and paid plans open the rest`));
    assert.ok(readme.includes(`opens the ${free} free-tier tools`));
    const server = JSON.parse(read("server.json"));
    const key = server.packages[0].environmentVariables.find(
      (v: { name: string }) => v.name === "BCA_API_KEY",
    );
    assert.ok(String(key.description).includes(`opens ${free} tools and paid plans open the rest`));
    const copy: Array<[string, string]> = [
      ["banner", DEMO_BANNER],
      ["README.md", readme],
      ["server.json", String(key.description)],
      ...["ANTHROPIC_SUBMISSION.md", "SUBMISSION_CHECKLIST.md", "docs/submissions/anthropic_mcp_directory.md"].map(
        (path): [string, string] => [path, read(path)],
      ),
    ];
    for (const [where, text] of copy) {
      assert.ok(!/for all (105|tools)|opens all 105|full 105 tools/i.test(text), `${where} says a free key opens every tool`);
    }
  });

  it("README lists every demo tool and the locked count", () => {
    for (const name of DEMO_TOOLS) assert.ok(readme.includes(`\`${name}\``), `README lists ${name}`);
    assert.match(readme, /17 tools work without a key/);
    assert.match(readme, /88 of the 105 tools/);
    assert.match(readme, /clean upgrade message/);
    assert.ok(!/10 marquee|91 of the 105|89 of the 105|16 tools work|~10 tools/.test(readme));
  });

  it("README states the real academy size", () => {
    assert.match(readme, /38 academy lessons in 8 courses/);
    assert.ok(!/43 academy lessons|what-is-a-blockchain/.test(readme));
  });

  it("no em dash in README, package.json or server.json descriptions", () => {
    assert.ok(!readme.includes("\u2014"), "README em dash");
    const pkg = JSON.parse(read("package.json"));
    assert.ok(!String(pkg.description).includes("\u2014"), "package.json description");
    const server = JSON.parse(read("server.json"));
    const texts: string[] = [server.description];
    for (const p of server.packages ?? []) {
      for (const v of p.environmentVariables ?? []) texts.push(v.description);
    }
    for (const text of texts) {
      assert.ok(!String(text).includes("\u2014"), `server.json: ${text}`);
      assert.ok(!/10 marquee/.test(String(text)), `server.json: ${text}`);
    }
  });
});

describe("launch posts fit their platforms", () => {
  const launch = [
    "docs/launch/hackernews_show_hn.md",
    "docs/launch/reddit_r_MachineLearning_or_cryptodev.md",
    "docs/launch/twitter_announcement_thread.md",
    "docs/launch/twitter_single_tweet.md",
    "docs/launch/linkedin_post.md",
  ];
  const social = launch.filter((path) => !path.includes("hackernews"));

  // X's count (twitter-text v3): a link is 23, code points in four ranges are
  // 1 and every other one (emoji, arrows, the ellipsis) is 2.
  const xLength = (text: string): number => {
    let n = 0;
    const rest = text.replace(/https?:\/\/\S+/g, () => {
      n += 23;
      return "";
    });
    for (const ch of rest) {
      const cp = ch.codePointAt(0)!;
      const light =
        cp <= 4351 || (cp >= 8192 && cp <= 8205) || (cp >= 8208 && cp <= 8223) || (cp >= 8242 && cp <= 8247);
      n += light ? 1 : 2;
    }
    return n;
  };

  it("every X post is at most 280 characters, with a blank line between lines", () => {
    const thread = read("docs/launch/twitter_announcement_thread.md");
    const posts = thread
      .split(/^\*\*[^*\n]+\*\*$/m)
      .slice(1)
      .map((block) => block.split("\n---")[0]!.trim());
    posts.push(read("docs/launch/twitter_single_tweet.md").split("\n---\n")[1]!.trim());
    assert.ok(posts.length >= 9, "the thread and the single tweet parse");
    for (const post of posts) {
      assert.ok(xLength(post) <= 280, `X post over 280: ${post.slice(0, 50)}`);
      // Short lines separated by blank lines, never one paragraph (owner, 2026-09-23).
      assert.ok(!/[^\n]\n[^\n]/.test(post), `X post lines need a blank line between them: ${post.slice(0, 50)}`);
    }
  });

  it("the Show HN title follows HN's conventions", () => {
    const hn = read("docs/launch/hackernews_show_hn.md");
    const title = hn.split("**Title:**\n")[1]!.split("\n")[0]!;
    assert.match(title, /^Show HN: /);
    assert.ok(title.length <= 80, "HN titles are at most 80 characters");
    assert.ok(!/!|\b[A-Z]{4,}\b/.test(title.replace(/^Show HN: /, "")), "no exclamation marks or shouting");
    // The link is something people can try, never a signup or pricing page.
    assert.match(hn, /\*\*URL:\*\*\nhttps:\/\/github\.com\/blockchainacademics\/bca-mcp\n/);
  });

  it("social posts show no domain but blockchainacademics.com, and no post links the API host", () => {
    // BCA is the source on social posts: X, Reddit and LinkedIn link bare
    // domains, so nothing but the site may appear (owner, 2026-10-31).
    for (const path of social) {
      for (const m of read(path).matchAll(/\b(?:[a-z0-9-]+\.)+(?:com|io|org|net|dev|ai|app|xyz|co|so|md|sh)\b/gi)) {
        assert.ok(/^(www\.)?blockchainacademics\.com$/i.test(m[0]), `${path} shows ${m[0]}`);
      }
    }
    for (const path of launch) {
      const text = read(path);
      // api.blockchainacademics.com answers 301 to /crypto-api: link the site's pages.
      assert.ok(!/api\.blockchainacademics\.com/.test(text), `${path} links the API host`);
      // The site and list_entities say about 150 entity dossiers.
      assert.ok(!/150\+ entit/i.test(text), `${path} says 150+ entities`);
      // Prices do come from upstream APIs: no "not a wrapper" claims.
      assert.ok(!/CoinGecko wrapper|not a wrapper|thin wrappers/i.test(text), `${path} wrapper claim`);
      assert.ok(!/hash-verifiable|No more hallucinated/i.test(text), `${path} overclaims the hash`);
    }
  });
});
