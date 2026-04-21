# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in `@blockchainacademics/mcp`, please report it **privately** — **do not open a public GitHub issue**.

**Email:** `security@blockchainacademics.com`

Please include:

- A description of the vulnerability and its potential impact
- Steps to reproduce (proof-of-concept if possible)
- The affected package version (`npm view @blockchainacademics/mcp version`) or commit SHA
- Your name and (optional) a way to credit you in the advisory

We will acknowledge your report within **2 business days** and provide a status update within **7 days**.

## Supported Versions

This package is published to npm. We support the most recent minor version line.

| Version  | Supported          |
| -------- | ------------------ |
| `0.2.x`  | :white_check_mark: |
| `0.1.x`  | :x: (superseded)   |
| `< 0.1`  | :x:                |

Critical security fixes are published as patch releases to the current minor line and, where feasible, backported to the previous minor line.

## Disclosure Policy

We follow **coordinated disclosure** with a **90-day** window:

1. **Day 0** — Report received, acknowledgement sent.
2. **Day 1–7** — Triage, severity scoring (CVSS), initial fix plan shared with reporter.
3. **Day 7–60** — Fix implemented, tested, patch release published to npm.
4. **Day 60–90** — Reporter validates fix; public advisory drafted.
5. **Day 90 (or earlier by mutual agreement)** — Public disclosure via GitHub Security Advisory and npm deprecation notice for affected versions if warranted.

If a vulnerability is being actively exploited in the wild, we will accelerate disclosure.

## Safe Harbor

We will not pursue legal action against researchers who:

- Report vulnerabilities in good faith via the channel above
- Do not access, modify, or destroy data beyond what is strictly necessary to demonstrate the issue
- Give us a reasonable chance to remediate before public disclosure

## PGP / Encrypted Reporting

For highly sensitive reports, encrypt to the following key:

```
-----BEGIN PGP PUBLIC KEY BLOCK-----

<!-- TODO: publish production PGP key for security@blockchainacademics.com
     and paste the ASCII-armored public key here. Until then, the email
     channel above is accepted without encryption. -->

-----END PGP PUBLIC KEY BLOCK-----
```

Fingerprint: `TODO — populate once key is generated`

## Scope

**In scope:**

- Source code in this repository
- Published npm artifacts at `@blockchainacademics/mcp`
- The MCP protocol surface exposed by tools in `src/tools/`

**Out of scope:**

- Upstream API endpoints the MCP server proxies to (reported to `blockchainacademics-api` project)
- The Model Context Protocol specification itself (report to `modelcontextprotocol/specification`)
- Third-party dependencies with their own disclosure channels — use GitHub's "Report a vulnerability" against the upstream project

## Credits

Security researchers who report valid issues will be credited in the published advisory (unless they request anonymity).
