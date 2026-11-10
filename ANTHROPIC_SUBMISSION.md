# Anthropic MCP Directory Submission: `@blockchainacademics/mcp` v0.6.3

**Target repo:** `github.com/modelcontextprotocol/servers`
**Package:** https://www.npmjs.com/package/@blockchainacademics/mcp
**Source:** https://github.com/blockchainacademics/bca-mcp
**Maintainer:** dev@blockchainacademics.com

---

## 0. Convention assumption: verify before PR

The `modelcontextprotocol/servers` README has historically tracked community
servers in an alphabetized bulleted list under a section titled
**"🌎 Community Servers"** (format: `- **[Name](repo-url)** - one-line description`).
The repo has been actively restructured in 2025-2026; **Wael must open
`README.md` on `main` and confirm the current section heading + entry style
before pasting**. Alternative formats seen in other registries: a markdown
table (Name / Package / Description / Install) or a separate
`community-servers.json` manifest. The entry block in §1 is written in the
bulleted-list style; a table-row variant is provided in §1b as fallback.

---

## 1. README entry: bulleted-list style (primary)

Insert alphabetically under `B` (sorts as "Blockchain Academics") in the
Community Servers section:

```markdown
- **[Blockchain Academics](https://github.com/blockchainacademics/bca-mcp)** - Canonical crypto MCP: 105 tools across news, entities, academy lessons, market data, on-chain, sentiment, proprietary indicators, and agent-backed research generation. Every response carries `attribution.citations[]` (cite_url, as_of, source_hash) and an honest `meta.status`. 17 tools work without a key: `npx -y @blockchainacademics/mcp`
```

### 1b. README entry: table-row fallback

If the section is a table with columns `| Server | Package | Description |`:

```markdown
| [Blockchain Academics](https://github.com/blockchainacademics/bca-mcp) | `@blockchainacademics/mcp` | Canonical crypto MCP: 105 tools spanning news, entities, academy, market data, on-chain, sentiment, proprietary indicators, and agent-backed generation. Cited, timestamped, hashed responses. |
```

---

## 2. PR title

```
Add @blockchainacademics/mcp: crypto news, entities, indicators (105 tools)
```

---

## 3. PR body (ready to paste)

```markdown
## Summary

Adds **Blockchain Academics** to the Community Servers list: a production MCP
server for AI agents that need ground-truth crypto data.

- **105 tools across 19 categories**: news, entities, academy lessons (38
  lessons in 8 courses), market data (CoinGecko, DexScreener), on-chain
  (Etherscan, Helius, DefiLlama), sentiment and crypto Twitter, proprietary
  indicators (coverage index, narrative strength, editorial premium, KOL
  influence, risk score), and async agent-backed generation (due diligence,
  tokenomics, whitepaper summarization).
- **Attribution on every response**: each tool call returns
  `attribution.citations[]`, whose first entry is the primary source (the
  upstream page when there is one), each with `cite_url`, `as_of` and
  `source_hash`, so downstream agents can surface citations and verify
  provenance.
- **Honest status**: every answer carries `meta.status` (complete, partial,
  stale or unseeded) with a structured `meta.diagnostic`. Tools whose data
  source is not connected yet answer `unseeded` with a reason rather than
  failing or returning empty data as if it were complete.
- **Zero-config demo**: without a key, 17 tools work under a shared daily
  cap; a free key (2,000 calls a month) opens 52, and paid plans open the
  rest.

## Links

- npm: https://www.npmjs.com/package/@blockchainacademics/mcp
- Source: https://github.com/blockchainacademics/bca-mcp
- API: https://api.blockchainacademics.com (free tier: 2,000 calls/month)
- Docs: https://blockchainacademics.com/crypto-api/docs

## Demo

60-second Loom walkthrough (Claude Desktop → `search_news` → cited response):
**<PASTE LOOM URL HERE>**

## Verification

- Package published and installable: `npx -y @blockchainacademics/mcp`
- Live-tested against `api.blockchainacademics.com` prior to each release
  (see [CHANGELOG](https://github.com/blockchainacademics/bca-mcp/blob/main/CHANGELOG.md):
  v0.2.1, v0.4.0 and v0.6.3 were production-audit driven; 0.6.3 followed a
  probe of every tool on 2026-10-31)
- MIT licensed, TypeScript, stdio transport; every failed tool call returns
  an MCP result with `isError: true` and a JSON error code
- Every tool carries MCP annotations (title, readOnlyHint, openWorldHint)
- `server.json` conforms to the 2025-12-11 MCP registry schema

## Maintainer

Blockchain Academics, dev@blockchainacademics.com
Happy to respond to review feedback within 24h.
```

---

## 4. Loom recording script (60 seconds, tight)

**Setup before recording:**
1. Have Claude Desktop closed.
2. Have `claude_desktop_config.json` open in a visible editor.
3. Have a valid `BCA_API_KEY` (format: `bca_...`) copied to clipboard.
4. QuickTime or Loom screen recorder primed at 1080p, window mode (not full screen, which keeps the file small).

**Storyboard (5 beats, ~12s each):**

### Beat 1 (0:00 to 0:10): The config
> "This is `@blockchainacademics/mcp`: 105 crypto tools for Claude. Here's the config."

