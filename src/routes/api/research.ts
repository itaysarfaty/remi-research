import { createFileRoute } from '@tanstack/react-router'

import type { ResearchSource, StreamEvent } from '@/types'
import type { WriterCallbacks } from '@/research/writer.ts'
import { getErrorMessage } from '@/lib/utils'
import { runGateKeeper } from '@/research/gate-keeper.ts'
import { runPlanner } from '@/research/planner.ts'
import { runSearcher } from '@/research/searcher.ts'
import { runWriter } from '@/research/writer.ts'
import { env } from '@/env'

function runMockWriter(
  sources: ResearchSource[],
  callbacks: WriterCallbacks,
): void {
  const citedSources = sources.slice(0, 3)
  const citations = citedSources.map((s) => `[${s.index}]`).join(', ')

  const mockReport = [
    `# Research Report\n\n`,
    `This is a mock report generated with SKIP_WRITE=true. `,
    `The search stage found ${sources.length} sources. `,
    `Here are highlights from the top results ${citations}.\n\n`,
    `## Key Findings\n\n`,
    `The research uncovered interesting information across multiple sources. `,
    `${citedSources[0] ? `According to "${citedSources[0].title}" [${citedSources[0].index}], there is substantial coverage of this topic. ` : ''}`,
    `${citedSources[1] ? `Further details are available from "${citedSources[1].title}" [${citedSources[1].index}]. ` : ''}`,
    `${citedSources[2] ? `Additional context can be found in "${citedSources[2].title}" [${citedSources[2].index}].` : ''}`,
  ]

  for (const delta of mockReport) {
    callbacks.onReportDelta(delta)
  }

  callbacks.onSources(citedSources)
}

async function runResearchPipeline(
  query: string,
  emit: (event: StreamEvent) => void,
): Promise<void> {
  try {
    // Stage 1: Validate
    emit({ type: 'stage', stage: 'validating' })
    const gateKeeperResult = await runGateKeeper(query)
    emit({ type: 'gate-keeper', result: gateKeeperResult })

    if (!gateKeeperResult.valid) {
      throw new Error(gateKeeperResult.reason || 'Invalid query')
    }

    // Stage 2: Plan
    emit({ type: 'stage', stage: 'planning' })
    const plan = await runPlanner(gateKeeperResult.normalizedQuery)
    emit({ type: 'plan', plan })

    // Stage 3: Search
    emit({ type: 'stage', stage: 'searching' })
    const sources = await runSearcher(plan, {
      onBatch: (batch) => emit({ type: 'search-batch', batch }),
      onBatchUrls: (batchIndex, urls) => emit({ type: 'batch-urls', batchIndex, urls }),
      onSearchResults: (count) => emit({ type: 'search-results', count }),
      onStartExtraction: () => emit({ type: 'stage', stage: 'extracting' }),
      onExtractionProgress: (extracted, total) => emit({ type: 'extraction-progress', extracted, total }),
    })

    if (sources.length === 0) {
      throw new Error('No sources found for this topic.')
    }

    // Stage 4: Write
    emit({ type: 'stage', stage: 'writing' })

    const writerCallbacks: WriterCallbacks = {
      onReportDelta: (delta) => emit({ type: 'report-delta', delta }),
      onSources: (sources) => emit({ type: 'sources', sources }),
    }

    if (env.SKIP_WRITE === 'true') {
      runMockWriter(sources, writerCallbacks)
    } else {
      await runWriter(gateKeeperResult.normalizedQuery, sources, writerCallbacks)
    }

    emit({ type: 'stage', stage: 'complete' })
  } catch (error) {
    emit({ type: 'error', message: getErrorMessage(error) })
  }
}

function createResearchStream(query: string): ReadableStream {
  const encoder = new TextEncoder()
  return new ReadableStream({
    async start(controller) {
      const emit = (event: StreamEvent) => {
        const data = `data: ${JSON.stringify(event)}\n\n`
        controller.enqueue(encoder.encode(data))
      }

      try {
        await runResearchPipeline(query, emit)
      } catch {
        emit({ type: 'error', message: 'Pipeline failed unexpectedly' })
      } finally {
        controller.close()
      }
    },
  })
}

export const Route = createFileRoute('/api/research')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as { query: string }
        const query = body.query?.trim()

        if (!query) {
          return new Response(JSON.stringify({ error: 'Query is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        return new Response(createResearchStream(query), {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        })
      },
    },
  },
})
