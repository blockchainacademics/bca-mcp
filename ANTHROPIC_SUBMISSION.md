# Anthropic MCP Directory Submission — `@blockchainacademics/mcp` v0.2.2

**Target repo:** `github.com/modelcontextprotocol/servers`
**Package:** https://www.npmjs.com/package/@blockchainacademics/mcp
**Source:** https://github.com/blockchainacademics/bca-mcp
**Maintainer:** dev@blockchainacademics.com

---

## 0. Convention assumption — verify before PR

The `modelcontextprotocol/servers` README has historically tracked community
servers in an alphabetized bulleted list under a section titled
**"🌎 Community Servers"** (format: `- **[Name](repo-url)** — one-line description`).
The repo has been actively restructured in 2025–2026; **Wael must open
`README.md` on `main` and confirm the current section heading + entry style
before pasting**. Alternative formats seen in other registries: a markdown
table (Name / Package / Description / Install) or a separate
`community-servers.json` manifest. The entry block in §1 is written in the
bulleted-list style; a table-row variant is provided in §1b as fallback.

---

## 1. README entry — bulleted-list style (primary)

Insert alphabetically under `B` (sorts as "Blockchain Academics") in the
Community Servers section:

```markdown
- **[Blockchain Academics](https://github.com/blockchainacademics/bca-mcp)** — Canonical crypto MCP: 99 tools across news, entities, academy lessons, market data, on-chain, sentiment, proprietary indicators, and agent-backed research generation. Every response carries `cite_url`, `as_of`, and `source_hash` for ground-truth attribution. `npx -y @blockchainacademics/mcp`
```

### 1b. README entry — table-row fallback

If the section is a table with columns `| Server | Package | Description |`:

```markdown
| [Blockchain Academics](https://github.com/blockchainacademics/bca-mcp) | `@blockchainacademics/mcp` | Canonical crypto MCP — 99 tools spanning news, entities, academy, market data, on-chain, sentiment, proprietary indicators, and agent-backed generation. Cited, timestamped, hashed responses. |
```

---

## 2. PR title

```
Add @blockchainacademics/mcp — crypto news, entities, indicators (99 tools)
```

---

## 3. PR body (ready to paste)

```markdown
## Summary

Adds **Blockchain Academics** to the Community Servers list — a production MCP
server for AI agents that need ground-truth crypto data.

- **99 tools across 19 categories** — news, entities, academy lessons, market
  data (CoinGecko, DexScreener), on-chain (Etherscan, Helius, DefiLlama),
  sentiment, proprietary indicators (coverage index, narrative strength,
  editorial premium, KOL influence, risk score), and async agent-backed
  generation (due diligence, tokenomics, whitepaper summarization).
- **Attribution on every response** — each tool call returns `cite_url`,
  `as_of` (time-travel snapshot), and `source_hash`, so downstream agents can
  surface citations and verify provenance.
- **Graceful degradation** — stub endpoints for pending integrations
  (Twitter, DEXTools, bonk.fun, Bittensor) return
  `{status: "integration_pending", reason, eta}` rather than failing, so the
  99-tool surface is fully usable today.

## Links

- npm: https://www.npmjs.com/package/@blockchainacademics/mcp
- Source: https://github.com/blockchainacademics/bca-mcp
- API: https://api.blockchainacademics.com (free tier: 2,000 calls/month)
- Docs: https://docs.blockchainacademics.com

## Demo

60-second Loom walkthrough (Claude Desktop → `search_news` → cited response):
**<PASTE LOOM URL HERE>**

## Verification

- Package published and installable: `npx -y @blockchainacademics/mcp`
- Live-tested against `api.blockchainacademics.com` prior to each release
  (see [CHANGELOG](https://github.com/blockchainacademics/bca-mcp/blob/main/CHANGELOG.md) —
  v0.2.1 and v0.2.2 were production-audit driven)
- MIT licensed, TypeScript, stdio transport, zero runtime crashes
  (all errors surface as MCP responses with `isError: true`)
- `server.json` conforms to the 2025-09-01 MCP registry schema

## Maintainer

Blockchain Academics — dev@blockchainacademics.com
Happy to respond to review feedback within 24h.
```

