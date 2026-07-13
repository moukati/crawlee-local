# Security and ethics

## Access restrictions

This tool does **not** implement CAPTCHA solving, paywall bypass, login bypass, or fingerprint evasion.

## Robots

- Fetches and evaluates `robots.txt` by default
- Disallowed paths are blocked
- Missing robots data is treated as unknown, not blanket permission
- Overrides require explicit `policyOverride.skipRobots` (discouraged)

## Rate and scope limits

Default limits: 20 pages, depth 1, same-domain, timeouts, response/file size caps.

## Personal data

Do not collect unnecessary personal information. Avoid storing raw HTML unless requested.

## Logging

Authorization headers, cookies, and secrets are redacted from logs.

## Retention

Use `pnpm dev runs clean --older-than 30` to prune old run directories.

## Human approval

Use manual review when crawl scope, legal exposure, or site terms are unclear.
