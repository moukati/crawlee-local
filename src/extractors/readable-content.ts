import type { AnyNode, Cheerio, CheerioAPI } from "cheerio";
import TurndownService from "turndown";
import { extractLinks } from "./links.js";
import { extractMetadata } from "./metadata.js";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

// Turndown typings only accept a narrow Filter union; runtime accepts tag names.
turndown.remove(["script", "style", "noscript"] as never);

const MAIN_SELECTORS = [
  "main",
  "article",
  "[role='main']",
  "#content",
  ".content",
  ".post-content",
  ".entry-content",
];

export function extractReadableContent($: CheerioAPI, baseUrl: string) {
  $("script, style, noscript, nav, footer, header, aside").remove();

  let root: Cheerio<AnyNode> = $("body");
  for (const selector of MAIN_SELECTORS) {
    const candidate = $(selector).first();
    if (candidate.length && candidate.text().trim().length > 100) {
      root = candidate;
      break;
    }
  }

  const html = root.html() ?? "";
  const text = root.text().replace(/\s+/g, " ").trim();
  const title = $("title").first().text().trim() || undefined;
  const description =
    $("meta[name='description']").attr("content")?.trim() ||
    $("meta[property='og:description']").attr("content")?.trim() ||
    undefined;

  const canonical =
    $("link[rel='canonical']").attr("href") ||
    $("meta[property='og:url']").attr("content") ||
    undefined;

  const markdown = text ? turndown.turndown(html) : undefined;
  const metadata = extractMetadata($);
  const links = extractLinks($, baseUrl);

  return {
    title,
    description,
    canonicalUrl: canonical ? new URL(canonical, baseUrl).toString() : baseUrl,
    text,
    markdown,
    metadata,
    links,
  };
}

export function scoreTextQuality(text: string): number {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return 0;
  return Math.min(1, normalized.length / 400);
}
