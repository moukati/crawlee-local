import type { AnyNode, Cheerio, CheerioAPI } from "cheerio";
import type { ExtractionSchemaType } from "../core/result-schema.js";

export function extractStructured(
  $: CheerioAPI,
  schema: ExtractionSchemaType,
): { data: Record<string, unknown>; warnings: string[] } {
  const data: Record<string, unknown> = {};
  const warnings: string[] = [];

  for (const [field, rule] of Object.entries(schema.fields)) {
    const nodes = $(rule.selector);
    if (!nodes.length) {
      if (rule.required) warnings.push(`missing required field: ${field}`);
      continue;
    }

    if (rule.many) {
      const values = nodes
        .map((_, el) => readNode($(el), rule.type ?? "text", rule.attribute))
        .get()
        .filter((v) => v !== undefined && v !== "");
      data[field] = values;
      if (rule.required && values.length === 0) {
        warnings.push(`required list field empty: ${field}`);
      }
      continue;
    }

    const value = readNode(nodes.first(), rule.type ?? "text", rule.attribute);
    if (value === undefined || value === "") {
      if (rule.required) warnings.push(`required field empty: ${field}`);
    } else {
      data[field] = value;
    }
  }

  return { data, warnings };
}

function readNode(
  node: Cheerio<AnyNode>,
  type: "text" | "html" | "attribute" | "number",
  attribute?: string,
): unknown {
  switch (type) {
    case "html":
      return node.html()?.trim();
    case "attribute":
      return attribute ? node.attr(attribute)?.trim() : undefined;
    case "number": {
      const raw = node.text().replace(/[^0-9.\-]/g, "");
      const num = Number(raw);
      return Number.isFinite(num) ? num : undefined;
    }
    default:
      return node.text().replace(/\s+/g, " ").trim();
  }
}

export function validateRequiredFields(
  data: Record<string, unknown>,
  schema: ExtractionSchemaType,
): string[] {
  const missing: string[] = [];
  for (const [field, rule] of Object.entries(schema.fields)) {
    if (!rule.required) continue;
    const value = data[field];
    if (value === undefined || value === null || value === "") missing.push(field);
    if (Array.isArray(value) && value.length === 0) missing.push(field);
  }
  return missing;
}
