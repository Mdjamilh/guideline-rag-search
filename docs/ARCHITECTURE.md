# Architecture

```
content/guidelines/*.md ──► loadGuidelines ──► chunkDocument ──► ingestCorpus ──► Postgres
                                                                    │                 ├─ documents
                                                         Ollama /api/embed            └─ chunks (text, tsvector, vector(768))
                                                                                            │
POST /api/ask ──► answerQuestion ──► retrieve ──► keywordSearch ─┐                          │
                         │                    └─► vectorSearch ──┴─► reciprocalRankFusion ◄─┘
                         └─► Ollama /api/chat (stream) ──► NDJSON events ──► useAsk ──► AnswerPanel + SourceList
```

## Ingestion

- **Chunking** (`lib/chunk.ts`) is section-aware: one passage per `## ` section, split on paragraph or list-item boundaries only when longer than 900 characters. Each passage is prefixed with "Title — Heading" so it stands on its own for both search and the model. Ids (`slug#anchor-n`) are stable, and anchors match the rendered page, so citations can deep-link.
- **Ingestion** (`server/ingest.ts`) replaces each document in its own transaction, embeds in batches of 16, and validates embedding dimensions. Without Ollama, passages are stored without vectors and remain keyword-searchable.
- **Embedded mode:** with no `DATABASE_URL`, PGlite (Postgres in WebAssembly) loads the pgvector extension, runs migrations, and ingests on first request.

## Retrieval

### Keyword
A generated `tsvector` column with a GIN index. Questions rarely contain all their words in one passage, so terms are OR-ed together. Postgres's `ts_rank_cd` doesn't account for how rare a word is, so in the eval "How often do I need a mammogram?" ranked a colorectal passage first because of "often" and "need". The fix has two parts:

1. **IDF weighting:** each matched query lexeme contributes `ln(N / df) + 1`, with document frequencies from `ts_stat` (fine for a small corpus; a large one would cache this in a materialized view).
2. **Query expansion:** a short patient-to-guideline vocabulary list (mammogram → mammography, shingles → zoster, Pap → cytology…), because stemming can't bridge those.

### Vector
`nomic-embed-text` embeddings (768-d) with an HNSW index and cosine distance. Nearest-neighbor search always returns something, so matches beyond `VECTOR_MAX_DISTANCE` are discarded; otherwise nonsense questions would get "sources".

### Fusion
Reciprocal Rank Fusion, `Σ 1/(60 + rank)`, uses rank positions only, so `ts_rank` and cosine scores never need to be put on the same scale. Passages found by both retrievers rise to the top, and each result records which retrievers found it.

## Generation

- The prompt numbers the passages `[1]…[n]`, requires a citation on every factual sentence, forbids outside knowledge, and gives an explicit "not covered" answer.
- If retrieval returns nothing, the model is **not** called.
- `lib/citations.ts` drops citations outside `1..n` before rendering, since models sometimes cite a "[7]" that doesn't exist.

## Streaming protocol

`POST /api/ask` returns newline-delimited JSON:

| Event | When |
|---|---|
| `{type: "sources", retrieval, generation, passages}` | Immediately after retrieval, so sources render before the answer |
| `{type: "delta", text}` | Each chunk of model output |
| `{type: "no-results"}` | Nothing relevant was retrieved |
| `{type: "error", message}` | The model failed mid-way; sources stay visible |
| `{type: "done"}` | End of stream |

The route pulls from an async generator, so if the client disconnects, `cancel()` stops generation.

## Testing

| Level | Covers |
|---|---|
| Unit | Chunk boundaries, RRF math and ties, citation parsing, highlights, prompt shape, NDJSON stream parsing across chunk boundaries, synonym expansion, rate limiter |
| Integration (PGlite + pgvector) | Ingestion idempotency and dimension checks, keyword/vector/hybrid retrieval, vector cutoff, graceful fallback, answer pipeline event order |
| Eval | recall@1 and MRR ≥ 0.9 on 16 questions (also `npm run eval`) |
| End-to-end | Streamed cited answers, invalid citation removal, deep links, shared URLs, no-result path, on desktop and mobile, with a mock Ollama server |
