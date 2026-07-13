import type { CrawlRunResult } from "../core/result-schema.js";

export type RunMetrics = {
  httpPages: number;
  browserPages: number;
  fallbackCount: number;
  blockedCount: number;
};

export function createMetrics(): RunMetrics {
  return {
    httpPages: 0,
    browserPages: 0,
    fallbackCount: 0,
    blockedCount: 0,
  };
}

export function buildRunSummary(result: CrawlRunResult): string {
  const lines = [
    `# Crawlee Local Run ${result.runId}`,
    "",
    `- Status: ${result.status}`,
    `- Duration: ${result.stats.durationMs}ms`,
    `- Strategy: ${result.strategy.selectedStrategy}${result.strategy.fallbackOccurred ? " (fallback)" : ""}`,
    `- Pages: ${result.stats.succeeded}/${result.stats.attempted} succeeded`,
    `- Blocked: ${result.stats.blocked}`,
    `- Failed: ${result.stats.failed}`,
    `- Storage: ${result.storage?.runDirectory ?? "n/a"}`,
  ];
  if (result.strategy.fallbackReasons.length) {
    lines.push("", "## Fallback reasons", ...result.strategy.fallbackReasons.map((r) => `- ${r}`));
  }
  if (result.errors.length) {
    lines.push("", "## Errors", ...result.errors.slice(0, 20).map((e) => `- ${e.url}: ${e.message}`));
  }
  return lines.join("\n");
}
