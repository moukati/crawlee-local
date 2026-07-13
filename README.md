# Crawlee Local

Local Crawlee scraping engine with CLI and MCP interfaces for BusinessBrain agents.

## Purpose

Crawlee Local is the controlled, on-machine crawler in the research stack:

- **Exa** — discovery and semantic search
- **Firecrawl** — managed markdown extraction when it works well
- **Crawlee Local** — recursive crawls, browser rendering, structured extraction, downloads, and fallback when managed tools fail

## Quick start

```bash
pnpm install
pnpm setup
pnpm doctor
pnpm example:single-page
```

## CLI

```bash
pnpm dev fetch --url "https://example.com"
pnpm dev crawl --url "https://example.com" --max-pages 20 --max-depth 1
pnpm dev extract --url "https://example.com/pricing" --schema ./schemas/pricing-page.json
pnpm dev sitemap --url "https://example.com/sitemap.xml"
pnpm dev download --url "https://example.com/report.txt"
pnpm dev screenshot --url "https://example.com"
pnpm dev runs list
pnpm dev runs inspect <run-id>
```

After build:

```bash
pnpm build
node dist/cli/index.js doctor
```

## MCP (Cursor)

Add to your Cursor MCP config (project or user):

```json
{
  "mcpServers": {
    "crawlee-local": {
      "command": "node",
      "args": ["D:/Codex/Crawlee/dist/mcp/server.js"],
      "cwd": "D:/Codex/Crawlee"
    }
  }
}
```

Development entry:

```json
{
  "mcpServers": {
    "crawlee-local": {
      "command": "pnpm",
      "args": ["dev:mcp"],
      "cwd": "D:/Codex/Crawlee"
    }
  }
}
```

Tools: `crawlee_health`, `crawlee_fetch`, `crawlee_crawl`, `crawlee_extract`, `crawlee_sitemap`, `crawlee_download`, `crawlee_run_status`.

## Result format

All operations return a normalized `CrawlRunResult` JSON object with:

- run metadata and strategy decision (including fallback reasons)
- page-level text/markdown/metadata/links/extracted fields
- errors and local storage paths

See `docs/architecture.md` and `src/core/result-schema.ts`.

## Safety

Conservative defaults: 20 pages, depth 1, same-domain crawling, robots evaluation, blocked auth/checkout paths, size limits, no CAPTCHA/login bypass.

Read `docs/security-and-ethics.md` before production crawls.

## Tests

```bash
pnpm test
pnpm test:integration
pnpm build
pnpm doctor
```

## BusinessBrain

Canonical decision rules live in BusinessBrain:

- `.brain/07_agents/crawlee-decision-matrix.md`
- `.cursor/rules/crawlee-usage.mdc`
- `.agents/skills/crawlee/SKILL.md`
