import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { CheerioCrawler, Configuration } from "crawlee";
import type { CrawledPage, CrawlRequest } from "../core/result-schema.js";
import type { AppConfig } from "../core/config.js";
import { hashContent, checkUrlPolicy, normalizeUrl } from "../core/policy.js";
import { extractReadableContent } from "../extractors/readable-content.js";
import { extractStructured, validateRequiredFields } from "../extractors/structured.js";
import type { CheerioAPI } from "cheerio";
import type { RunContext } from "../core/run-context.js";
import type { createLogger } from "../observability/logger.js";

export type HttpCrawlOptions = {
  request: CrawlRequest;
  config: AppConfig;
  run: RunContext;
  logger: ReturnType<typeof createLogger>;
  policy: ReturnType<typeof import("../core/policy.js").enforceRequestPolicy>;
  fetchRobots: (url: string) => Promise<string | null>;
  onPage?: (page: CrawledPage) => void;
  maxRequests?: number;
  enqueueLinks?: boolean;
};

async function fetchText(url: string, timeoutMs: number): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function runHttpCrawl(options: HttpCrawlOptions): Promise<CrawledPage[]> {
  const pages: CrawledPage[] = [];
  const seen = new Set<string>();
  const output = options.request.output ?? {
    text: true,
    markdown: true,
    metadata: true,
    links: true,
  };

  const storagePath = join(options.run.runDirectory, "crawlee");
  const crawleeConfig = new Configuration({
    storageClientOptions: { localDataDirectory: storagePath },
  });

  const crawler = new CheerioCrawler({
    maxRequestsPerCrawl: options.maxRequests ?? options.policy.maxPages,
    maxConcurrency: options.policy.httpConcurrency,
    requestHandlerTimeoutSecs: Math.ceil(options.policy.requestTimeoutMs / 1000),
    maxRequestRetries: options.request.limits?.retries ?? 2,
    async requestHandler({ request, $, response, enqueueLinks }) {
      const started = Date.now();
      const loadedUrl = request.loadedUrl ?? request.url;
      const normalized = normalizeUrl(loadedUrl);
      if (seen.has(normalized)) return;
      seen.add(normalized);

      const depth = (request.userData.depth as number | undefined) ?? 0;
      const policyDecision = await checkUrlPolicy(loadedUrl, {
        allowedDomains: options.policy.allowedDomains,
        allowCrossDomain: options.policy.allowCrossDomain,
        respectRobots: options.policy.respectRobots,
        skipRobots: options.policy.skipRobots,
        userAgent: options.config.userAgent,
        fetchRobots: options.fetchRobots,
        includePatterns: options.request.includePatterns,
        excludePatterns: options.request.excludePatterns,
      });

      if (!policyDecision.allowed) {
        options.logger.warn("blocked request", { url: loadedUrl, reason: policyDecision.reason });
        return;
      }

      const readable = extractReadableContent($ as unknown as CheerioAPI, loadedUrl);
      let extracted: Record<string, unknown> | undefined;
      const warnings: string[] = [];

      if (options.request.extractionSchema) {
        const result = extractStructured($ as unknown as CheerioAPI, options.request.extractionSchema);
        extracted = result.data;
        warnings.push(...result.warnings);
        warnings.push(
          ...validateRequiredFields(result.data, options.request.extractionSchema).map(
            (f) => `validation missing: ${f}`,
          ),
        );
      }

      const html = output.html ? $.root().html() ?? "" : undefined;
      let htmlPath: string | undefined;
      if (html) {
        htmlPath = join(options.run.runDirectory, "pages", `${pages.length}.html`);
        writeFileSync(htmlPath, html, "utf8");
      }

      const page: CrawledPage = {
        requestedUrl: request.url,
        finalUrl: loadedUrl,
        canonicalUrl: readable.canonicalUrl,
        statusCode: response.statusCode,
        contentType: response.headers["content-type"] as string | undefined,
        title: readable.title,
        description: readable.description,
        text: output.text ? readable.text : undefined,
        markdown: output.markdown ? readable.markdown : undefined,
        htmlPath,
        extracted,
        links: output.links ? readable.links : undefined,
        metadata: output.metadata ? readable.metadata : undefined,
        strategy: "http",
        depth,
        parentUrl: request.userData.parentUrl as string | undefined,
        fetchedAt: new Date().toISOString(),
        durationMs: Date.now() - started,
        robots: policyDecision.robots,
        contentHash: readable.text ? hashContent(readable.text) : undefined,
        warnings: warnings.length ? warnings : undefined,
      };

      pages.push(page);
      options.onPage?.(page);

      if (
        options.enqueueLinks &&
        depth < options.policy.maxDepth &&
        pages.length < options.policy.maxPages
      ) {
        await enqueueLinks({
          strategy: "same-domain",
          transformRequestFunction: (req) => {
            req.userData = {
              depth: depth + 1,
              parentUrl: loadedUrl,
            };
            return req;
          },
        });
      }
    },
  }, crawleeConfig);

  await crawler.run(
    options.request.urls.map((url) => ({
      url,
      userData: { depth: 0 },
    })),
  );

  return pages;
}

export async function fetchSingleHttpPage(
  url: string,
  options: Omit<HttpCrawlOptions, "enqueueLinks" | "maxRequests">,
): Promise<CrawledPage | null> {
  const pages = await runHttpCrawl({
    ...options,
    maxRequests: 1,
    enqueueLinks: false,
    request: { ...options.request, urls: [url], maxPages: 1, maxDepth: 0 },
  });
  return pages[0] ?? null;
}

export { fetchText };
