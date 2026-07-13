# Agent runbook

## Plan a crawl

1. Confirm an official API does not already solve the task.
2. Use Exa/search to discover URLs if needed.
3. Try Firecrawl or a simple fetch for single static pages.
4. Select Crawlee only with explicit scope: domains, page budget, depth, objective.

## Required inputs

- starting URL(s)
- operation (`fetch`, `crawl`, `extract`, `sitemap`, `download`, `screenshot`)
- strategy (`auto` recommended)
- `maxPages`, `maxDepth`, `allowedDomains`

## Invoke

**MCP:** `crawlee_fetch`, `crawlee_crawl`, etc.

**CLI:**

```bash
pnpm dev crawl --url "https://example.com" --max-pages 20 --max-depth 1
```

## Inspect results

```bash
pnpm dev runs list
pnpm dev runs inspect <run-id>
```

Open `summary.md` in the run directory for a human-readable report.

## Report failures

Include: selected strategy, fallback reasons, blocked URLs, run ID, storage path, and alternatives considered.

## Add a reusable crawler

1. Add schema under `schemas/`
2. Add example script under `examples/`
3. Extend tests in `tests/integration/` using fixture server pages
