import { describe, expect, it } from "vitest";
import {
  deriveAllowedDomains,
  enforceRequestPolicy,
  hashContent,
  isDomainAllowed,
  matchesPattern,
  normalizeUrl,
  shouldIncludeUrl,
} from "../../src/core/policy.js";
import { assessHttpQuality, selectStrategy } from "../../src/core/strategy-selector.js";
import { loadConfig } from "../../src/core/config.js";
import { redactSecrets } from "../../src/core/errors.js";
import { CrawlRequestSchema } from "../../src/core/result-schema.js";

describe("policy", () => {
  it("normalizes duplicate query ordering", () => {
    expect(normalizeUrl("https://example.com/a?b=2&a=1")).toBe(
      "https://example.com/a?a=1&b=2",
    );
  });

  it("derives allowed domains from seed URLs", () => {
    expect(deriveAllowedDomains(["https://docs.example.com/page"])).toEqual([
      "docs.example.com",
    ]);
  });

  it("blocks cross-domain URLs by default", () => {
    const config = loadConfig({ storageDir: ".tmp/test-storage" });
    expect(() =>
      enforceRequestPolicy(
        CrawlRequestSchema.parse({
          urls: ["https://evil.com"],
          operation: "fetch",
          allowedDomains: ["example.com"],
        }),
        config,
      ),
    ).toThrow(/outside allowed domains/);
  });

  it("excludes auth and checkout paths", () => {
    expect(shouldIncludeUrl("https://example.com/login")).toBe(false);
    expect(shouldIncludeUrl("https://example.com/pricing")).toBe(true);
  });

  it("matches include globs", () => {
    expect(matchesPattern("https://example.com/docs/page", "**/docs/**")).toBe(true);
  });

  it("hashes content deterministically", () => {
    expect(hashContent("hello")).toHaveLength(64);
    expect(hashContent("hello")).toBe(hashContent("hello"));
  });

  it("checks domain allowlist", () => {
    expect(isDomainAllowed("https://www.example.com/x", ["example.com"])).toBe(true);
    expect(isDomainAllowed("https://other.com/x", ["example.com"])).toBe(false);
  });
});

describe("strategy selector", () => {
  it("prefers HTTP when quality is sufficient", () => {
    const decision = selectStrategy("auto", {
      sufficient: true,
      reasons: [],
      confidence: 0.9,
    });
    expect(decision.selectedStrategy).toBe("http");
    expect(decision.fallbackOccurred).toBe(false);
  });

  it("falls back to browser for JS shell signals", () => {
    const assessment = assessHttpQuality({
      statusCode: 200,
      contentType: "text/html",
      html: "<html><body><div id=\"root\"></div></body></html>",
      text: "short",
    });
    expect(assessment.sufficient).toBe(false);
    const decision = selectStrategy("auto", assessment);
    expect(decision.selectedStrategy).toBe("browser");
    expect(decision.fallbackOccurred).toBe(true);
  });
});

describe("security", () => {
  it("redacts bearer tokens", () => {
    expect(redactSecrets("Authorization: Bearer abc.def.ghi")).toContain("[REDACTED]");
  });
});

describe("validation", () => {
  it("rejects invalid URLs", () => {
    expect(() =>
      CrawlRequestSchema.parse({ urls: ["not-a-url"], operation: "fetch" }),
    ).toThrow();
  });
});
