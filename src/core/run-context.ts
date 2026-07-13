import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { AppConfig } from "./config.js";
import { configureCrawleeStorage } from "./config.js";

export type RunContext = {
  runId: string;
  runDirectory: string;
  startedAt: Date;
  datasetId: string;
};

export function createRunContext(config: AppConfig): RunContext {
  const runId = randomUUID();
  const runDirectory = join(config.storageDir, "runs", runId);
  mkdirSync(runDirectory, { recursive: true });
  mkdirSync(join(runDirectory, "pages"), { recursive: true });
  mkdirSync(join(runDirectory, "files"), { recursive: true });
  mkdirSync(join(runDirectory, "screenshots"), { recursive: true });

  configureCrawleeStorage(join(runDirectory, "crawlee"));

  return {
    runId,
    runDirectory,
    startedAt: new Date(),
    datasetId: `run-${runId}`,
  };
}
