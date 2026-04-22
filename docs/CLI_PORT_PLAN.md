# TS CLI Port Plan — `bca` binary for `@blockchainacademics/mcp`

Port the Python `bca` CLI (Typer + rich) to Node/TS so the npm package ships both `bca-mcp` (server) and `bca` (human CLI). Parity over features; minimize deps.

## 1. Command tree map

| Python command | TS notes |
|---|---|
| `bca login [--api-key/-k] [--api-base]` | Prompt via `readline` (hidden input) if `--api-key` omitted; enforce HTTPS unless `BCA_ALLOW_INSECURE_BASE=1`; write `~/.bca/config.toml` with mode `0o600`. |
| `bca config show` | Print config path, masked key, api_base (or default). |
| `bca version` | Print `pkg.version` + `GET /v1/status` live version; catch + yellow warn on network err. |
| `bca news search <query> [-n] [--entity] [--topic] [--since] [--json]` | Call existing `searchNews` tool handler from `src/tools/`. Render table or JSON. |
| `bca entity <slug> [--json]` | Reuse `getEntity` tool; panel render. |
| `bca price <tickers> [--json]` | Split on comma, loop `GET /v1/prices` per ticker via `BcaClient`, table render. |
| `bca market overview [-n] [--json]` | `GET /v1/market/overview?limit=N`, table. |
| `bca explainer <slug> [--json]` | Reuse `getExplainer` tool; render title + markdown body. |
| `bca indicator <name> <entity> [-w 30d] [--json]` | `GET /v1/indicators/:name?entity=&window=`, panel. |
| `bca agent <skill> [--entity --url --source --target --keyword] [--timeout 120] [--json]` | `POST /v1/agent-jobs/:skill/run`, poll `GET /v1/agent-jobs/:job_id` every 2s until `completed|failed|timeout`. Render `output.markdown`/`summary`/`body` or JSON. |

All non-`--json` commands print a `cite_url · as_of=…` dim footer from the envelope.

## 2. Shared vs divergent behavior

**Shared:** same env-var precedence (`BCA_API_KEY`, `BCA_API_BASE`, `BCA_ALLOW_INSECURE_BASE`), same `~/.bca/config.toml` path, same masked key format (`first8…last4`), same HTTPS gate, same error exit codes (1 auth/generic, 124 timeout, 130 SIGINT), same envelope `unwrap(data)` pattern.

**Divergent:**
- No `rich.Markdown` — render markdown as raw text with a couple of ANSI tweaks (`# ` → bold cyan heading, stripped backticks, bullets kept). Good enough; crypto power users pipe through `| glow` if they want.
- No `rich.Panel` — simulate with a simple ASCII box (single top/bottom rule, padded lines) or just a bold title + indented key/value block. Prefer the latter: less code, cleaner copy-paste.
- No `console.status` spinner during agent polling — emit `Polling… (Ns)` status lines with `\r` carriage-return overwrite on a TTY, plain lines otherwise.
- Node has native `fs.chmod(path, 0o600)` — works on POSIX, no-op fallback on win32.

## 3. Config file handling (TOML)

Shape is trivially flat: `api_key = "..."` and optional `api_base = "..."`. **Do not add a TOML dep.** Write a ~30-line hand-rolled reader/writer in `src/cli/config.ts`:
- Writer: `api_key = ${JSON.stringify(v)}\n` — `JSON.stringify` gives valid TOML basic strings for our value domain.
- Reader: split on `\n`, ignore `#` / blank, match `^([a-z_]+)\s*=\s*"(.*)"$`.

If shape ever grows beyond 2-3 string keys, swap in `smol-toml` (zero-dep, 15 KB) — flagged as a future option, not now.

## 4. Output formatting

Skip `cli-table3`. Hand-roll a small `table(headers, rows)` helper in `src/cli/render.ts` (~40 LOC): compute column widths, pad with spaces, dim separator, ANSI color for +/- 24h%. JSON mode is `console.log(JSON.stringify(payload, null, 2))`. ANSI helpers (`bold`, `dim`, `red`, `green`, `cyan`, `yellow`, `magenta`) inline as a 10-line const map using raw escape codes — no `chalk`/`kleur`. Auto-disable colors when `!process.stdout.isTTY` or `NO_COLOR` is set.

## 5. Dependency budget

**Target: 0 new runtime deps.** Use Node built-ins:
- `node:util` → `parseArgs` for flags (Node ≥18.17, already pinned in `engines`).
- `node:readline` → hidden prompt for `login` (mute stdout on keypress).
- `node:fs`, `node:path`, `node:os` → config I/O.
- `node:process` → env, exit codes, TTY detection.

`commander` and `smol-toml` are fallbacks if `parseArgs` subcommand ergonomics bite (it has no native subcommand tree — we dispatch manually on `positionals[0]`). A hand-rolled dispatcher is fine for 10 commands.

## 6. File structure

Split, but shallow. Single-file would hit ~500 LOC and hurt readability.

```
src/cli.ts            # bin entry: shebang, argv dispatch, command registry
src/cli/config.ts     # read/write/apply-env, maskKey, HTTPS gate
src/cli/render.ts     # ansi, table, panel, markdown, citeFooter, asJson, unwrap
src/cli/commands/
  login.ts  version.ts  news.ts  entity.ts
  price.ts  market.ts   explainer.ts  indicator.ts  agent.ts
```

`package.json` → `"bin": { "bca-mcp": "./dist/index.js", "bca": "./dist/cli.js" }`. Add `#!/usr/bin/env node` shebang to `cli.ts`; `tsc` preserves it. Add `cli.ts` to `tsconfig` include and `files` allowlist.

## 7. Test strategy

`node --test` (already in use). Three tiers:
1. **Unit:** config round-trip (write → chmod check → read), `maskKey`, `unwrap`, table formatting snapshot, TOML parser edge cases (quotes, empty).
2. **Command dispatch:** spawn `node dist/cli.js --help`, `bca config show` with fixture `$HOME`, assert exit codes + stdout shape.
3. **Integration (opt-in):** gated on `BCA_CLI_E2E=1`, hits staging for `version`, `price BTC`, `news search bitcoin -n 1`.

Mock `BcaClient` at the module level for command tests — no network in CI default.

## 8. Estimated LOC

| Module | LOC |
|---|---|
| `cli.ts` dispatcher | ~80 |
| `cli/config.ts` | ~70 |
| `cli/render.ts` | ~140 |
| 9 command files | ~40 avg → ~360 |
| Tests | ~200 |
| **Total runtime** | **~650** |

## 9. Acceptance criteria

- `npx @blockchainacademics/mcp bca --help` lists all 10 commands.
- `bca login -k sk_test_…` writes `~/.bca/config.toml` at mode 600; `bca config show` prints `sk_test_…****` masked.
- Env vars override config; HTTPS gate rejects `http://` unless `BCA_ALLOW_INSECURE_BASE=1`.
- Every command has `--json` mode that emits the raw envelope byte-for-byte equivalent to Python.
- Non-JSON output renders a table/panel plus `cite_url · as_of=` footer when envelope has them.
- `bca agent due-diligence --entity ethereum` polls, shows progress on TTY, renders markdown on completion, exits 124 on timeout, exits 1 on failure.
- Exit codes match Python: 0 ok, 1 error/auth, 124 timeout, 130 SIGINT.
- Zero new runtime deps in `package.json`; bundle size delta <20 KB.
- `npm test` green; `npm run build` emits executable `dist/cli.js`.
