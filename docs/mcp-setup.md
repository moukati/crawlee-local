# MCP setup

Crawlee Local exposes a **stdio MCP server** with seven tools. Any MCP-compatible client can use it after you build the project.

## Prerequisites

```bash
pnpm install && pnpm setup && pnpm build
pnpm doctor
```

The server entrypoint is:

```bash
node dist/mcp/server.js
```

---

## Cursor

**Project-scoped** (recommended): this repo includes [`.cursor/mcp.json`](../.cursor/mcp.json):

```json
{
  "mcpServers": {
    "crawlee-local": {
      "command": "node",
      "args": ["dist/mcp/server.js"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

Open this folder in Cursor, build once, reload MCP.

**User-global** (`~/.cursor/mcp.json` on macOS/Linux, `%USERPROFILE%\.cursor\mcp.json` on Windows):

```json
{
  "mcpServers": {
    "crawlee-local": {
      "command": "node",
      "args": ["/absolute/path/to/crawlee-local/dist/mcp/server.js"],
      "cwd": "/absolute/path/to/crawlee-local"
    }
  }
}
```

Replace paths with your clone location.

---

## Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "crawlee-local": {
      "command": "node",
      "args": ["/absolute/path/to/crawlee-local/dist/mcp/server.js"],
      "cwd": "/absolute/path/to/crawlee-local"
    }
  }
}
```

Restart Claude Desktop after editing.

---

## Development mode (no build step)

```json
{
  "mcpServers": {
    "crawlee-local": {
      "command": "pnpm",
      "args": ["dev:mcp"],
      "cwd": "/absolute/path/to/crawlee-local"
    }
  }
}
```

Uses `tsx` to run TypeScript directly. Slower startup; fine for development.

---

## Available tools

| Tool | Description |
|------|-------------|
| `crawlee_health` | Version, browser install, storage path, warnings |
| `crawlee_fetch` | Single page — `url`, `strategy`, `markdown`, `html`, `screenshot` |
| `crawlee_crawl` | Multi-page — `urls`, `maxPages`, `maxDepth`, `allowedDomains` |
| `crawlee_extract` | Structured fields — `url`, `schema` |
| `crawlee_sitemap` | Sitemap URL discovery |
| `crawlee_download` | Public file download |
| `crawlee_run_status` | Fetch prior run by UUID |

Full agent guidance: [AGENTS.md](../AGENTS.md).

---

## Verify MCP works

```bash
pnpm test:mcp
```

This starts the real stdio server, connects an MCP client, calls `listTools`, `crawlee_health`, and `crawlee_fetch` against the local fixture server.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Tools not listed | Run `pnpm build`; check `cwd` in MCP config |
| Browser mode fails | Run `pnpm setup` / `pnpm exec playwright install chromium` |
| Empty crawl results | Check robots.txt, domain allowlist, and URL scope |
| Permission errors on storage | Set `CRAWLEE_LOCAL_STORAGE_DIR` to a writable path |
