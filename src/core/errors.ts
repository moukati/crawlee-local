export class CrawleeLocalError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly retriable = false,
  ) {
    super(message);
    this.name = "CrawleeLocalError";
  }
}

export class PolicyBlockedError extends CrawleeLocalError {
  constructor(message: string, code = "POLICY_BLOCKED") {
    super(message, code, false);
    this.name = "PolicyBlockedError";
  }
}

export class ValidationError extends CrawleeLocalError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", false);
    this.name = "ValidationError";
  }
}

export function redactSecrets(text: string): string {
  return text
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [REDACTED]")
    .replace(/(api[_-]?key["']?\s*[:=]\s*["']?)[^"'\s]+/gi, "$1[REDACTED]")
    .replace(/(password["']?\s*[:=]\s*["']?)[^"'\s]+/gi, "$1[REDACTED]")
    .replace(/(proxy:\/\/)[^@\s]+@/gi, "$1[REDACTED]@");
}
