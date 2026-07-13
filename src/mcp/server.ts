import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  CrawlEngine,
  healthCheck,
  loadConfig,
  listRuns,
  loadRunResult,
} from "../index.js";

function text(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

export function createMcpServer() {
  const server = new McpServer({
    name: "crawlee-local",
    version: "0.1.0",
  });

  server.registerTool(
    "crawlee_health",
    { description: "Return installation status, versions, storage path, and warnings." },
    async () => text(await healthCheck()),
  );

  server.registerTool(
    "crawlee_fetch",
    {
      description: "Fetch and extract a single page using HTTP, browser, or auto strategy.",
      inputSchema: {
        url: z.string().url(),
        strategy: z.enum(["auto", "http", "browser"]).optional(),
        markdown: z.boolean().optional(),
        html: z.boolean().optional(),
        screenshot: z.boolean().optional(),
        timeoutMs: z.number().int().positive().optional(),
      },
    },
    async (args) => {
      const engine = new CrawlEngine();
      const result = await engine.execute({
        urls: [args.url],
        operation: args.screenshot ? "screenshot" : "fetch",
        strategy: args.strategy ?? "auto",
        output: {
          text: true,
          markdown: args.markdown ?? true,
          html: args.html ?? false,
          metadata: true,
          links: true,
          screenshot: args.screenshot,
        },
        limits: args.timeoutMs ? { requestTimeoutMs: args.timeoutMs } : undefined,
      });
      return text(result);
    },
  );

  server.registerTool(
    "crawlee_crawl",
    {
      description: "Crawl multiple pages within strict domain, depth, and page limits.",
      inputSchema: {
        urls: z.array(z.string().url()).min(1),
        allowedDomains: z.array(z.string()).optional(),
        maxPages: z.number().int().positive().max(500).optional(),
        maxDepth: z.number().int().min(0).max(10).optional(),
        strategy: z.enum(["auto", "http", "browser"]).optional(),
        includePatterns: z.array(z.string()).optional(),
        excludePatterns: z.array(z.string()).optional(),
      },
    },
    async (args) => {
      const engine = new CrawlEngine();
      const result = await engine.execute({
        urls: args.urls,
        operation: "crawl",
        strategy: args.strategy ?? "auto",
        allowedDomains: args.allowedDomains,
        maxPages: args.maxPages,
        maxDepth: args.maxDepth,
        includePatterns: args.includePatterns,
        excludePatterns: args.excludePatterns,
        output: { text: true, markdown: true, metadata: true, links: true },
      });
      return text(result);
    },
  );

  server.registerTool(
    "crawlee_extract",
    {
      description: "Extract structured fields from a page using a CSS selector schema.",
      inputSchema: {
        url: z.string().url(),
        schema: z.object({ fields: z.record(z.string(), z.any()) }),
        strategy: z.enum(["auto", "http", "browser"]).optional(),
      },
    },
    async (args) => {
      const engine = new CrawlEngine();
      const result = await engine.execute({
        urls: [args.url],
        operation: "extract",
        strategy: args.strategy ?? "auto",
        extractionSchema: args.schema,
        output: { text: true, metadata: true },
      });
      return text(result);
    },
  );

  server.registerTool(
    "crawlee_sitemap",
    {
      description: "Discover URLs from a sitemap.xml file.",
      inputSchema: {
        url: z.string().url(),
        maxPages: z.number().int().positive().max(500).optional(),
      },
    },
    async (args) => {
      const engine = new CrawlEngine();
      const result = await engine.execute({
        urls: [args.url],
        operation: "sitemap",
        maxPages: args.maxPages,
        output: { metadata: true },
      });
      return text(result);
    },
  );

  server.registerTool(
    "crawlee_download",
    {
      description: "Download an explicitly requested public file into controlled local storage.",
      inputSchema: {
        url: z.string().url(),
      },
    },
    async (args) => {
      const engine = new CrawlEngine();
      const result = await engine.execute({
        urls: [args.url],
        operation: "download",
        output: {},
      });
      return text(result);
    },
  );

  server.registerTool(
    "crawlee_run_status",
    {
      description: "Return metadata and results for a prior run ID.",
      inputSchema: {
        runId: z.string().uuid(),
      },
    },
    async (args) => {
      const config = loadConfig();
      const match = listRuns(config.storageDir).find((r) => r.runId === args.runId);
      if (!match) {
        return text({ error: "RUN_NOT_FOUND", runId: args.runId });
      }
      return text(loadRunResult(match.path));
    },
  );

  return server;
}

async function main() {
  const server = createMcpServer();
  await server.connect(new StdioServerTransport());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