On screen: paste this snippet into `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "blockchainacademics": {
      "command": "npx",
      "args": ["-y", "@blockchainacademics/mcp"],
      "env": { "BCA_API_KEY": "bca_xxxxxxxxxxxxxxxx" }
    }
  }
}
```

Save file.

### Beat 2 (0:10 to 0:20): Restart
> "Restart Claude Desktop."

Cmd+Q Claude, reopen. Show the hammer/tools icon populating: 105 tools under `blockchainacademics`.

### Beat 3 (0:20 to 0:35): Ask a question
> "Let's ask it about a recent Bitcoin ETF story."

Type this exact prompt into Claude Desktop:

```
Search crypto news about Bitcoin ETF approvals in the last 30 days, cite your sources.
```

### Beat 4 (0:35 to 0:50): Tool call visible
Let Claude invoke `search_news`. Expand the tool-call UI so viewer sees:
- Tool name: `search_news`
- Arguments: `{"query": "Bitcoin ETF approvals", "since": "<a date 30 days back>T00:00:00Z", "limit": 5}`

### Beat 5 (0:50 to 1:00): Cited response
Scroll to Claude's answer. Hover over one of the inline citations to show the `cite_url` resolves to the source article. Briefly highlight the `as_of` timestamp in `attribution.citations[0]` of the raw tool response.

> "Every response is cited, timestamped, and hashed. Ground truth for agents. Repo in the PR description."

**Export:** 1080p, under 10 MB if possible, Loom public link (no login required).

---

## 5. Pre-submission checklist

Tick each before opening the PR.

### Package integrity
- [ ] `package.json` version = `0.6.3`
- [ ] `server.json` version = `0.6.3` and `packages[0].version` = `0.6.3`
- [ ] `server.json` `_meta.tool.version` = `0.6.3`
- [ ] `server.json` `_meta.tool_count` = `105`
- [ ] Sum of `_meta.tool_categories[].count` = 105: 7+4+4+6+6+6+16+6+4+5+5+4+4+4+2+3+4+7+8 = **105** across 19 categories (`npm run build` refuses to write `tools.json` when a tool is missing from the categories or the total differs)
- [ ] README tool-category table totals to 105 across 19 rows, the same categories and counts as `server.json`
- [ ] LICENSE present and MIT
- [ ] Install command works clean on a fresh machine: `npx -y @blockchainacademics/mcp` (**run once from a non-dev shell to confirm**)
- [ ] `npm view @blockchainacademics/mcp version` returns `0.6.3` (**run to confirm registry propagation**)

### Security
- [ ] npm publish token **rotated** after any recent CI/debug use (**MANUAL, Wael must do**)
- [ ] No `.env`, `.npmrc`, or API keys in the published tarball: run `rm -rf dist && npm run build && npm pack --dry-run` and eyeball the file list
- [ ] `files: ["dist","README.md","LICENSE","CHANGELOG.md","tools.json"]` in `package.json` (tight allowlist, no src/ leakage)

### README quality gates
- [ ] README has **2+ client integration examples** (Claude Desktop + programmatic/LangChain shown)
- [ ] README has the attribution block example (`citations[]`) and the Response status section
- [ ] README has error-code table
- [ ] README links to API signup (https://blockchainacademics.com/crypto-api/signup)

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

# 4. Edit README.md: insert the entry from §1 of this doc
#    alphabetically under "B" in the Community Servers section.
#    Use your editor of choice:
$EDITOR README.md

# 5. Verify diff is a single-line addition
git diff --stat      # expect: README.md | 1 +
git diff README.md   # sanity-check the exact line

# 6. Commit
git add README.md
git commit -m "Add @blockchainacademics/mcp: crypto news, entities, indicators (105 tools)"

# 7. Push to fork
git push -u origin add-blockchainacademics-mcp

# 8. Open PR (paste body from §3 of this doc; remember to replace Loom URL)
gh pr create \
  --repo modelcontextprotocol/servers \
  --base main \
  --head "$(gh api user -q .login):add-blockchainacademics-mcp" \
  --title "Add @blockchainacademics/mcp: crypto news, entities, indicators (105 tools)" \
  --body-file /tmp/bca-mcp-pr-body.md
# (first, write §3 body to /tmp/bca-mcp-pr-body.md with Loom URL filled in)

# 9. Copy PR URL from output. Done.
```

---

## 7. Version-drift audit (updated 2026-11-01)

| Location | Version | Match |
|---|---|---|
| `package.json` `version` | 0.6.3 | ✅ |
| `src/version.ts` `VERSION` | 0.6.3 | ✅ (`npm run version:check`) |
| `server.json` `version` | 0.6.3 | ✅ |
| `server.json` `packages[0].version` | 0.6.3 | ✅ |
| `server.json` `_meta....tool.version` | 0.6.3 | ✅ |
| `CHANGELOG.md` latest entry | 0.6.3 | ✅ |
| npm registry (to verify at publish time) | 0.6.3 | **run `npm view`** |

**No drift across local artifacts.** Confirm npm registry after any final re-publish.

---

## 8. Known nits (non-blocking)

1. **Category grouping**: resolved. The README table and `server.json._meta.tool_categories` list the same 19 categories, 105 tools in all.
2. Resolved since the 0.4.0 audit: the README header no longer carries a version, both free-tier mentions say 2,000 calls a month, and the client reads `BCA_API_BASE` (the name `server.json` declares) with `BCA_API_BASE_URL` still accepted.