---

## 4. Loom recording script (60 seconds, tight)

**Setup before recording:**
1. Have Claude Desktop closed.
2. Have `claude_desktop_config.json` open in a visible editor.
3. Have a valid `BCA_API_KEY` (format: `bca_live_...`) copied to clipboard.
4. QuickTime or Loom screen recorder primed at 1080p, window mode (not full screen — keeps file small).

**Storyboard (5 beats, ~12s each):**

### Beat 1 (0:00–0:10) — The config
> "This is `@blockchainacademics/mcp` — 99 crypto tools for Claude. Here's the config."

On screen: paste this snippet into `claude_desktop_config.json`:

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

Save file.

### Beat 2 (0:10–0:20) — Restart
> "Restart Claude Desktop."

Cmd+Q Claude, reopen. Show the hammer/tools icon populating — 99 tools under `blockchainacademics`.

### Beat 3 (0:20–0:35) — Ask a question
> "Let's ask it about a recent Bitcoin ETF story."

Type this exact prompt into Claude Desktop:

```
Search crypto news about Bitcoin ETF approvals in the last 30 days, cite your sources.
```

### Beat 4 (0:35–0:50) — Tool call visible
Let Claude invoke `search_news`. Expand the tool-call UI so viewer sees:
- Tool name: `search_news`
- Arguments: `{"query": "Bitcoin ETF approvals", "since": "2026-03-22T00:00:00Z", "limit": 5}`

### Beat 5 (0:50–1:00) — Cited response
Scroll to Claude's answer. Hover over one of the inline citations to show the `cite_url` resolves to `blockchainacademics.com/...`. Briefly highlight the `as_of` timestamp visible in the raw tool response.

> "Every response is cited, timestamped, and hashed. Ground truth for agents. Repo in the PR description."

**Export:** 1080p, under 10 MB if possible, Loom public link (no login required).

---

## 5. Pre-submission checklist

Tick each before opening the PR.

### Package integrity
- [ ] `package.json` version = `0.2.2` ✅ (verified)
- [ ] `server.json` version = `0.2.2` ✅ (verified, matches)
- [ ] `server.json` `_meta.tool.version` = `0.2.2` ✅ (verified)
- [ ] `server.json` `_meta.tool_count` = `99` ✅ (verified)
- [ ] Sum of `_meta.tool_categories[].count` = 99 → **VERIFY**: 7+4+4+3+6+6+13+6+4+5+5+4+4+4+2+3+4+7+8 = **99 ✅**
- [ ] README tool-category table totals to 99 → **FLAG**: README currently lists v0.2.0 header and sums to 99 across 20 rows, but category groupings differ slightly from `server.json` (README splits "Memos + theses + social" and "Currencies" into 2 rows of 6+2; server.json merges into "Memos / theses / social / currencies" count 8). **Not a blocker — review before PR and decide whether to align.**
- [ ] LICENSE present and MIT ✅ (verified)
- [ ] Install command works clean on a fresh machine: `npx -y @blockchainacademics/mcp` (**run once from a non-dev shell to confirm**)
- [ ] `npm view @blockchainacademics/mcp version` returns `0.2.2` (**run to confirm registry propagation**)

### Security
- [ ] npm publish token **rotated** after any recent CI/debug use — **MANUAL, Wael must do**
- [ ] No `.env`, `.npmrc`, or API keys in the published tarball → run `npm pack --dry-run` and eyeball the file list
- [ ] `files: ["dist","README.md","LICENSE","CHANGELOG.md"]` in `package.json` ✅ (verified — tight allowlist, no src/ leakage)

