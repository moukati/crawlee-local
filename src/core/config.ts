import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { z } from "zod";

const ConfigSchema = z.object({
  storageDir: z.string(),
  logLevel: z.enum(["DEBUG", "INFO", "WARN", "ERROR"]).default("INFO"),
  headless: z.boolean().default(true),
  defaultMaxPages: z.number().int().positive().default(20),
  defaultMaxDepth: z.number().int().min(0).default(1),
  defaultHttpConcurrency: z.number().int().positive().default(5),
  defaultBrowserConcurrency: z.number().int().positive().default(2),
  defaultRequestTimeoutMs: z.number().int().positive().default(30_000),
  defaultTotalTimeoutMs: z.number().int().positive().default(300_000),
  maxResponseBytes: z.number().int().positive().default(5_242_880),
  maxFileBytes: z.number().int().positive().default(10_485_760),
  proxyUrls: z.array(z.string()).default([]),
  stagehandEnabled: z.boolean().default(false),
  userAgent: z
    .string()
    .default("CrawleeLocal/0.1 (+https://github.com/moukati/crawlee-local)"),
});

export type AppConfig = z.infer<typeof ConfigSchema>;

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function loadConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const storageDir =
    overrides.storageDir ??
    process.env.CRAWLEE_LOCAL_STORAGE_DIR ??
    process.env.CRAWLEE_STORAGE_DIR ??
    join(homedir(), ".crawlee-local", "storage");

  if (!existsSync(storageDir)) {
    mkdirSync(storageDir, { recursive: true });
  }

  const proxyRaw = process.env.CRAWLEE_PROXY_URLS?.trim();
  const proxyUrls = proxyRaw
    ? proxyRaw.split(",").map((v) => v.trim()).filter(Boolean)
    : [];

  return ConfigSchema.parse({
    storageDir: resolve(storageDir),
    logLevel: (process.env.CRAWLEE_LOG_LEVEL as AppConfig["logLevel"]) ?? "INFO",
    headless: parseBool(process.env.CRAWLEE_HEADLESS, true),
    defaultMaxPages: Number(process.env.CRAWLEE_DEFAULT_MAX_PAGES ?? 20),
    defaultMaxDepth: Number(process.env.CRAWLEE_DEFAULT_MAX_DEPTH ?? 1),
    defaultHttpConcurrency: Number(
      process.env.CRAWLEE_DEFAULT_HTTP_CONCURRENCY ?? 5,
    ),
    defaultBrowserConcurrency: Number(
      process.env.CRAWLEE_DEFAULT_BROWSER_CONCURRENCY ?? 2,
    ),
    defaultRequestTimeoutMs: Number(
      process.env.CRAWLEE_DEFAULT_REQUEST_TIMEOUT_MS ?? 30_000,
    ),
    defaultTotalTimeoutMs: Number(
      process.env.CRAWLEE_DEFAULT_TOTAL_TIMEOUT_MS ?? 300_000,
    ),
    maxResponseBytes: Number(process.env.CRAWLEE_MAX_RESPONSE_BYTES ?? 5_242_880),
    maxFileBytes: Number(process.env.CRAWLEE_MAX_FILE_BYTES ?? 10_485_760),
    proxyUrls,
    stagehandEnabled: parseBool(process.env.CRAWLEE_STAGEHAND_ENABLED, false),
    ...overrides,
  });
}

export function configureCrawleeStorage(storageDir: string): void {
  process.env.CRAWLEE_STORAGE_DIR = storageDir;
  process.env.APIFY_LOCAL_STORAGE_DIR = storageDir;
}
