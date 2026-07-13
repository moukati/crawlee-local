# Knowledge export format

Crawlee Local produces normalized crawl output. Downstream systems (RAG pipelines, vector DBs, note apps) handle chunking, embedding, and retention separately.

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
  "tags": ["pricing", "research"],
  "provenance": { "runId": "...", "parentUrl": "..." }
}
```

## Generate from a run

**In code:**

```javascript
import { exportKnowledgeRecords, loadRunResult } from "crawlee-local";
```

Or read `pages.jsonl` from the run directory (`storage.runDirectory` in the result JSON).

## Downstream responsibilities (outside this repo)

- Source attribution and licensing review
- Chunking and metadata enrichment
- Duplicate detection
- Embedding / vector index updates
- Retention and deletion policy