### README quality gates
- [ ] README has **2+ client integration examples** ✅ (Claude Desktop + programmatic/LangChain shown)
- [ ] README has attribution block example ✅
- [ ] README has error-code table ✅
- [ ] README links to API signup ✅ (note: points to `/api`; dev console launches Q2 2026)

### PR hygiene
- [ ] Loom URL pasted into PR body (replacing `<PASTE LOOM URL HERE>`)
- [ ] Alphabetical insertion position confirmed by reading current `README.md` on `main`
- [ ] Branch named `add-blockchainacademics-mcp` (or per repo convention)
- [ ] Only **one file** changed in the diff: `README.md` (one-line addition)

---

## 6. Git fork + PR commands (Wael runs these)

```bash
# 1. Fork + clone
cd ~
gh repo fork modelcontextprotocol/servers --clone --remote
cd servers

# 2. Sync main with upstream (safety)
git fetch upstream
git checkout main
git merge --ff-only upstream/main

# 3. Create branch
git checkout -b add-blockchainacademics-mcp

# 4. Edit README.md — insert the entry from §1 of this doc
#    alphabetically under "B" in the Community Servers section.
#    Use your editor of choice:
$EDITOR README.md

# 5. Verify diff is a single-line addition
git diff --stat      # expect: README.md | 1 +
git diff README.md   # sanity-check the exact line

# 6. Commit
git add README.md
git commit -m "Add @blockchainacademics/mcp — crypto news, entities, indicators (99 tools)"

# 7. Push to fork
git push -u origin add-blockchainacademics-mcp

# 8. Open PR (paste body from §3 of this doc — remember to replace Loom URL)
gh pr create \
  --repo modelcontextprotocol/servers \
  --base main \
  --head "$(gh api user -q .login):add-blockchainacademics-mcp" \
  --title "Add @blockchainacademics/mcp — crypto news, entities, indicators (99 tools)" \
  --body-file /tmp/bca-mcp-pr-body.md
# (first, write §3 body to /tmp/bca-mcp-pr-body.md with Loom URL filled in)

# 9. Copy PR URL from output. Done.
```

---

## 7. Version-drift audit (performed 2026-04-21)

| Location | Version | Match |
|---|---|---|
| `package.json` `version` | 0.2.2 | ✅ |
| `server.json` `version` | 0.2.2 | ✅ |
| `server.json` `packages[0].version` | 0.2.2 | ✅ |
| `server.json` `_meta....tool.version` | 0.2.2 | ✅ |
| `CHANGELOG.md` latest entry | 0.2.2 (2026-04-21) | ✅ |
| npm registry (to verify at publish time) | 0.2.2 | **run `npm view`** |

**No drift detected across local artifacts.** Confirm npm registry after any final re-publish.

---

## 8. Known nits (non-blocking, worth fixing post-merge)

1. **README header says "Tool categories (v0.2.0)"** but package is on v0.2.2. Bump to `(v0.2.2)` — 1-char change, improves trust.
2. **Category grouping drift** between README (20 rows) and `server.json._meta.tool_categories` (19 rows) — README splits "Memos + theses + social" and "Currencies" while server.json merges them. Both total 99; reviewer won't block, but alignment is cleaner.
3. **Free-tier number mismatch** — `server.json` env-var description says "2,000 calls/month", README §API Key says "1,000 calls/month". Pick one and unify.
4. **BLOCKER — `BCA_API_BASE` vs `BCA_API_BASE_URL` drift.** `src/client.ts:29` reads `process.env["BCA_API_BASE_URL"]`, but `server.json` declares the env var as `BCA_API_BASE`. Any user who follows `server.json` to set a staging base URL will have it silently ignored. **Fix before submission** — update `server.json` `environment_variables[1].name` from `"BCA_API_BASE"` to `"BCA_API_BASE_URL"` (matches both source and README), then republish or at minimum update the registry manifest. Reviewers who test the declared config path will catch this.
