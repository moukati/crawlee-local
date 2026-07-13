# AGENTS.md — Crawlee Local

Local Crawlee scraping engine (CLI + MCP) connected to BusinessBrain.

## Hub connection

- Hub root: `D:\BusinessBrain`
- Project key: `crawlee-local`
- Manifest: `projects/crawlee-local.project.yaml` (in hub)
- Decision matrix: `.brain/07_agents/crawlee-decision-matrix.md`

## When to use this repo

Use Crawlee Local for controlled local crawls, browser rendering, structured extraction, and Firecrawl fallback — **not** for general web search (use Exa) or default single-page markdown (use Firecrawl first).

## Commands

```bash
pnpm install && pnpm setup && pnpm doctor
pnpm test && pnpm test:integration && pnpm build
pnpm dev fetch --url "https://example.com"
```

MCP entry: `pnpm dev:mcp` or `node dist/mcp/server.js`

## Safety

Every crawl needs domain scope and page/depth budgets. Do not bypass robots, login walls, or paywalls.
