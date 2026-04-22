// Single source of truth for the package version shown to upstream BCA API
// (User-Agent header) and advertised in the MCP handshake (Server name/version).
// Keep in sync with package.json on every release — the prepublishOnly script
// in package.json verifies they match.
export const VERSION = "0.2.3";
