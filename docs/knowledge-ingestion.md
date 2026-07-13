# Knowledge ingestion contract

Crawlee Local produces normalized crawl output. Downstream BusinessBrain ingestion should handle chunking, embedding, indexing, and retention separately.

## Example record

```json
{
  "sourceType": "web",
  "sourceUrl": "https://example.com/pricing",
  "canonicalUrl": "https://example.com/pricing",
  "title": "Pricing",
  "content": "...",
  "contentHash": "...",
  "fetchedAt": "2026-07-13T12:00:00.000Z",
  "crawler": "crawlee",
  "strategy": "http",
  "entity": { "type": "company", "name": "Example" },
  "tags": ["pricing", "competitor-research"],
  "provenance": { "runId": "...", "parentUrl": "..." }
}
```

## Generate from a run

Use `exportKnowledgeRecords(result)` in `src/storage/run-store.ts` or read `pages.jsonl` from the run directory.

## Ingestion responsibilities (outside Crawlee)

- source attribution and licensing review
- chunking and metadata enrichment
- duplicate detection against existing brain docs
- embedding / vector index updates
- retention and deletion policy
