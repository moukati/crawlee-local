import {
  CrawlRequestInput,
  CrawlRequest,
  CrawlRunResult,
  CrawledPage,
  CrawlError,
  StrategyDecision,
} from "./result-schema.js";
import { CrawlRequestSchema } from "./result-schema.js";
import { loadConfig, type AppConfig } from "./config.js";
import { createRunContext } from "./run-context.js";
import { enforceRequestPolicy } from "./policy.js";
import {
  assessHttpQuality,
  requiresBrowserFeatures,
  selectStrategy,
} from "./strategy-selector.js";
import { fetchSingleHttpPage, fetchText, runHttpCrawl } from "../crawlers/http-crawler.js";
import { createRobotsFetcher, runBrowserCrawl } from "../crawlers/browser-crawler.js";
import { discoverSitemapUrls } from "../crawlers/sitemap-crawler.js";
import { downloadPublicFile } from "../crawlers/file-downloader.js";
import { createLogger } from "../observability/logger.js";
import { persistRunResult } from "../storage/run-store.js";
import { ValidationError } from "./errors.js";

type ExecutionResult = {
  pages: CrawledPage[];
  errors: CrawlError[];
  strategy: StrategyDecision;
};

export class CrawlEngine {
  readonly config: AppConfig;

  constructor(config?: AppConfig) {
    this.config = config ?? loadConfig();
  }

  async execute(rawRequest: CrawlRequestInput): Promise<CrawlRunResult> {
    const request = CrawlRequestSchema.parse(rawRequest);
    const run = createRunContext(this.config);
    const logger = createLogger(this.config, run.runId);
    const startedAt = new Date();
    const policy = enforceRequestPolicy(request, this.config);
    const fetchRobots = await createRobotsFetcher(policy.requestTimeoutMs);

    logger.info("run started", {
      operation: request.operation,
      urls: request.urls,
      strategy: request.strategy,
    });

    const baseOptions = {
      request,
      config: this.config,
      run,
      logger,
      policy,
      fetchRobots,
    };

    let execution: ExecutionResult = {
      pages: [],
      errors: [],
      strategy: selectStrategy(request.strategy ?? "auto"),
    };

    try {
      switch (request.operation) {
        case "fetch":
        case "extract":
        case "screenshot":
          execution = await this.runFetchLike(baseOptions, request);
          break;
        case "crawl":
          execution = await this.runCrawl(baseOptions, request);
          break;
        case "sitemap": {
          const sitemapUrl = request.urls[0];
          const discovered = await discoverSitemapUrls(
            sitemapUrl,
            (url) => fetchText(url, policy.requestTimeoutMs),
            policy.maxPages,
          );
          execution = {
            pages: discovered.map((url, index) => ({
              requestedUrl: url,
              finalUrl: url,
              strategy: "http",
              depth: 0,
              fetchedAt: new Date().toISOString(),
              durationMs: 0,
              title: `sitemap-entry-${index + 1}`,
            })),
            errors: [],
            strategy: selectStrategy("http"),
          };
          break;
        }
        case "download": {
          const downloadErrors: CrawlError[] = [];
          const pages: CrawledPage[] = [];
          for (const url of request.urls) {
            try {
              const file = await downloadPublicFile({
                url,
                run,
                allowedDomains: policy.allowedDomains,
                maxFileBytes: policy.maxFileBytes,
                requestTimeoutMs: policy.requestTimeoutMs,
              });
              pages.push({
                requestedUrl: url,
                finalUrl: url,
                strategy: "http",
                depth: 0,
                fetchedAt: new Date().toISOString(),
                durationMs: 0,
                filePath: file.filePath,
                contentType: file.contentType,
                metadata: { bytes: file.bytes },
              });
            } catch (error) {
              downloadErrors.push({
                url,
                code: "DOWNLOAD_FAILED",
                message: error instanceof Error ? error.message : String(error),
              });
            }
          }
          execution = { pages, errors: downloadErrors, strategy: selectStrategy("http") };
          break;
        }
        default:
          throw new ValidationError(`Unsupported operation: ${request.operation}`);
      }
    } catch (error) {
      execution.errors.push({
        url: request.urls[0],
        code: "RUN_FAILED",
        message: error instanceof Error ? error.message : String(error),
      });
    }

    const completedAt = new Date();
    const result: CrawlRunResult = {
      runId: run.runId,
      status: deriveStatus(execution.pages, execution.errors),
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      strategy: execution.strategy,
      scope: {
        requestedUrls: request.urls,
        allowedDomains: policy.allowedDomains,
        maxPages: policy.maxPages,
        maxDepth: policy.maxDepth,
      },
      stats: {
        attempted: execution.pages.length + execution.errors.length,
        succeeded: execution.pages.length,
        failed: execution.errors.length,
        skipped: 0,
        blocked: 0,
        durationMs: completedAt.getTime() - startedAt.getTime(),
      },
      pages: execution.pages,
      errors: execution.errors,
      storage: { runDirectory: run.runDirectory, datasetId: run.datasetId },
    };

    persistRunResult(run.runDirectory, result);
    logger.info("run completed", { status: result.status, pages: execution.pages.length });
    return result;
  }

