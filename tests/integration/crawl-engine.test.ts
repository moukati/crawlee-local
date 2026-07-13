import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { CrawlEngine } from "../../src/core/engine.js";
import { loadConfig } from "../../src/core/config.js";
import { startFixtureServer } from "../fixtures/server.js";
import { createMcpServer } from "../../src/mcp/server.js";

describe("integration: crawlee-local", () => {
  let baseUrl: string;
  let close: () => Promise<void>;
  let storageDir: string;

  beforeAll(async () => {
    const fixture = await startFixtureServer();
    baseUrl = fixture.baseUrl;
    close = fixture.close;
  }, 30_000);

  beforeEach(() => {
    storageDir = mkdtempSync(join(tmpdir(), "crawlee-local-it-"));
  });

  afterAll(async () => {
    await close();
  });

  it("fetches static HTML over HTTP", async () => {
    const engine = new CrawlEngine(loadConfig({ storageDir }));
    const result = await engine.execute({
      urls: [`${baseUrl}/`],
      operation: "fetch",
      strategy: "http",
      output: { text: true, markdown: true, metadata: true },
    });
    expect(result.status).toBe("completed");
    expect(result.pages[0]?.title).toContain("Fixture Static Home");
    expect(result.pages[0]?.text?.length ?? 0).toBeGreaterThan(80);
    expect(result.strategy.selectedStrategy).toBe("http");
  }, 60_000);

  it("auto strategy falls back to browser for SPA fixture", async () => {
    const engine = new CrawlEngine(loadConfig({ storageDir }));
    const result = await engine.execute({
      urls: [`${baseUrl}/spa.html`],
      operation: "fetch",
      strategy: "auto",
      output: { text: true },
    });
    expect(result.pages[0]?.text).toContain("Rendered Product");
    expect(result.strategy.selectedStrategy).toBe("browser");
    expect(result.strategy.fallbackOccurred).toBe(true);
  }, 120_000);

  it("crawls recursively within page budget", async () => {
    const engine = new CrawlEngine(loadConfig({ storageDir }));
    const result = await engine.execute({
      urls: [`${baseUrl}/`],
      operation: "crawl",
      strategy: "http",
      maxPages: 3,
      maxDepth: 1,
      allowedDomains: ["127.0.0.1"],
      output: { text: true },
    });
    expect(result.pages.length).toBeGreaterThanOrEqual(2);
    expect(result.pages.length).toBeLessThanOrEqual(3);
  }, 60_000);

  it("extracts structured pricing fields", async () => {
    const engine = new CrawlEngine(loadConfig({ storageDir }));
    const result = await engine.execute({
      urls: [`${baseUrl}/pricing.html`],
      operation: "extract",
      strategy: "http",
      extractionSchema: {
        fields: {
          title: { selector: "h1", type: "text", required: true },
          starterPrice: {
            selector: ".plan[data-price='49']",
            attribute: "data-price",
            type: "attribute",
            required: true,
          },
        },
      },
      output: { text: true },
    });
    expect(result.pages[0]?.extracted?.title).toBe("Pricing");
    expect(result.pages[0]?.extracted?.starterPrice).toBe("49");
  }, 60_000);

  it("discovers sitemap URLs", async () => {
    const engine = new CrawlEngine(loadConfig({ storageDir }));
    const result = await engine.execute({
      urls: [`${baseUrl}/sitemap.xml`],
      operation: "sitemap",
      maxPages: 10,
      output: {},
    });
    expect(result.pages.length).toBeGreaterThan(0);
  }, 30_000);

  it("downloads public fixture file", async () => {
    const engine = new CrawlEngine(loadConfig({ storageDir }));
    const result = await engine.execute({
      urls: [`${baseUrl}/report.txt`],
      operation: "download",
      allowedDomains: ["127.0.0.1"],
      output: {},
    });
    expect(result.pages[0]?.filePath).toBeTruthy();
  }, 30_000);

  it("registers MCP tools", () => {
    const server = createMcpServer();
    expect(server).toBeTruthy();
  });
});
