import { z } from "zod";

export const StrategySchema = z.enum(["auto", "http", "browser"]);
export type Strategy = z.infer<typeof StrategySchema>;

export const OperationSchema = z.enum([
  "fetch",
  "crawl",
  "extract",
  "sitemap",
  "download",
  "screenshot",
]);
export type Operation = z.infer<typeof OperationSchema>;

export const OutputOptionsSchema = z
  .object({
    text: z.boolean().optional(),
    markdown: z.boolean().optional(),
    html: z.boolean().optional(),
    links: z.boolean().optional(),
    metadata: z.boolean().optional(),
    screenshot: z.boolean().optional(),
  })
  .optional();

export const LimitsSchema = z
  .object({
    concurrency: z.number().int().positive().max(20).optional(),
    retries: z.number().int().min(0).max(5).optional(),
    requestTimeoutMs: z.number().int().positive().max(120_000).optional(),
    totalTimeoutMs: z.number().int().positive().max(600_000).optional(),
    maxResponseBytes: z.number().int().positive().max(50_000_000).optional(),
    maxFileBytes: z.number().int().positive().max(100_000_000).optional(),
  })
  .optional();

export const ExtractionFieldSchema = z.object({
  selector: z.string().min(1).max(500),
  type: z.enum(["text", "html", "attribute", "number"]).optional(),
  attribute: z.string().max(100).optional(),
  required: z.boolean().optional(),
  many: z.boolean().optional(),
});

export const ExtractionSchema = z.object({
  fields: z.record(z.string(), ExtractionFieldSchema),
});

export const CrawlRequestSchema = z.object({
  urls: z.array(z.string().url()).min(1).max(50),
  operation: OperationSchema,
  strategy: StrategySchema.optional().default("auto"),
  allowedDomains: z.array(z.string()).max(20).optional(),
  maxPages: z.number().int().positive().max(500).optional(),
  maxDepth: z.number().int().min(0).max(10).optional(),
  includePatterns: z.array(z.string().max(200)).max(20).optional(),
  excludePatterns: z.array(z.string().max(200)).max(20).optional(),
  requiredSelectors: z.array(z.string().max(200)).max(20).optional(),
  extractionSchema: ExtractionSchema.optional(),
  output: OutputOptionsSchema,
  limits: LimitsSchema,
  respectRobots: z.boolean().optional().default(true),
  policyOverride: z
    .object({
      allowCrossDomain: z.boolean().optional(),
      skipRobots: z.boolean().optional(),
    })
    .optional(),
});

export type CrawlRequestInput = z.input<typeof CrawlRequestSchema>;
export type CrawlRequest = z.infer<typeof CrawlRequestSchema>;
export type ExtractionSchemaType = z.infer<typeof ExtractionSchema>;

export const RobotsEvaluationSchema = z.object({
  checked: z.boolean(),
  allowed: z.boolean().nullable(),
  reason: z.string().optional(),
  userAgent: z.string().optional(),
});

export const CrawledPageSchema = z.object({
  requestedUrl: z.string(),
  finalUrl: z.string().optional(),
  canonicalUrl: z.string().optional(),
  statusCode: z.number().optional(),
  contentType: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  text: z.string().optional(),
  markdown: z.string().optional(),
  htmlPath: z.string().optional(),
  extracted: z.record(z.string(), z.unknown()).optional(),
  links: z
    .object({
      internal: z.array(z.string()).optional(),
      external: z.array(z.string()).optional(),
    })
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  strategy: z.string(),
  depth: z.number(),
  parentUrl: z.string().optional(),
  fetchedAt: z.string(),
  durationMs: z.number(),
  robots: RobotsEvaluationSchema.optional(),
  contentHash: z.string().optional(),
  duplicate: z.boolean().optional(),
  screenshotPath: z.string().optional(),
  filePath: z.string().optional(),
  warnings: z.array(z.string()).optional(),
  errors: z.array(z.string()).optional(),
});

export type CrawledPage = z.infer<typeof CrawledPageSchema>;

export const CrawlErrorSchema = z.object({
  url: z.string(),
  code: z.string(),
  message: z.string(),
  retriable: z.boolean().optional(),
});

export type CrawlError = z.infer<typeof CrawlErrorSchema>;

export const StrategyDecisionSchema = z.object({
  requestedStrategy: StrategySchema,
  selectedStrategy: z.enum(["http", "browser"]),
  fallbackOccurred: z.boolean(),
  fallbackReasons: z.array(z.string()),
});

export type StrategyDecision = z.infer<typeof StrategyDecisionSchema>;

export const CrawlRunResultSchema = z.object({
  runId: z.string(),
  status: z.enum(["completed", "partial", "failed", "blocked"]),
  startedAt: z.string(),
  completedAt: z.string(),
  strategy: StrategyDecisionSchema,
  scope: z.object({
    requestedUrls: z.array(z.string()),
    allowedDomains: z.array(z.string()),
    maxPages: z.number(),
    maxDepth: z.number(),
  }),
  stats: z.object({
    attempted: z.number(),
    succeeded: z.number(),
    failed: z.number(),
    skipped: z.number(),
    blocked: z.number(),
    durationMs: z.number(),
  }),
  pages: z.array(CrawledPageSchema),
  errors: z.array(CrawlErrorSchema),
  storage: z
    .object({
      runDirectory: z.string().optional(),
      datasetId: z.string().optional(),
    })
    .optional(),
});

export type CrawlRunResult = z.infer<typeof CrawlRunResultSchema>;

export const KnowledgeRecordSchema = z.object({
  sourceType: z.literal("web"),
  sourceUrl: z.string(),
  canonicalUrl: z.string().optional(),
  title: z.string().optional(),
  content: z.string(),
  contentHash: z.string(),
  fetchedAt: z.string(),
  crawler: z.literal("crawlee"),
  strategy: z.string(),
  entity: z
    .object({
      type: z.string(),
      name: z.string(),
    })
    .optional(),
  tags: z.array(z.string()).optional(),
  provenance: z.object({
    runId: z.string(),
    parentUrl: z.string().optional(),
  }),
});

export type KnowledgeRecord = z.infer<typeof KnowledgeRecordSchema>;
