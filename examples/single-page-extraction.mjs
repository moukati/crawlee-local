import { CrawlEngine } from "../src/index.js";

const url = process.argv[2] ?? "https://example.com";
const engine = new CrawlEngine();
const result = await engine.execute({
  urls: [url],
  operation: "fetch",
  strategy: "auto",
  output: { text: true, markdown: true, metadata: true, links: true },
});

console.log(JSON.stringify({
  runId: result.runId,
  status: result.status,
  strategy: result.strategy,
  title: result.pages[0]?.title,
  textPreview: result.pages[0]?.text?.slice(0, 200),
  storage: result.storage?.runDirectory,
}, null, 2));
