# Decision matrix

When should you use Crawlee Local vs other tools?

## API first

Use an **official API** when the target service exposes the data you need reliably and usage is permitted.

## Search / discovery

Use a **search or semantic discovery API** (Exa, Serp, etc.) when you need to find URLs or sources. Crawlee Local is **not** a search engine.

## Managed single-page extraction

Use a **managed scraper** (Firecrawl, Bright Data scrape API, etc.) when:

- You have a known public URL
- You want clean markdown quickly
- The site works well with that service
- No custom traversal or browser interaction is needed

## Crawlee Local

Use when:

- A managed scraper failed, timed out, or returned incomplete content
- You need **local execution** (no API tokens for crawling itself)
- **Recursive** same-domain crawl with strict budgets
- **JavaScript rendering** or screenshots
- **Deterministic CSS-schema** extraction you can test locally
- **Public file downloads** with local retention
- You want **full control** over retries, storage, and crawl logic

## Do not use Crawlee Local

- Pure source discovery (use search)
- Bypassing login, CAPTCHA, or paywalls
- Tasks without a clear URL scope and objective
- Crawling when an official API already solves the task

## Strategy selection (within Crawlee Local)

1. **`http`** or **`auto`** first — CheerioCrawler, fast and cheap
2. **`browser`** only when JS rendering is required or auto quality checks fail
3. Always record fallback reasons from the result JSON

## Cost model

| Mode | Cost |
|------|------|
| HTTP | Low CPU/network |
| Browser | Higher memory/CPU; keep concurrency low |
| Managed APIs | Per-request credits; use when sufficient |
