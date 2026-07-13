# AGENTS.md — Crawlee Local

> **Repository:** https://github.com/moukati/crawlee-local  
> **Purpose:** Local web crawling via CLI and MCP — HTTP/browser/auto strategy, structured extraction, safety limits.  
> **Read this file first** if a user gave you this repo link and wants crawling or scraping.

---

## When to use this project

Use **Crawlee Local** when the user needs:

- A **local** crawl (no paid scraping API required)
- **Recursive** same-domain crawling with page/depth limits
- **JavaScript-rendered** pages or screenshots
- **Structured extraction** via CSS selector schemas
- **Public file downloads** with local storage
- A **fallback** after a managed scraper returned thin or incomplete content

Do **not** use this project when:

- The task is **web search** or URL discovery → use a search tool (Exa, Serp API, etc.)
- A **single static page** is enough and a managed markdown API already works → use that first
- The target requires **login, CAPTCHA, or paywall bypass** → refuse; this tool does not support that
- There is **no clear URL scope** or crawl objective

---

## Setup (before first use)

```bash
git clone https://github.com/moukati/crawlee-local.git
cd crawlee-local
pnpm install && pnpm setup && pnpm build
pnpm doctor   # must pass (Chromium installed for browser mode)
```

Storage defaults to `~/.crawlee-local/storage/`.

---

## How to invoke

### Option A — MCP (preferred for agents)

Start or connect to the stdio MCP server:

```bash
node dist/mcp/server.js
```

Configure in the user's MCP client (see [docs/mcp-setup.md](./docs/mcp-setup.md)). After `pnpm build`, tools are available immediately.

| Tool | Use for |
|------|---------|
| `crawlee_health` | Check install before crawling |
| `crawlee_fetch` | One URL — `strategy`: `auto` \| `http` \| `browser` |
| `crawlee_crawl` | Multi-page — always set `maxPages`, `maxDepth`, `allowedDomains` |
| `crawlee_extract` | Pass `url` + `schema` (CSS field map) |
| `crawlee_sitemap` | Discover URLs from sitemap.xml |
| `crawlee_download` | Download explicit public file URLs |
| `crawlee_run_status` | Retrieve prior run by `runId` |

**Example MCP call** (`crawlee_fetch`):

```json
{
  "url": "https://example.com",
  "strategy": "auto",
  "markdown": true
}
```

**Example crawl** (`crawlee_crawl`):

```json
{
  "urls": ["https://example.com"],
  "maxPages": 20,
  "maxDepth": 1,
  "strategy": "auto",
  "allowedDomains": ["example.com"]
}
```

### Option B — CLI

```bash
node dist/cli/index.js fetch --url "https://example.com" --strategy auto
node dist/cli/index.js crawl --url "https://example.com" --max-pages 20 --max-depth 1
node dist/cli/index.js extract --url "https://example.com/pricing" --schema ./schemas/pricing-page.json
node dist/cli/index.js runs inspect <run-id>
```

CLI prints JSON `CrawlRunResult` to stdout.

### Option C — Library

```javascript
import { CrawlEngine } from "./dist/index.js";

const engine = new CrawlEngine();
const result = await engine.execute({
  urls: ["https://example.com"],
  operation: "fetch",
  strategy: "auto",
  output: { text: true, markdown: true, metadata: true, links: true },
});
```

---

## Strategy selection

1. Default to **`auto`** or **`http`** — cheaper and faster.
2. Use **`browser`** only when JS rendering, screenshots, or auto fallback requires it.
3. Always report to the user: `strategy.selectedStrategy`, `fallbackOccurred`, `fallbackReasons`.

Quality signals that trigger browser fallback in `auto` mode:

- HTTP failure or non-HTML content type
- Very little meaningful text
- JS app shell detected (`#root`, `#app`, etc.) with minimal body text
- Missing required CSS selectors or schema fields

---

## Required safety practices

Before every crawl, confirm or set:

| Parameter | Default | Notes |
|-----------|---------|-------|
| `maxPages` | 20 | Hard cap 500 |
| `maxDepth` | 1 | Hard cap 10 |
| `allowedDomains` | seed URL domain | No cross-domain unless explicit |
| `strategy` | `auto` | Prefer HTTP first |
| `respectRobots` | true | Do not disable without user approval |

Never crawl admin, login, checkout, or authenticated areas. Never bypass robots disallow rules silently.

---

## Result contract

All operations return **CrawlRunResult** JSON:

- `runId`, `status` (`completed` \| `partial` \| `failed` \| `blocked`)
- `strategy` — requested vs selected, fallback reasons
- `pages[]` — `title`, `text`, `markdown`, `links`, `extracted`, `metadata`, per-page `strategy`
- `errors[]` — failed URLs with codes
- `storage.runDirectory` — local path to full artifacts

Large HTML is saved to disk (`htmlPath`), not inlined in MCP responses unless requested.

Export for RAG/knowledge pipelines: `exportKnowledgeRecords(result)` in `src/storage/run-store.ts`, or read `pages.jsonl` from the run directory. See [docs/knowledge-ingestion.md](./docs/knowledge-ingestion.md).

---

## Reporting checklist

When you choose Crawlee Local, tell the user:

1. Why this tool vs search API / managed scraper / simple fetch
2. Strategy used and whether browser fallback occurred
3. Domain scope and page/depth budgets
4. `runId` and `storage.runDirectory`
5. Data quality limits (robots blocked URLs, partial results, etc.)

---

## Debugging

```bash
pnpm doctor
node dist/cli/index.js runs list
node dist/cli/index.js runs inspect <run-id>
# Human summary: ~/.crawlee-local/storage/runs/<run-id>/summary.md
```

---

## Further reading

- [docs/agent-runbook.md](./docs/agent-runbook.md) — planning and extending crawlers
- [docs/decision-matrix.md](./docs/decision-matrix.md) — tool selection
- [docs/security-and-ethics.md](./docs/security-and-ethics.md) — policy boundaries
- [src/core/result-schema.ts](./src/core/result-schema.ts) — Zod schemas

---

## Tests you can run to verify install

```bash
pnpm test && pnpm test:integration && pnpm test:mcp
```
