export async function discoverSitemapUrls(
  sitemapUrl: string,
  fetchText: (url: string) => Promise<string | null>,
  maxUrls = 500,
): Promise<string[]> {
  const body = await fetchText(sitemapUrl);
  if (!body) return [];

  const locMatches = [...body.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((m) =>
    m[1].trim(),
  );

  const urls: string[] = [];
  const nestedSitemaps: string[] = [];

  for (const loc of locMatches) {
    if (loc.endsWith(".xml") || loc.includes("sitemap")) nestedSitemaps.push(loc);
    else urls.push(loc);
    if (urls.length >= maxUrls) return urls.slice(0, maxUrls);
  }

  for (const nested of nestedSitemaps) {
    const nestedUrls = await discoverSitemapUrls(nested, fetchText, maxUrls - urls.length);
    urls.push(...nestedUrls);
    if (urls.length >= maxUrls) break;
  }

  return urls.slice(0, maxUrls);
}
