# Deep Modules Analysis & Recommendations

The concept of **deep modules** (from Ousterhout's *A Philosophy of Software Design*) is about modules that provide powerful functionality behind simple interfaces — maximizing what's hidden while minimizing what's exposed. The opposite, **shallow modules**, have complex interfaces relative to the functionality they provide.

## Current State: What's Already Deep

**`useResearch(query, key)` → `ResearchState`** — This is already a good deep module. It hides SSE parsing, stream buffering, abort controller lifecycle, and event dispatching behind a two-parameter interface.

**`runResearchPipeline(query, emit)`** — Simple interface hiding a 4-stage orchestration. Also solid.

## Where Things Are Shallow (and how to deepen them)

### 1. The Searcher is doing too many jobs at once

`searcher.ts` currently handles search query generation, Tavily API calls, caching, URL deduplication, and content extraction — but it **exposes all of this complexity upstream** through fine-grained events (`search-batch`, `batch-urls`, `search-results`, `extraction-progress`).

**Recommendation:** Split into two deep modules:

- **`searcher.ts`** — Takes a `ResearchPlan`, returns `ResearchSource[]`. Hides batching, deduplication, caching, and query generation internally. Emits only high-level progress (e.g., percentage).
- **`tavily-client.ts`** — A deep wrapper around Tavily that handles caching transparently. The searcher calls `search(query)` and doesn't know whether it hit cache or network. Right now `tavily-cache.ts` is a shallow utility — the caller has to manually check `hasCachedQuery()`, read the cache, or call the API. Push that decision inside.

```ts
// Before (shallow — caller manages caching logic)
if (hasCachedQuery(query)) {
  return getCachedEntry(query);
}
const result = await tavily.search(query);
writeCache(query, result);

// After (deep — caching is invisible)
const result = await tavilyClient.search(query);
```

### 2. The event/type system is a wide, shallow interface

`types.ts` defines **19 event variants** in `ResearchEvent` and **8 stages** in `ResearchStage`. Every component and the hook must understand this full surface. The reducer in `use-research.ts` is essentially a giant switch over all 19 event types.

**Recommendation:** Reduce the event surface by grouping related events. The pipeline stages don't all need distinct event types visible to consumers:

- Combine `search-batch` + `batch-urls` + `search-results` + `extraction-progress` into a single `search-progress` event with a nested status field
- Combine `stage` + `gate-keeper` into pipeline-level control events
- This shrinks the discriminated union from ~19 to ~6-8 variants, making the interface between server and client **deeper**

### 3. Prompts are separated but pipeline stages aren't self-contained

Each pipeline stage (`gate-keeper.ts`, `planner.ts`, `writer.ts`) imports its prompt from `prompts.ts`. This is a **shallow decomposition** — the prompt is an implementation detail of each stage, not a shared concern.

**Recommendation:** Co-locate each prompt with its stage module. Each module becomes a deeper, more self-contained unit:

```
// gate-keeper.ts owns its own prompt internally
// planner.ts owns its own prompt internally
// writer.ts owns its own prompt internally
```

Delete `prompts.ts`. No external consumer needs those prompt strings — they're implementation details. This follows the deep module principle: hide what doesn't need to be exposed.

### 4. The API route is a pass-through (shallow)

`routes/api/research.ts` does almost nothing — it calls `runResearchPipeline` and wraps the result in an SSE stream. The SSE encoding logic (converting events to `data: JSON\n\n` lines) could be absorbed.

**Recommendation:** Create a deep `createResearchStream(query): ReadableStream` function that handles both pipeline execution *and* SSE encoding. The route handler becomes a one-liner, and the SSE protocol becomes an implementation detail rather than something the route has to wire up.

### 5. Components mirror the shallow event structure

`research-timeline.tsx` has to understand the internal stages of the pipeline to render correctly. It's coupled to implementation details (number of search batches, extraction steps, etc.).

**Recommendation:** Have the pipeline expose a simpler **progress model** — e.g., `{ phase: 'planning' | 'searching' | 'writing', progress: number, detail?: string }` — rather than making the UI reconstruct progress from raw events. The timeline component becomes deeper by accepting a simpler input.

## Summary: Priority Order

| Priority | Change                                    | Impact                                            |
| -------- | ----------------------------------------- | ------------------------------------------------- |
| 1        | Merge caching into a deep Tavily client   | Eliminates leaked abstraction, simplest win        |
| 2        | Co-locate prompts into their stage modules | Removes unnecessary file, makes stages self-contained |
| 3        | Consolidate event types (19 → ~7)         | Simplifies the entire client-server contract       |
| 4        | Create `createResearchStream()`           | Deepens the API boundary                           |
| 5        | Simplify progress model for components    | Decouples UI from pipeline internals               |