  private async runFetchLike(
    baseOptions: Parameters<typeof fetchSingleHttpPage>[1],
    request: CrawlRequest,
  ): Promise<ExecutionResult> {
    const url = request.urls[0];
    const browserRequired = requiresBrowserFeatures({
      screenshot: request.output?.screenshot,
      operation: request.operation,
    });

    if (request.strategy === "browser" || browserRequired) {
      const pages = await runBrowserCrawl({
        ...baseOptions,
        maxRequests: 1,
        enqueueLinks: false,
        captureScreenshot:
          request.operation === "screenshot" || request.output?.screenshot === true,
      });
      return {
        pages,
        errors: [],
        strategy: selectStrategy(request.strategy ?? "auto", undefined, true),
      };
    }

    const httpPage = await fetchSingleHttpPage(url, baseOptions);
    const assessment = assessHttpQuality({
      statusCode: httpPage?.statusCode,
      contentType: httpPage?.contentType,
      text: httpPage?.text,
      requiredSelectors: request.requiredSelectors,
      extracted: httpPage?.extracted,
    });

    if (
      (request.strategy === "http" || request.strategy === "auto") &&
      assessment.sufficient &&
      httpPage
    ) {
      return {
        pages: [httpPage],
        errors: [],
        strategy: selectStrategy(request.strategy ?? "auto", assessment, false),
      };
    }

    if (request.strategy === "http") {
      return {
        pages: httpPage ? [httpPage] : [],
        errors: httpPage ? [] : [{ url, code: "HTTP_FETCH_FAILED", message: "No page returned" }],
        strategy: selectStrategy("http", assessment, false),
      };
    }

    const browserPages = await runBrowserCrawl({
      ...baseOptions,
      maxRequests: 1,
      enqueueLinks: false,
      captureScreenshot:
        request.operation === "screenshot" || request.output?.screenshot === true,
    });

    return {
      pages: browserPages,
      errors: [],
      strategy: selectStrategy("auto", assessment, true),
    };
  }

  private async runCrawl(
    baseOptions: Parameters<typeof runHttpCrawl>[0],
    request: CrawlRequest,
  ): Promise<ExecutionResult> {
    if (request.strategy === "browser") {
      const pages = await runBrowserCrawl({
        ...baseOptions,
        enqueueLinks: true,
        captureScreenshot: request.output?.screenshot,
      });
      return { pages, errors: [], strategy: selectStrategy("browser") };
    }

    const httpPages = await runHttpCrawl({
      ...baseOptions,
      enqueueLinks: true,
    });

    const lowQuality = httpPages.filter((page) => {
      const assessment = assessHttpQuality({
        statusCode: page.statusCode,
        contentType: page.contentType,
        text: page.text,
        requiredSelectors: request.requiredSelectors,
        extracted: page.extracted,
      });
      return !assessment.sufficient;
    });

    if (request.strategy === "http" || lowQuality.length === 0) {
      return {
        pages: httpPages,
        errors: [],
        strategy: selectStrategy(request.strategy ?? "auto", { sufficient: true, reasons: [], confidence: 1 }),
      };
    }

    const browserPages = await runBrowserCrawl({
      ...baseOptions,
      request: {
        ...request,
        urls: lowQuality.map((p) => p.finalUrl ?? p.requestedUrl),
      },
      maxRequests: lowQuality.length,
      enqueueLinks: false,
      captureScreenshot: request.output?.screenshot,
    });

    const byUrl = new Map(httpPages.map((p) => [p.finalUrl ?? p.requestedUrl, p]));
    for (const page of browserPages) {
      byUrl.set(page.finalUrl ?? page.requestedUrl, page);
    }

    return {
      pages: [...byUrl.values()],
      errors: [],
      strategy: selectStrategy("auto", {
        sufficient: false,
        reasons: [`${lowQuality.length} pages failed HTTP quality checks`],
        confidence: 0,
      }),
    };
  }
}

function deriveStatus(pages: CrawledPage[], errors: CrawlError[]): CrawlRunResult["status"] {
  if (pages.length === 0 && errors.length > 0) return "failed";
  if (pages.length > 0 && errors.length > 0) return "partial";
  if (pages.length === 0) return "blocked";
  return "completed";
}

export async function healthCheck(config?: AppConfig) {
  const cfg = config ?? loadConfig();
  let browserInstalled = false;
  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    await browser.close();
    browserInstalled = true;
  } catch {
    browserInstalled = false;
  }

  return {
    ok: true,
    version: "0.1.0",
    crawleeVersion: "3.17.0",
    browserInstalled,
    storagePath: cfg.storageDir,
    modes: ["http", "browser", "auto"],
    integrations: {
      stagehand: cfg.stagehandEnabled,
      proxyConfigured: cfg.proxyUrls.length > 0,
    },
    warnings: browserInstalled
      ? []
      : ["Playwright Chromium not installed. Run `pnpm setup`."],
  };
}
