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
| CLI | `src/cli/index.ts` | Human/agent shell commands |
| MCP | `src/mcp/server.ts` | Cursor and MCP-compatible agents |
| Library | `src/index.ts` | Programmatic use and tests |

## Storage flow

Each run creates `~/.crawlee-local/storage/runs/<runId>/` with:

- `result.json`, `summary.md`, `pages.jsonl`
- `pages/` (optional HTML)
- `screenshots/`, `files/`
- `crawlee/` (Crawlee internal storage for that run)

## BusinessBrain connection

- Hub docs: `.brain/07_agents/crawlee-decision-matrix.md`
- Skill: `.agents/skills/crawlee/SKILL.md`
- Rule: `.cursor/rules/crawlee-usage.mdc`
- Asset index entry in `.brain/07_agents/asset-index.md`

## Extension points

- Firecrawl quality adapter (see `examples/firecrawl-fallback.mjs`)
- Knowledge ingestion records via `exportKnowledgeRecords()`
- Optional Stagehand, proxy pools, Apify Actor deployment (future)
