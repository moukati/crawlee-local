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

## Run fixture suite

```bash
pnpm test:integration
```

## Storage cleanup

```bash
pnpm dev runs clean --older-than 30
```

## Update Agent Skill

After CLI/MCP changes, sync:

- `D:/Codex/Crawlee/README.md`
- BusinessBrain `.agents/skills/crawlee/SKILL.md`
- `.brain/07_agents/asset-index.md` + `ASSETS.md`

## Optional future adapters

- Apify Actor deployment
- Stagehand (`CRAWLEE_STAGEHAND_ENABLED`)
- Firecrawl/Exa orchestration helpers
- Scheduled crawls and change monitoring
