import { createHash } from "node:crypto";
import robotsParser from "robots-parser";
import type { CrawlRequest } from "./result-schema.js";
import type { AppConfig } from "./config.js";
import { PolicyBlockedError } from "./errors.js";

const BLOCKED_PATH_PATTERNS = [
  /\/(?:login|signin|signup|register|logout|auth|checkout|cart|account|admin)(?:\/|$|\?)/i,
  /\/wp-admin/i,
  /\/api\/(?:auth|login)/i,
];

const DEFAULT_EXCLUDE = [
  "**/*.pdf",
  "**/*.zip",
  "**/*.exe",
  "**/search?**",
  "**/*?*session*",
  "**/*?*token*",
];

export type PolicyDecision = {
  allowed: boolean;
  reason?: string;
  robots?: {
    checked: boolean;
    allowed: boolean | null;
    reason?: string;
    userAgent: string;
  };
};

export function normalizeUrl(raw: string): string {
  const url = new URL(raw);
  url.hash = "";
  const params = [...url.searchParams.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  );
  url.search = "";
  for (const [key, value] of params) {
    url.searchParams.append(key, value);
  }
  return url.toString();
}

export function getDomain(url: string): string {
  return new URL(url).hostname.toLowerCase();
}

export function deriveAllowedDomains(
  urls: string[],
  explicit?: string[],
): string[] {
  if (explicit?.length) {
    return explicit.map((d) => d.toLowerCase());
  }
  return [...new Set(urls.map((u) => getDomain(u)))];
}

export function isDomainAllowed(url: string, allowedDomains: string[]): boolean {
  const host = getDomain(url);
  return allowedDomains.some(
    (d) => host === d || host.endsWith(`.${d}`),
  );
}

export function matchesPattern(url: string, pattern: string): boolean {
  const glob = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, ".*")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, ".");
  return new RegExp(glob, "i").test(url);
}

export function shouldIncludeUrl(
  url: string,
  includePatterns?: string[],
  excludePatterns?: string[],
): boolean {
  const excludes = [...DEFAULT_EXCLUDE, ...(excludePatterns ?? [])];
  if (excludes.some((p) => matchesPattern(url, p))) return false;
  if (BLOCKED_PATH_PATTERNS.some((re) => re.test(url))) return false;
  if (!includePatterns?.length) return true;
  return includePatterns.some((p) => matchesPattern(url, p));
}

export async function evaluateRobots(
  url: string,
  userAgent: string,
  fetchRobots: (robotsUrl: string) => Promise<string | null>,
): Promise<PolicyDecision["robots"]> {
  const origin = new URL(url).origin;
  const robotsUrl = `${origin}/robots.txt`;
  try {
    const body = await fetchRobots(robotsUrl);
    if (body === null) {
      return {
        checked: false,
        allowed: null,
        reason: "robots.txt unavailable",
        userAgent,
      };
    }
    const robots = (robotsParser as unknown as (url: string, body: string) => { isAllowed: (url: string, ua: string) => boolean | undefined })(robotsUrl, body);
    const allowed = robots.isAllowed(url, userAgent);
    return {
      checked: true,
      allowed: allowed ?? null,
      reason:
        allowed === false
          ? "disallowed by robots.txt"
          : allowed === true
            ? "allowed by robots.txt"
            : "no explicit robots rule",
      userAgent,
    };
  } catch {
    return {
      checked: false,
      allowed: null,
      reason: "robots.txt fetch failed",
      userAgent,
    };
  }
}

export function enforceRequestPolicy(
  request: CrawlRequest,
  config: AppConfig,
): {
  maxPages: number;
  maxDepth: number;
  allowedDomains: string[];
  requestTimeoutMs: number;
  totalTimeoutMs: number;
  maxResponseBytes: number;
  maxFileBytes: number;
  httpConcurrency: number;
  browserConcurrency: number;
  respectRobots: boolean;
  skipRobots: boolean;
  allowCrossDomain: boolean;
} {
  const allowedDomains = deriveAllowedDomains(
    request.urls,
    request.allowedDomains,
  );
  const allowCrossDomain = request.policyOverride?.allowCrossDomain ?? false;
  if (!allowCrossDomain) {
    for (const url of request.urls) {
      if (!isDomainAllowed(url, allowedDomains)) {
        throw new PolicyBlockedError(
          `URL ${url} is outside allowed domains: ${allowedDomains.join(", ")}`,
        );
      }
    }
  }

  return {
    maxPages: Math.min(request.maxPages ?? config.defaultMaxPages, 500),
    maxDepth: Math.min(request.maxDepth ?? config.defaultMaxDepth, 10),
    allowedDomains,
    requestTimeoutMs: Math.min(
      request.limits?.requestTimeoutMs ?? config.defaultRequestTimeoutMs,
      120_000,
    ),
    totalTimeoutMs: Math.min(
      request.limits?.totalTimeoutMs ?? config.defaultTotalTimeoutMs,
      600_000,
    ),
    maxResponseBytes: Math.min(
      request.limits?.maxResponseBytes ?? config.maxResponseBytes,
      50_000_000,
    ),
    maxFileBytes: Math.min(
      request.limits?.maxFileBytes ?? config.maxFileBytes,
      100_000_000,
    ),
    httpConcurrency: Math.min(
      request.limits?.concurrency ?? config.defaultHttpConcurrency,
      20,
    ),
    browserConcurrency: Math.min(
      request.limits?.concurrency ?? config.defaultBrowserConcurrency,
      5,
    ),
    respectRobots: request.respectRobots ?? true,
    skipRobots: request.policyOverride?.skipRobots ?? false,
    allowCrossDomain,
  };
}

export function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

export async function checkUrlPolicy(
  url: string,
  options: {
    allowedDomains: string[];
    allowCrossDomain: boolean;
    respectRobots: boolean;
    skipRobots: boolean;
    userAgent: string;
    fetchRobots: (robotsUrl: string) => Promise<string | null>;
    includePatterns?: string[];
    excludePatterns?: string[];
  },
): Promise<PolicyDecision> {
  if (!options.allowCrossDomain && !isDomainAllowed(url, options.allowedDomains)) {
    return { allowed: false, reason: "domain not in allowlist" };
  }
  if (!shouldIncludeUrl(url, options.includePatterns, options.excludePatterns)) {
    return { allowed: false, reason: "excluded by pattern" };
  }
  if (options.respectRobots && !options.skipRobots) {
    const robots = await evaluateRobots(url, options.userAgent, options.fetchRobots);
    if (robots?.allowed === false) {
      return { allowed: false, reason: robots.reason, robots };
    }
    return { allowed: true, robots };
  }
  return { allowed: true };
}
