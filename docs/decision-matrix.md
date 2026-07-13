# Decision matrix

Canonical copy for agents also lives in BusinessBrain at `.brain/07_agents/crawlee-decision-matrix.md`.

## API first

Use official APIs when they expose the required public data reliably.

## Exa

Use for web search, source discovery, semantic ranking, and finding URLs before extraction.

## Firecrawl

Use for known public URLs needing clean markdown when managed extraction is fast and sufficient.

## Crawlee Local

Use when:

- Firecrawl fails, times out, or returns incomplete content
- recursive same-domain crawl with strict budgets is required
- JavaScript rendering or screenshots are needed
- deterministic structured extraction must be tested locally
- downloads or local retention are required

## Do not use Crawlee

- pure source discovery (use Exa/search)
- bypassing login, CAPTCHA, or paywalls
- tasks without clear URL scope and objective

## Strategy selection

1. HTTP (`CheerioCrawler`) first in `auto` mode
2. Browser (`PlaywrightCrawler`) only when quality checks fail or browser features are requested
3. Report fallback reasons in run metadata

## Cost model

| Mode | Cost |
|------|------|
| HTTP | Low CPU/network |
| Browser | Higher memory/CPU; keep concurrency low |
| Managed (Firecrawl) | API credits; prefer when sufficient |
