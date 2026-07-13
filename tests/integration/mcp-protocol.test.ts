import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { startFixtureServer } from "../fixtures/server.js";

describe("integration: MCP protocol", () => {
  let baseUrl: string;
  let closeFixture: () => Promise<void>;
  let storageDir: string;

  beforeAll(async () => {
    const fixture = await startFixtureServer();
    baseUrl = fixture.baseUrl;
    closeFixture = fixture.close;
    storageDir = mkdtempSync(join(tmpdir(), "crawlee-local-mcp-"));
  }, 30_000);

  afterAll(async () => {
    await closeFixture();
  });

  async function withMcpClient<T>(
    run: (client: Client) => Promise<T>,
  ): Promise<T> {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: ["dist/mcp/server.js"],
      cwd: process.cwd(),
      env: {
        ...process.env,
        CRAWLEE_LOCAL_STORAGE_DIR: storageDir,
      },
      stderr: "pipe",
    });

    const client = new Client(
      { name: "crawlee-local-test", version: "0.1.0" },
      { capabilities: {} },
    );

    await client.connect(transport);
    try {
      return await run(client);
    } finally {
      await transport.close();
    }
  }

  it("lists tools over stdio MCP", async () => {
    await withMcpClient(async (client) => {
      const { tools } = await client.listTools();
      const names = tools.map((tool) => tool.name).sort();
      expect(names).toEqual([
        "crawlee_crawl",
        "crawlee_download",
        "crawlee_extract",
        "crawlee_fetch",
        "crawlee_health",
        "crawlee_run_status",
        "crawlee_sitemap",
      ]);
    });
  }, 60_000);

  it("invokes crawlee_health", async () => {
    await withMcpClient(async (client) => {
      const result = await client.callTool({ name: "crawlee_health", arguments: {} });
      expect(result.isError).not.toBe(true);
      const text = result.content?.[0];
      expect(text?.type).toBe("text");
      const payload = JSON.parse(String(text?.text));
      expect(payload.ok).toBe(true);
      expect(payload.crawleeVersion).toBe("3.17.0");
      expect(payload.modes).toContain("auto");
    });
  }, 60_000);

  it("invokes crawlee_fetch against fixture and returns normalized result", async () => {
    await withMcpClient(async (client) => {
      const result = await client.callTool({
        name: "crawlee_fetch",
        arguments: {
          url: `${baseUrl}/`,
          strategy: "http",
          markdown: false,
        },
      });
      expect(result.isError).not.toBe(true);
      const text = result.content?.[0];
      expect(text?.type).toBe("text");
      const payload = JSON.parse(String(text?.text));
      expect(payload.status).toBe("completed");
      expect(payload.runId).toBeTruthy();
      expect(payload.strategy.selectedStrategy).toBe("http");
      expect(payload.pages[0]?.title).toContain("Fixture Static Home");
      expect(payload.pages[0]?.text?.length ?? 0).toBeGreaterThan(80);
      expect(payload.storage?.runDirectory).toBeTruthy();
    });
  }, 90_000);
});
