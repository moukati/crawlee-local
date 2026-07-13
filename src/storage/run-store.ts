import { readFileSync, readdirSync, statSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { CrawlRunResult } from "../core/result-schema.js";
import { buildRunSummary } from "../observability/run-summary.js";

export function persistRunResult(runDirectory: string, result: CrawlRunResult): void {
  writeFileSync(join(runDirectory, "result.json"), JSON.stringify(result, null, 2), "utf8");
  writeFileSync(join(runDirectory, "summary.md"), buildRunSummary(result), "utf8");
  writeFileSync(
    join(runDirectory, "pages.jsonl"),
    result.pages.map((p) => JSON.stringify(p)).join("\n"),
    "utf8",
  );
}

export function loadRunResult(runDirectory: string): CrawlRunResult {
  const raw = readFileSync(join(runDirectory, "result.json"), "utf8");
  return JSON.parse(raw) as CrawlRunResult;
}

export function listRuns(storageDir: string): Array<{ runId: string; path: string; mtime: string }> {
  const runsDir = join(storageDir, "runs");
  if (!existsSync(runsDir)) return [];
  return readdirSync(runsDir)
    .map((runId) => {
      const path = join(runsDir, runId);
      if (!statSync(path).isDirectory()) return null;
      return {
        runId,
        path,
        mtime: statSync(path).mtime.toISOString(),
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null)
    .sort((a, b) => b.mtime.localeCompare(a.mtime));
}

export function cleanRunsOlderThan(storageDir: string, days: number): number {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  let removed = 0;
  for (const run of listRuns(storageDir)) {
    if (new Date(run.mtime).getTime() < cutoff) {
      rmSync(run.path, { recursive: true, force: true });
      removed += 1;
    }
  }
  return removed;
}

export function exportKnowledgeRecords(result: CrawlRunResult) {
  return result.pages
    .filter((p) => p.text)
    .map((p) => ({
      sourceType: "web" as const,
      sourceUrl: p.requestedUrl,
      canonicalUrl: p.canonicalUrl,
      title: p.title,
      content: p.text ?? "",
      contentHash: p.contentHash ?? "",
      fetchedAt: p.fetchedAt,
      crawler: "crawlee" as const,
      strategy: p.strategy,
      tags: [],
      provenance: {
        runId: result.runId,
        parentUrl: p.parentUrl,
      },
    }));
}
