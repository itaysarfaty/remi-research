import { runGateKeeper } from '@/research/ai/gate-keeper'
import { runPlanner } from '@/research/ai/planner'
import { runSearcher } from '@/research/ai/searcher'
import { readCache, writeCache } from '@/research/ai/tavily-cache'
import type { ResearchEvent, SearchBatch, ResearchSource } from '@/types'

const query = process.argv[2]

if (!query) {
  console.error('Usage: pnpm cache-research "query"')
  process.exit(1)
}

console.log(`\nResearching: "${query}"\n`)

// Collect searcher events for caching
const searchBatches: SearchBatch[] = []
const batchUrls: Array<{
  batchIndex: number
  urls: Array<{ url: string; title: string }>
}> = []
let searchResultsCount = 0

const emit = (event: ResearchEvent) => {
  switch (event.type) {
    case 'stage':
      console.log(`  [stage] ${event.stage}`)
      break
    case 'gate-keeper':
      console.log(
        `  [gatekeeper] valid=${event.result.valid} normalized="${event.result.normalizedQuery}"`,
      )
      break
    case 'plan':
      console.log(
        `  [plan] ${event.plan.topics.length} topics: ${event.plan.topics.map((t) => t.topic).join(', ')}`,
      )
      break
    case 'search-batch':
      console.log(
        `  [search] Batch ${event.batch.batchIndex}: ${event.batch.label} (${event.batch.queries.length} queries)`,
      )
      searchBatches.push(event.batch)
      break
    case 'batch-urls':
      console.log(
        `  [urls] Batch ${event.batchIndex}: ${event.urls.length} new URLs`,
      )
      batchUrls.push({ batchIndex: event.batchIndex, urls: event.urls })
      break
    case 'search-results':
      console.log(`  [results] ${event.count} total unique URLs`)
      searchResultsCount = event.count
      break
    case 'extraction-progress':
      console.log(
        `  [extract] ${event.extracted}/${event.total} sources extracted`,
      )
      break
    case 'report-delta':
      break
    case 'sources':
      console.log(`  [sources] ${event.sources.length} cited sources`)
      break
    case 'error':
      console.error(`  [error] ${event.message}`)
      break
  }
}

async function main() {
  // Stage 1: Validate
  console.log('Stage 1: Validating...')
  const gateKeeperResult = await runGateKeeper(query)
  emit({ type: 'gate-keeper', result: gateKeeperResult })

  if (!gateKeeperResult.valid) {
    console.error(`\nQuery rejected: ${gateKeeperResult.reason}`)
    process.exit(1)
  }

  // Stage 2: Plan
  console.log('\nStage 2: Planning...')
  const plan = await runPlanner(gateKeeperResult.normalizedQuery)
  emit({ type: 'plan', plan })

  // Stage 3: Search
  console.log('\nStage 3: Searching...')
  const sources: ResearchSource[] = await runSearcher(plan, emit)

  if (sources.length === 0) {
    console.error('\nNo sources found.')
    process.exit(1)
  }

  console.log(`\nFound ${sources.length} sources. Writing to cache...`)

  // Write to cache
  const cache = await readCache()
  cache[gateKeeperResult.normalizedQuery] = {
    sources,
    searchBatches,
    batchUrls,
    searchResultsCount,
  }
  await writeCache(cache)

  console.log(
    `\nCached "${gateKeeperResult.normalizedQuery}" to tavily-cache.json`,
  )
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
