# Crawlee Local

**Local web crawling for humans and AI agents** — HTTP and browser modes, structured extraction, safety limits, CLI + MCP.

Use this when you want a **self-hosted, token-free** crawler you can run on your machine and hand to Cursor, Claude, Codex, or any MCP-compatible agent.

Built on [Crawlee](https://crawlee.dev/) 3.x + Playwright. No Apify Cloud required.

---

## Why this exists

| Need | Use |
|------|-----|
| Search / discover URLs | A search API (Exa, Serp, etc.) — **not** this tool |
| One page → clean markdown | A managed scraper (Firecrawl, etc.) if it works for your site |
| **Recursive crawl, JS pages, custom extraction, local runs** | **Crawlee Local** |

Crawlee Local is the **controlled local layer**: same-domain crawls with budgets, robots checks, HTTP-first with automatic browser fallback, and normalized JSON results.

---

## Quick start

**Requirements:** Node.js 20+, pnpm (or npm), ~500 MB for Chromium (browser mode).

```bash
git clone https://github.com/moukati/crawlee-local.git
cd crawlee-local
pnpm install
pnpm setup          # installs Playwright Chromium
pnpm doctor         # verify install
pnpm build
```

Fetch a page:

```bash
node dist/cli/index.js fetch --url "https://example.com" --strategy auto
```

Or during development:

```bash
pnpm dev fetch --url "https://example.com"
```

---

## Documentation

| Doc | Audience | Contents |
|-----|----------|----------|
| **[AGENTS.md](./AGENTS.md)** | AI agents | When to use, MCP tools, CLI, safety, result format — **start here if you are an agent** |
| [docs/getting-started.md](./docs/getting-started.md) | Humans | Install, first crawl, inspect results |
| [docs/mcp-setup.md](./docs/mcp-setup.md) | Humans | Cursor, Claude Desktop, generic MCP clients |
| [docs/agent-runbook.md](./docs/agent-runbook.md) | Agents / power users | Planning crawls, budgets, debugging |
| [docs/decision-matrix.md](./docs/decision-matrix.md) | Everyone | When to use this vs search APIs vs managed scrapers |
| [docs/security-and-ethics.md](./docs/security-and-ethics.md) | Everyone | Robots, limits, what not to crawl |
| [docs/architecture.md](./docs/architecture.md) | Contributors | Internals overview |

---

## CLI reference

```bash
# Health check
node dist/cli/index.js doctor

# Single page (auto = HTTP first, browser fallback if needed)
node dist/cli/index.js fetch --url "https://example.com" --strategy auto

# Recursive crawl (same domain, strict limits)
node dist/cli/index.js crawl --url "https://example.com" --max-pages 20 --max-depth 1

# Structured extraction with CSS schema
node dist/cli/index.js extract --url "https://example.com/pricing" --schema ./schemas/pricing-page.json

# Sitemap discovery
node dist/cli/index.js sitemap --url "https://example.com/sitemap.xml"

# Download a public file
node dist/cli/index.js download --url "https://example.com/report.pdf"

# Screenshot (browser mode)
node dist/cli/index.js screenshot --url "https://example.com"

# Inspect past runs
node dist/cli/index.js runs list
node dist/cli/index.js runs inspect <run-id>
```

All commands return a normalized **JSON** `CrawlRunResult` to stdout. Logs go to stderr.

---

## MCP (for AI agents)

Seven tools over stdio MCP:

| Tool | Purpose |
|------|---------|
| `crawlee_health` | Install status, versions, storage path |
| `crawlee_fetch` | Single-page fetch/extract |
| `crawlee_crawl` | Multi-page crawl with limits |
| `crawlee_extract` | CSS-schema structured extraction |
| `crawlee_sitemap` | Parse sitemap.xml |
| `crawlee_download` | Download public files locally |
| `crawlee_run_status` | Load a prior run by ID |

**Cursor** — copy [`.cursor/mcp.json`](./.cursor/mcp.json) or add:

```json
{
  "mcpServers": {
    "crawlee-local": {
      "command": "node",
      "args": ["dist/mcp/server.js"],
      "cwd": "/absolute/path/to/crawlee-local"
    }
  }
}
```

Run `pnpm build` first. Full setup: [docs/mcp-setup.md](./docs/mcp-setup.md).

**Give your agent this repo:** point it at `AGENTS.md` or say *"Read https://github.com/moukati/crawlee-local/blob/main/AGENTS.md and use the MCP tools."*

---

## Crawler strategies

| Strategy | Engine | When |
|----------|--------|------|
| `http` | CheerioCrawler | Static HTML, docs, blogs |
| `browser` | PlaywrightCrawler | JS-rendered pages, screenshots |
| `auto` | HTTP → browser fallback | Default; falls back only when quality checks fail |

Fallback reasons are included in every result (`strategy.fallbackReasons`).

---

## Default safety limits

- **20 pages**, **depth 1**, same-domain unless you expand `allowedDomains`
- Robots.txt evaluated by default
- Auth/checkout/admin paths blocked
- Response and file size caps
- No CAPTCHA, login, or paywall bypass

See [docs/security-and-ethics.md](./docs/security-and-ethics.md).

---

## Result format

Every run returns `CrawlRunResult` JSON:

```json
{
  "runId": "uuid",
  "status": "completed",
  "strategy": {
    "requestedStrategy": "auto",
    "selectedStrategy": "http",
    "fallbackOccurred": false,
    "fallbackReasons": []
  },
  "pages": [{ "title": "...", "text": "...", "markdown": "...", "links": {} }],
  "storage": { "runDirectory": "~/.crawlee-local/storage/runs/<runId>" }
}
```

Runs are persisted under `~/.crawlee-local/storage/runs/` with `result.json`, `summary.md`, and `pages.jsonl`.

---

## Development

```bash
pnpm lint
pnpm typecheck
pnpm test              # unit
pnpm test:integration  # HTTP + browser + fixture server
pnpm test:mcp          # protocol-level MCP client test
pnpm smoke:cli         # build + doctor + live fetch
```

---

## Examples

- [examples/single-page-extraction.mjs](./examples/single-page-extraction.mjs) — programmatic fetch
- [examples/firecrawl-fallback.mjs](./examples/firecrawl-fallback.mjs) — quality-check then local fallback pattern
- [schemas/pricing-page.json](./schemas/pricing-page.json) — structured extraction schema

---

## License

[MIT](./LICENSE)

---

## Credits

Built with [Crawlee](https://crawlee.dev/) by Apify, [Playwright](https://playwright.dev/), and the [Model Context Protocol](https://modelcontextprotocol.io/).
