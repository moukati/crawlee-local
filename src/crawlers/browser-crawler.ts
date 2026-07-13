import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PlaywrightCrawler, Configuration } from "crawlee";
import { load } from "cheerio";
import type { CrawledPage, CrawlRequest } from "../core/result-schema.js";
import type { AppConfig } from "../core/config.js";
import { hashContent, checkUrlPolicy, normalizeUrl } from "../core/policy.js";
import { extractReadableContent } from "../extractors/readable-content.js";
import { extractStructured, validateRequiredFields } from "../extractors/structured.js";
import type { CheerioAPI } from "cheerio";
import type { RunContext } from "../core/run-context.js";
import type { createLogger } from "../observability/logger.js";
import { fetchText } from "./http-crawler.js";

export type BrowserCrawlOptions = {
  request: CrawlRequest;
  config: AppConfig;
  run: RunContext;
  logger: ReturnType<typeof createLogger>;
  policy: ReturnType<typeof import("../core/policy.js").enforceRequestPolicy>;
  fetchRobots: (url: string) => Promise<string | null>;
  onPage?: (page: CrawledPage) => void;
  maxRequests?: number;
  enqueueLinks?: boolean;
  captureScreenshot?: boolean;
};

export async function runBrowserCrawl(options: BrowserCrawlOptions): Promise<CrawledPage[]> {
  const pages: CrawledPage[] = [];
  const seen = new Set<string>();
  const output = options.request.output ?? {
    text: true,
    markdown: true,
    metadata: true,
    links: true,
  };

  const storagePath = join(options.run.runDirectory, "crawlee-browser");
  const crawleeConfig = new Configuration({
    storageClientOptions: { localDataDirectory: storagePath },
  });

  const crawler = new PlaywrightCrawler({
    maxRequestsPerCrawl: options.maxRequests ?? options.policy.maxPages,
    maxConcurrency: options.policy.browserConcurrency,
    requestHandlerTimeoutSecs: Math.ceil(options.policy.requestTimeoutMs / 1000),
    maxRequestRetries: options.request.limits?.retries ?? 1,
    headless: options.config.headless,
    launchContext: {
      launchOptions: {
        headless: options.config.headless,
      },
    },
    preNavigationHooks: [
      async ({ page }) => {
        await page.route("**/*", (route) => {
          const type = route.request().resourceType();
          if (["image", "font", "media"].includes(type)) {
            return route.abort();
          }
          return route.continue();
        });
      },
    ],
    async requestHandler({ request, page, enqueueLinks, response }) {
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

      await page.waitForLoadState("domcontentloaded");
      const html = await page.content();
      const $ = load(html);
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

      let screenshotPath: string | undefined;
      if (options.captureScreenshot || output.screenshot) {
        mkdirSync(join(options.run.runDirectory, "screenshots"), { recursive: true });
        screenshotPath = join(
          options.run.runDirectory,
          "screenshots",
          `${pages.length}.png`,
        );
        await page.screenshot({ path: screenshotPath, fullPage: false });
      }

      let htmlPath: string | undefined;
      if (output.html) {
        htmlPath = join(options.run.runDirectory, "pages", `${pages.length}.html`);
        writeFileSync(htmlPath, html, "utf8");
      }

      const pageResult: CrawledPage = {
        requestedUrl: request.url,
        finalUrl: loadedUrl,
        canonicalUrl: readable.canonicalUrl,
        statusCode: response?.status(),
        contentType: response?.headers()["content-type"],
        title: readable.title,
        description: readable.description,
        text: output.text ? readable.text : undefined,
        markdown: output.markdown ? readable.markdown : undefined,
        htmlPath,
        extracted,
        links: output.links ? readable.links : undefined,
        metadata: output.metadata ? readable.metadata : undefined,
        strategy: "browser",
        depth,
        parentUrl: request.userData.parentUrl as string | undefined,
        fetchedAt: new Date().toISOString(),
        durationMs: Date.now() - started,
        robots: policyDecision.robots,
        contentHash: readable.text ? hashContent(readable.text) : undefined,
        screenshotPath,
        warnings: warnings.length ? warnings : undefined,
      };

      pages.push(pageResult);
      options.onPage?.(pageResult);

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

export async function createRobotsFetcher(timeoutMs: number) {
  return async (robotsUrl: string) => fetchText(robotsUrl, timeoutMs);
}
