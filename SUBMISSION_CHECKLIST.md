# Anthropic MCP Directory — Submission Checklist

**Package:** `@blockchainacademics/mcp` v0.2.2
**npm:** https://www.npmjs.com/package/@blockchainacademics/mcp
**Source:** https://github.com/blockchainacademics/bca-mcp
**Target:** https://github.com/modelcontextprotocol/servers
**Maintainer:** dev@blockchainacademics.com

This is the single operational runbook for submitting to the MCP directory.
Once the Loom is recorded, submission is ~5 minutes of copy-paste.

---

## 0. Pre-flight checklist (must be 100% green before PR)

### Package integrity
- [ ] `package.json` `version` = `0.2.2`
- [ ] `server.json` `version` = `0.2.2` and `packages[0].version` = `0.2.2`
- [ ] `server.json` `_meta....tool.version` = `0.2.2`
- [ ] `_meta....tool_count` = `99` and `sum(tool_categories[].count) = 99`
- [ ] `npm view @blockchainacademics/mcp version` returns `0.2.2` (registry propagated)
- [ ] `npx -y @blockchainacademics/mcp` boots clean on a non-dev shell (fresh machine)
- [ ] `LICENSE` present at repo root (MIT)
- [ ] `CHANGELOG.md` has a `0.2.2` entry dated 2026-04-21
- [ ] GitHub tag `v0.2.2` pushed: `git tag -a v0.2.2 -m "v0.2.2" && git push origin v0.2.2`

### Security
- [ ] npm publish token **rotated** after any recent CI/debug use (manual — Wael)
- [ ] `npm pack --dry-run` file list contains **only** `dist/`, `README.md`, `LICENSE`, `CHANGELOG.md`
- [ ] No `.env`, `.npmrc`, or keys in tarball
- [ ] `gitleaks` clean on working tree (`pre-commit run gitleaks --all-files`)

### Known drift to resolve (from audit)
- [ ] README header says "(v0.2.0)" — bump to "(v0.2.2)" (1-char change)
- [ ] Align README category grouping (20 rows) with `server.json._meta.tool_categories` (19 rows) — both total 99
- [ ] Free-tier call count: unify `server.json` ("2,000") with README §API Key ("2,000") — both should match; verify
- [ ] **BLOCKER** `BCA_API_BASE` vs `BCA_API_BASE_URL` drift — `src/client.ts` reads `BCA_API_BASE_URL` but `server.json` declares `BCA_API_BASE`. Decide canonical name, unify in all three (source, server.json, README), republish if needed

### Loom
- [ ] Loom recorded from script in §4 below
- [ ] Loom URL is public (no login required)
- [ ] Loom URL pasted into PR body (replacing `[LOOM_URL]`)

---

## 1. Fork + branch commands (exact)

```bash
# 1. Fork and clone upstream
cd ~
gh repo fork modelcontextprotocol/servers --clone --remote
cd servers

# 2. Sync main with upstream (safety)
git fetch upstream
git checkout main
git merge --ff-only upstream/main

# 3. Create branch
git checkout -b add-blockchainacademics-mcp

# 4. Inspect current format on main — READ FIRST, EDIT SECOND
less README.md    # find the Community Servers section; note bullet vs table
# Also check whether a manifest file exists:
ls -la | grep -Ei 'servers\.(json|ya?ml)|community' || echo "no manifest — README only"

# 5. Edit README.md (and/or manifest) using the entries in SUBMISSION_ENTRY.json.
#    Insert alphabetically under "B" (sorts as "Blockchain Academics").
$EDITOR README.md

# 6. Verify diff is minimal — single-line addition to README
git diff --stat      # expect: README.md | 1 +   (or manifest | N + if manifest style)
git diff README.md   # eyeball exact line

# 7. Commit
git add README.md    # add the manifest file too if that's the upstream format
git commit -m "Add @blockchainacademics/mcp — crypto news, entities, indicators (99 tools)"

# 8. Push to fork
git push -u origin add-blockchainacademics-mcp

# 9. Write PR body to temp file (§3 below) WITH LOOM URL FILLED IN
$EDITOR /tmp/bca-mcp-pr-body.md

# 10. Open PR
gh pr create \
  --repo modelcontextprotocol/servers \
  --base main \
  --head "$(gh api user -q .login):add-blockchainacademics-mcp" \
  --title "Add @blockchainacademics/mcp — crypto news, entities, indicators (99 tools)" \
  --body-file /tmp/bca-mcp-pr-body.md

# 11. Copy the PR URL from stdout. Done.
```

