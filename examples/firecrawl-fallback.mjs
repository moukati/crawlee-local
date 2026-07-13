/**
 * Demonstrates Firecrawl -> Crawlee fallback decision flow without requiring Firecrawl credentials.
 */

function assessManagedExtraction(payload) {
  const text = payload?.markdown ?? payload?.text ?? "";
  const sufficient = text.replace(/\s+/g, " ").trim().length >= 120;
  return { sufficient, textLength: text.length };
}

const managedAttempt = {
  url: process.env.DEMO_URL ?? "https://example.com",
  markdown: "Example Domain",
};

const quality = assessManagedExtraction(managedAttempt);
console.log("Managed extraction quality:", quality);

if (quality.sufficient) {
  console.log("Decision: keep managed extraction result.");
  process.exit(0);
}

console.log("Decision: managed extraction insufficient -> use Crawlee HTTP, then browser if needed.");

const { CrawlEngine } = await import("../src/index.js");
const engine = new CrawlEngine();
const result = await engine.execute({
  urls: [managedAttempt.url],
  operation: "fetch",
  strategy: "auto",
  output: { text: true, markdown: true, metadata: true },
});

console.log(JSON.stringify({
  fallbackFrom: "firecrawl-mock",
  runId: result.runId,
  strategy: result.strategy,
  title: result.pages[0]?.title,
  textLength: result.pages[0]?.text?.length ?? 0,
}, null, 2));
