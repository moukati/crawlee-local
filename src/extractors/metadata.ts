import type { CheerioAPI } from "cheerio";

export function extractMetadata($: CheerioAPI): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};

  $("meta[property^='og:']").each((_, el) => {
    const prop = $(el).attr("property");
    const content = $(el).attr("content");
    if (prop && content) metadata[prop] = content;
  });

  $("meta[name]").each((_, el) => {
    const name = $(el).attr("name");
    const content = $(el).attr("content");
    if (name && content && !metadata[name]) metadata[name] = content;
  });

  $("script[type='application/ld+json']").each((_, el) => {
    const raw = $(el).html();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      metadata.jsonLd = parsed;
    } catch {
      // ignore invalid JSON-LD
    }
  });

  const lang = $("html").attr("lang");
  if (lang) metadata.language = lang;

  return metadata;
}
