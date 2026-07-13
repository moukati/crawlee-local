import type { CheerioAPI } from "cheerio";
import { getDomain } from "../core/policy.js";

export function extractLinks($: CheerioAPI, baseUrl: string) {
  const baseDomain = getDomain(baseUrl);
  const internal = new Set<string>();
  const external = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href")?.trim();
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
      return;
    }
    try {
      const absolute = new URL(href, baseUrl).toString();
      if (getDomain(absolute) === baseDomain) internal.add(absolute);
      else external.add(absolute);
    } catch {
      // ignore invalid URLs
    }
  });

  return {
    internal: [...internal],
    external: [...external],
  };
}
