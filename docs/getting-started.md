# Getting started

## 1. Clone and install

```bash
git clone https://github.com/moukati/crawlee-local.git
cd crawlee-local
pnpm install
pnpm setup
```

`pnpm setup` installs Playwright Chromium (~150 MB). Browser mode requires it; HTTP-only mode does not.

## 2. Verify

```bash
pnpm doctor
```

Expected output includes `"ok": true` and `"browserInstalled": true`. Warnings about missing Chromium mean you should re-run `pnpm setup`.

## 3. Build

```bash
pnpm build
```

Production CLI and MCP server live in `dist/`.

## 4. First fetch

```bash
node dist/cli/index.js fetch --url "https://example.com" --strategy auto
```

You get JSON on stdout with `status: "completed"` and page `title`, `text`, etc.

## 5. First crawl

```bash
node dist/cli/index.js crawl \
  --url "https://example.com" \
  --max-pages 10 \
  --max-depth 1
```

Stays on the same domain by default. Increase limits only when you have a clear reason.

## 6. Inspect results

Each run writes to `~/.crawlee-local/storage/runs/<runId>/`:

| File | Contents |
|------|----------|
| `result.json` | Full CrawlRunResult |
| `summary.md` | Human-readable report |
| `pages.jsonl` | One page per line |

```bash
node dist/cli/index.js runs list
node dist/cli/index.js runs inspect <run-id>
```

## 7. Connect an AI agent

1. Run `pnpm build`
2. Follow [mcp-setup.md](./mcp-setup.md)
3. Give your agent [AGENTS.md](../AGENTS.md) or the raw GitHub URL

## Environment variables

Copy `.env.example` to `.env` if you want custom defaults:

```env
CRAWLEE_LOCAL_STORAGE_DIR=~/.crawlee-local/storage
CRAWLEE_DEFAULT_MAX_PAGES=20
CRAWLEE_DEFAULT_MAX_DEPTH=1
CRAWLEE_HEADLESS=1
CRAWLEE_LOG_LEVEL=INFO
```

See `.env.example` for the full list.

## Next steps

- Structured extraction: [schemas/pricing-page.json](../schemas/pricing-page.json) + `extract` command
- Examples: [examples/](../examples/)
- Safety: [security-and-ethics.md](./security-and-ethics.md)
