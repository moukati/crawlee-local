# Maintenance

## Update Crawlee

```bash
npm view crawlee version
pnpm add crawlee@latest
pnpm test:all
```

Review https://github.com/apify/crawlee/releases for breaking changes.

## Update Playwright browsers

```bash
pnpm exec playwright install chromium
pnpm doctor
```

## Run the test suite

```bash
pnpm lint && pnpm typecheck && pnpm test:all && pnpm test:mcp
```

## Storage cleanup

```bash
node dist/cli/index.js runs clean --older-than 30
```

Or delete `~/.crawlee-local/storage/runs/` manually.

## Optional future adapters

- Apify Actor deployment
- Stagehand (`CRAWLEE_STAGEHAND_ENABLED`)
- Scheduled crawls and change monitoring

See [architecture.md](./architecture.md).