---

## 2. PR title (exact, <70 chars)

```
Add @blockchainacademics/mcp — crypto news, entities, indicators (99 tools)
```

---

## 3. PR body (ready to paste — replace `[LOOM_URL]` only)

```markdown
## Summary

Adds **Blockchain Academics** — a production MCP server that gives AI agents
ground-truth crypto data. 99 tools across news, market, on-chain, sentiment,
proprietary indicators, and async agent-backed research jobs. Wraps
`api.blockchainacademics.com`; every response carries `cite_url`, `as_of`, and
`source_hash` so downstream agents can attribute and verify.

## Links

- npm: https://www.npmjs.com/package/@blockchainacademics/mcp
- Source: https://github.com/blockchainacademics/bca-mcp
- API: https://api.blockchainacademics.com (free tier: 2,000 calls/month)
- Docs: https://docs.blockchainacademics.com

## Install (one-liner)

```bash
npx -y @blockchainacademics/mcp
```

Or in `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "blockchainacademics": {
      "command": "npx",
      "args": ["-y", "@blockchainacademics/mcp"],
      "env": { "BCA_API_KEY": "bca_live_xxxxxxxxxxxxxxxx" }
    }
  }
}
```

## Example tool calls

**1. `search_news`** — full-text search across 3,501+ editorial crypto articles

Call:
```json
{ "name": "search_news",
  "arguments": { "query": "Bitcoin ETF approvals", "since": "2026-03-22T00:00:00Z", "limit": 3 } }
```

Response (truncated):
```json
{
  "data": {
    "results": [
      { "title": "SEC greenlights second wave of spot BTC ETFs",
        "slug": "sec-second-wave-btc-etfs",
        "published_at": "2026-04-08T14:22:11Z",
        "url": "https://blockchainacademics.com/news/sec-second-wave-btc-etfs" }
    ],
    "count": 3
  },
  "attribution": {
    "cite_url": "https://blockchainacademics.com/news?q=Bitcoin+ETF+approvals",
    "as_of": "2026-04-21T09:15:02Z",
    "source_hash": "sha256:c8a4…e1b7"
  }
}
```

**2. `get_entity`** — canonical dossier for a person/project/protocol

Call:
```json
{ "name": "get_entity", "arguments": { "ticker": "ETH" } }
```

Response (truncated):
```json
{
  "data": {
    "slug": "ethereum",
    "name": "Ethereum",
    "type": "protocol",
    "summary": "Smart-contract platform launched 2015…",
    "canonical_ticker": "ETH",
    "recent_mentions": 284
  },
  "attribution": {
    "cite_url": "https://blockchainacademics.com/entities/ethereum",
    "as_of": "2026-04-21T09:15:02Z",
    "source_hash": "sha256:1f92…9d04"
  }
}
```

**3. `get_coverage_index`** — proprietary editorial coverage index for an entity

Call:
```json
{ "name": "get_coverage_index", "arguments": { "entity": "solana", "window": "7d" } }
```

Response (truncated):
```json
{
  "data": {
    "entity": "solana",
    "window": "7d",
    "coverage_index": 72.4,
    "rank": 3,
    "delta_vs_30d_avg": "+18.2%"
  },
  "attribution": {
    "cite_url": "https://blockchainacademics.com/indicators/coverage-index?entity=solana",
    "as_of": "2026-04-21T09:15:02Z",
    "source_hash": "sha256:b703…4ac1"
  }
}
```

## Demo

60-second walkthrough (Claude Desktop → `search_news` → cited response):
**[LOOM_URL]**

## Verification

- `npx -y @blockchainacademics/mcp` — installs and boots cleanly
- `server.json` conforms to the 2025-09-01 MCP registry schema
- MIT licensed, TypeScript, stdio transport, zero runtime crashes
  (all errors surface as MCP responses with `isError: true`)
- Live-tested against `api.blockchainacademics.com` before each release
  ([CHANGELOG](https://github.com/blockchainacademics/bca-mcp/blob/main/CHANGELOG.md))

## Graceful degradation

Tools for pending integrations (Twitter, DEXTools, bonk.fun, Bittensor) return
`{status: "integration_pending", reason, eta}` rather than failing, so the full
99-tool surface is usable today.

## Maintainer

Blockchain Academics — dev@blockchainacademics.com
Responding to review feedback within 24h.
```

