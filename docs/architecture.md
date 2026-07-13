# Architecture

## Components

```text
CLI (commander) ──┐
                  ├── CrawlEngine ── policy / strategy / storage
MCP (stdio) ──────┘         │
                             ├── http-crawler (CheerioCrawler)
                             ├── browser-crawler (PlaywrightCrawler)
                             ├── sitemap-crawler
                             └── file-downloader
```

## Interfaces

| Interface | Entry | Purpose |
|-----------|-------|---------|
| CLI | `src/cli/index.ts` | Shell commands for humans and scripts |
| MCP | `src/mcp/server.ts` | AI agents (Cursor, Claude, Codex, etc.) |
| Library | `src/index.ts` | Programmatic use in Node.js |

## Storage flow

Each run creates `~/.crawlee-local/storage/runs/<runId>/`:

- `result.json`, `summary.md`, `pages.jsonl`
- `pages/` (optional HTML)
- `screenshots/`, `files/`
- `crawlee/` (Crawlee internal storage for that run)

## Extension points

- Managed-scraper fallback pattern — see `examples/firecrawl-fallback.mjs`
- Knowledge/RAG export — `exportKnowledgeRecords()` in `src/storage/run-store.ts`
- Future: Stagehand, proxy pools, Apify Actor deployment

## Key modules

| Path | Role |
|------|------|
| `src/core/policy.ts` | Robots, domain allowlist, path blocks |
| `src/core/strategy-selector.ts` | HTTP vs browser decision |
| `src/core/result-schema.ts` | Zod input/output schemas |
| `src/extractors/` | Readable text, metadata, structured CSS extraction |
