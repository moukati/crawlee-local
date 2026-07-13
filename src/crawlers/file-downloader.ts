import { createWriteStream } from "node:fs";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { RunContext } from "../core/run-context.js";
import { PolicyBlockedError } from "../core/errors.js";
import { getDomain, isDomainAllowed } from "../core/policy.js";

export async function downloadPublicFile(options: {
  url: string;
  run: RunContext;
  allowedDomains: string[];
  maxFileBytes: number;
  requestTimeoutMs: number;
}): Promise<{ filePath: string; bytes: number; contentType?: string }> {
  if (!isDomainAllowed(options.url, options.allowedDomains)) {
    throw new PolicyBlockedError(`Download URL outside allowed domains: ${options.url}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.requestTimeoutMs);
  try {
    const response = await fetch(options.url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? undefined;
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > options.maxFileBytes) {
      throw new PolicyBlockedError("File exceeds maxFileBytes limit");
    }

    const filename = sanitizeFilename(new URL(options.url).pathname.split("/").pop() || "download.bin");
    mkdirSync(join(options.run.runDirectory, "files"), { recursive: true });
    const filePath = join(options.run.runDirectory, "files", filename);

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > options.maxFileBytes) {
      throw new PolicyBlockedError("File exceeds maxFileBytes limit");
    }

    await pipeline(Readable.from(buffer), createWriteStream(filePath));

    return { filePath, bytes: buffer.byteLength, contentType };
  } finally {
    clearTimeout(timer);
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "download.bin";
}

export function isLikelyFileUrl(url: string): boolean {
  return /\.(pdf|csv|json|xml|txt|zip|png|jpg|jpeg|webp)(?:\?|$)/i.test(url);
}

export function assertDownloadDomain(url: string, allowedDomains: string[]): void {
  const domain = getDomain(url);
  if (!allowedDomains.includes(domain)) {
    throw new PolicyBlockedError(`Download blocked for domain ${domain}`);
  }
}
