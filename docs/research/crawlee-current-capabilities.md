# Crawlee current capabilities (research note)

- **Date researched:** 2026-07-13
- **Versions selected:** `crawlee@3.17.0`, `playwright@^1.51`, Node 20+

## Official sources

- https://crawlee.dev/js/docs/quick-start
- https://www.npmjs.com/package/crawlee
- https://github.com/apify/crawlee/releases (v3.17.0, 2026-06-04)
- https://crawlee.dev/js/api/core

## Stable capabilities used

- `CheerioCrawler` for HTTP/HTML crawling
- `PlaywrightCrawler` for JS rendering and screenshots
- Local storage via `CRAWLEE_STORAGE_DIR` / per-run directories
- Request queues, retries, concurrency controls, `maxRequestsPerCrawl`
- `enqueueLinks` with same-domain strategy
- Playwright resource blocking (images/fonts/media) in browser mode

## Experimental / optional (not default)

- `AdaptivePlaywrightCrawler` — excluded from MVP; browser fallback uses deterministic quality checks instead
- Stagehand / AI-assisted crawling — disabled unless `CRAWLEE_STAGEHAND_ENABLED=true` and keys are configured
- Apify Cloud deployment — documented as future adapter only

## Deliberately excluded

- CAPTCHA solving, login bypass, paywall bypass
- Required Apify Cloud storage
- LLM-based structured extraction (deterministic CSS schema only in MVP)

## Upgrade risks

- Crawlee 3.x API changes around browser hooks and storage paths
- Playwright browser binary updates (`pnpm exec playwright install`)
- MCP SDK tool registration schema changes
