import type { AppConfig } from "../core/config.js";
import { redactSecrets } from "../core/errors.js";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const LEVEL_ORDER: Record<LogLevel, number> = {
  DEBUG: 10,
  INFO: 20,
  WARN: 30,
  ERROR: 40,
};

export function createLogger(config: AppConfig, runId?: string) {
  const debugEnabled = process.env.CRAWLEE_DEBUG === "1";
  const minLevel = debugEnabled ? "DEBUG" : config.logLevel;

  function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;
    const payload = {
      ts: new Date().toISOString(),
      level,
      runId,
      message: redactSecrets(message),
      ...(meta ? { meta: sanitizeMeta(meta) } : {}),
    };
    console.error(JSON.stringify(payload));
  }

  return {
    debug: (message: string, meta?: Record<string, unknown>) =>
      log("DEBUG", message, meta),
    info: (message: string, meta?: Record<string, unknown>) =>
      log("INFO", message, meta),
    warn: (message: string, meta?: Record<string, unknown>) =>
      log("WARN", message, meta),
    error: (message: string, meta?: Record<string, unknown>) =>
      log("ERROR", message, meta),
  };
}

function sanitizeMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (/cookie|authorization|password|token|secret/i.test(key)) continue;
    if (typeof value === "string") {
      out[key] = redactSecrets(value).slice(0, 500);
    } else {
      out[key] = value;
    }
  }
  return out;
}