---

## 4. 60-second Loom script (word-for-word)

**Before you hit record:**
1. Close Claude Desktop.
2. Open `~/Library/Application Support/Claude/claude_desktop_config.json` in a visible editor (VS Code / Cursor / nvim).
3. Copy a valid `BCA_API_KEY` (format `bca_live_...`) to clipboard.
4. Start Loom (or QuickTime) at 1080p, **window mode** (not full screen — smaller file).
5. Recording target length: 60 seconds. Do not go over 75.

---

### BEAT 1 — 0:00–0:10 — The config

**On-screen cue:** your editor with `claude_desktop_config.json` visible, empty `mcpServers` or ready to paste.

**Say (verbatim):**
> "This is at-blockchainacademics-slash-mcp — ninety-nine crypto tools for Claude. One config block. Watch."

**Do:** Paste this into the file and hit save. Camera should see the paste land.

```json
{
  "mcpServers": {
    "blockchainacademics": {
      "command": "npx",
      "args": ["-y", "@blockchainacademics/mcp"],
      "env": { "BCA_API_KEY": "bca_live_xxxxxxxxxxxxxxxx" }
    }
  }
}
```

---

### BEAT 2 — 0:10–0:20 — Restart Claude Desktop

**On-screen cue:** Cmd+Q on Claude, relaunch. The tool/hammer icon populates.

**Say (verbatim):**
> "Restart Claude. Ninety-nine tools load under blockchainacademics."

**Do:** Click the hammer icon. Scroll briefly so viewer sees the long list.

---

### BEAT 3 — 0:20–0:35 — Ask a real question

**On-screen cue:** New chat. Type this prompt verbatim:

```
Search crypto news about Bitcoin ETF approvals in the last 30 days, cite your sources.
```

**Say (verbatim):**
> "Ask it about a recent Bitcoin ETF story. Claude will pick the tool itself."

**Do:** Hit enter.

---

### BEAT 4 — 0:35–0:50 — Tool call is visible

**On-screen cue:** Claude invokes `search_news`. Click to expand the tool-call UI.

**Say (verbatim):**
> "Tool call — search underscore news. Here's the exact arguments Claude built, here's the raw response from our API."

**Do:** Hover briefly so viewer sees:
- Tool name: `search_news`
- Arguments with a real `since` date and `limit: 5`
- Raw response showing article titles and an `attribution` block

---

### BEAT 5 — 0:50–1:00 — Cited response + the close

**On-screen cue:** Scroll to Claude's answer. Hover over one of the inline citations so the underlying `cite_url` tooltip shows `blockchainacademics.com/...`. Then briefly scroll back to the raw tool response and highlight the `as_of` timestamp and `source_hash`.

**Say (verbatim):**
> "Every response — cite URL, timestamp, source hash. Ground truth for agents. Link in the PR. That's it."

**Do:** Stop the recording. Export 1080p. Get the public Loom link. Paste into PR body §3 replacing `[LOOM_URL]`.

---

## 5. After the PR is open

- [ ] Respond to reviewer comments within 24h
- [ ] If reviewer requests a format change, make the edit on `add-blockchainacademics-mcp` and push — PR updates automatically
- [ ] On merge: post the PR link in `#launches` internal channel and tweet from `@blockchainacad`
- [ ] Update `~/BCA_Intelligence/05_Intelligence/` with the merged PR URL as provenance

---

**Prep owner:** Studio Producer agent (this doc)
**Execution owner:** Wael — Loom + PR
**Status:** Ready pending Loom recording
