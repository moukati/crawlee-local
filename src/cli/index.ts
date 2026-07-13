#!/usr/bin/env node
import { Command } from "commander";
import { readFileSync } from "node:fs";
import {
  CrawlEngine,
  healthCheck,
  loadConfig,
  listRuns,
  loadRunResult,
  cleanRunsOlderThan,
} from "../index.js";
import type { CrawlRequestInput } from "../core/result-schema.js";

const program = new Command();

program
  .name("crawlee-local")
  .description("Local Crawlee scraping engine for BusinessBrain agents")
  .version("0.1.0");

program
  .command("doctor")
  .description("Check installation and configuration")
  .action(async () => {
    const health = await healthCheck();
    console.log(JSON.stringify(health, null, 2));
    process.exit(health.warnings.length ? 1 : 0);
  });

program
  .command("fetch")
  .requiredOption("--url <url>", "URL to fetch")
  .option("--strategy <strategy>", "auto|http|browser", "auto")
  .option("--markdown", "Include markdown output")
  .option("--html", "Save raw HTML locally")
  .action(async (opts) => {
    const result = await runCommand({
      urls: [opts.url],
      operation: "fetch",
      strategy: opts.strategy,
      output: { text: true, markdown: !!opts.markdown, html: !!opts.html, metadata: true, links: true },
    });
    printResult(result);
  });

program
  .command("crawl")
  .requiredOption("--url <url>", "Starting URL")
  .option("--max-pages <n>", "Maximum pages", "20")
  .option("--max-depth <n>", "Maximum depth", "1")
  .option("--strategy <strategy>", "auto|http|browser", "auto")
  .option("--allowed-domain <domain>", "Allowed domain (repeatable)", collect, [])
  .action(async (opts) => {
    const result = await runCommand({
      urls: [opts.url],
      operation: "crawl",
      strategy: opts.strategy,
      maxPages: Number(opts.maxPages),
      maxDepth: Number(opts.maxDepth),
      allowedDomains: opts.allowedDomain.length ? opts.allowedDomain : undefined,
      output: { text: true, markdown: true, metadata: true, links: true },
    });
    printResult(result);
  });

program
  .command("extract")
  .requiredOption("--url <url>", "URL to extract")
  .requiredOption("--schema <path>", "JSON schema path")
  .option("--strategy <strategy>", "auto|http|browser", "auto")
  .action(async (opts) => {
    const schema = JSON.parse(readFileSync(opts.schema, "utf8"));
    const result = await runCommand({
      urls: [opts.url],
      operation: "extract",
      strategy: opts.strategy,
      extractionSchema: schema,
      output: { text: true, metadata: true },
    });
    printResult(result);
  });

program
  .command("sitemap")
  .requiredOption("--url <url>", "Sitemap URL")
  .option("--max-pages <n>", "Maximum URLs", "100")
  .action(async (opts) => {
    const result = await runCommand({
      urls: [opts.url],
      operation: "sitemap",
      maxPages: Number(opts.maxPages),
      output: { metadata: true },
    });
    printResult(result);
  });

program
  .command("download")
  .requiredOption("--url <url>", "File URL")
  .action(async (opts) => {
    const result = await runCommand({
      urls: [opts.url],
      operation: "download",
      output: {},
    });
    printResult(result);
  });

program
  .command("screenshot")
  .requiredOption("--url <url>", "URL to screenshot")
  .option("--strategy <strategy>", "auto|http|browser", "browser")
  .action(async (opts) => {
    const result = await runCommand({
      urls: [opts.url],
      operation: "screenshot",
      strategy: opts.strategy,
      output: { screenshot: true, metadata: true },
    });
    printResult(result);
  });

const runs = program.command("runs").description("Inspect stored runs");

runs
  .command("list")
  .action(() => {
    const config = loadConfig();
    console.log(JSON.stringify(listRuns(config.storageDir), null, 2));
  });

runs
  .command("inspect")
  .argument("<runId>", "Run ID")
  .action((runId: string) => {
    const config = loadConfig();
    const match = listRuns(config.storageDir).find((r) => r.runId === runId);
    if (!match) {
      console.error(`Run not found: ${runId}`);
      process.exit(1);
    }
    console.log(JSON.stringify(loadRunResult(match.path), null, 2));
  });

runs
  .command("clean")
  .option("--older-than <days>", "Delete runs older than N days", "30")
  .action((opts) => {
    const config = loadConfig();
    const removed = cleanRunsOlderThan(config.storageDir, Number(opts.olderThan));
    console.log(JSON.stringify({ removed }, null, 2));
  });

async function runCommand(request: CrawlRequestInput) {
  const engine = new CrawlEngine();
  return engine.execute(request);
}

function printResult(result: Awaited<ReturnType<CrawlEngine["execute"]>>) {
  console.log(JSON.stringify(result, null, 2));
}

function collect(value: string, previous: string[]) {
  return previous.concat([value]);
}

program.parseAsync(process.argv).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
