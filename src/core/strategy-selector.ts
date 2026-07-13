import type { Strategy, StrategyDecision } from "./result-schema.js";

export type HttpQualityInput = {
  statusCode?: number;
  contentType?: string;
  html?: string;
  text?: string;
  requiredSelectors?: string[];
  extracted?: Record<string, unknown>;
};

export type QualityAssessment = {
  sufficient: boolean;
  reasons: string[];
  confidence: number;
};

const JS_SHELL_MARKERS = [
  "id=\"root\"",
  "id='root'",
  "id=\"app\"",
  "id='app'",
  "data-reactroot",
  "__NEXT_DATA__",
  "window.__INITIAL_STATE__",
];

export function assessHttpQuality(input: HttpQualityInput): QualityAssessment {
  const reasons: string[] = [];

  if (!input.statusCode || input.statusCode >= 400) {
    reasons.push(`HTTP status ${input.statusCode ?? "unknown"}`);
    return { sufficient: false, reasons, confidence: 0 };
  }

  const contentType = input.contentType?.toLowerCase() ?? "";
  if (contentType && !contentType.includes("text/html") && !contentType.includes("application/json")) {
    reasons.push(`unsupported content type: ${contentType}`);
    return { sufficient: false, reasons, confidence: 0.1 };
  }

  const text = (input.text ?? "").replace(/\s+/g, " ").trim();
  const html = input.html ?? "";

  if (text.length < 80) {
    reasons.push("meaningful text below threshold");
  }

  if (html && JS_SHELL_MARKERS.some((m) => html.includes(m)) && text.length < 200) {
    reasons.push("likely JavaScript application shell with minimal rendered text");
  }

  if (input.requiredSelectors?.length && html) {
    for (const selector of input.requiredSelectors) {
      if (!selectorPresent(html, selector)) {
        reasons.push(`required selector missing: ${selector}`);
      }
    }
  }

  if (input.extracted) {
    for (const [key, value] of Object.entries(input.extracted)) {
      if (value === undefined || value === null || value === "") {
        reasons.push(`required extracted field empty: ${key}`);
      }
    }
  }

  const confidence = Math.max(0, Math.min(1, text.length / 500));
  const sufficient = reasons.length === 0;
  return { sufficient, reasons, confidence };
}

function selectorPresent(html: string, selector: string): boolean {
  if (selector.startsWith("#")) {
    const id = selector.slice(1);
    return html.includes(`id="${id}"`) || html.includes(`id='${id}'`);
  }
  if (selector.startsWith(".")) {
    const cls = selector.slice(1);
    return html.includes(`class="${cls}`) || html.includes(`class='${cls}`);
  }
  return html.includes(`<${selector}`) || html.includes(`<${selector} `);
}

export function selectStrategy(
  requested: Strategy,
  httpAssessment?: QualityAssessment,
  requiresBrowser = false,
): StrategyDecision {
  if (requested === "http") {
    return {
      requestedStrategy: requested,
      selectedStrategy: "http",
      fallbackOccurred: false,
      fallbackReasons: [],
    };
  }

  if (requested === "browser" || requiresBrowser) {
    return {
      requestedStrategy: requested,
      selectedStrategy: "browser",
      fallbackOccurred: requested === "auto",
      fallbackReasons:
        requiresBrowser && requested === "auto"
          ? ["explicit browser requirement detected"]
          : requested === "auto" && httpAssessment && !httpAssessment.sufficient
            ? httpAssessment.reasons
            : [],
    };
  }

  if (httpAssessment && !httpAssessment.sufficient) {
    return {
      requestedStrategy: "auto",
      selectedStrategy: "browser",
      fallbackOccurred: true,
      fallbackReasons: httpAssessment.reasons,
    };
  }

  return {
    requestedStrategy: "auto",
    selectedStrategy: "http",
    fallbackOccurred: false,
    fallbackReasons: [],
  };
}

export function requiresBrowserFeatures(options: {
  screenshot?: boolean;
  operation?: string;
}): boolean {
  return options.screenshot === true || options.operation === "screenshot";
}
