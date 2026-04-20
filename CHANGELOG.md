# Changelog

All notable changes to `@blockchainacademics/mcp` are documented here.

This project follows [Semantic Versioning](https://semver.org/) and [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.1.0] — 2026-04-19

### Added
- Initial release with stdio transport.
- `search_news` tool — full-text search over the BCA editorial corpus.
- `get_entity` tool — canonical entity dossiers by slug or ticker.
- `get_explainer` tool — canonical academy lessons by slug or topic.
- Typed HTTPS client with `BCA_API_KEY` header injection and 20s timeout.
- Structured error taxonomy (`BCA_AUTH`, `BCA_RATE_LIMIT`, `BCA_UPSTREAM`, `BCA_NETWORK`, `BCA_BAD_REQUEST`).
- Attribution surfacing (`cite_url`, `as_of`, `source_hash`) on every tool response.
- Smoke test suite using `node:test` with mocked `fetch`.
