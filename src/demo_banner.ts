// Stderr banner emitted once at server startup when the client falls back
// to the demo key (no BCA_API_KEY env var). Stdout is owned by the MCP stdio
// transport, so this MUST stay on stderr.
//
// Three lines, ASCII-only, each terminated with \n. The Python sibling at
// src/bca_mcp/_demo_banner.py must match byte-for-byte. The 16 tools are the
// API's demo allowlist (app/api/v1/_demo_allowlist.py), listed in README.md.

export const DEMO_BANNER =
  "[bca-mcp] Running in DEMO mode: 16 tools work without a key, under a shared daily cap.\n" +
  "[bca-mcp] Get a free key for all tools: https://blockchainacademics.com/crypto-api/signup?ref=mcp-first-run\n" +
  "[bca-mcp] Set: export BCA_API_KEY=bca_...   (or add to your client config)\n";
