import { createFileRoute } from '@tanstack/react-router'

import type { StreamEvent } from '@/types'
import { getErrorMessage } from '@/lib/utils'
import { runGateKeeper } from '@/research/gate-keeper.ts'
import { runPlanner } from '@/research/planner.ts'
import { runSearcher } from '@/research/searcher.ts'
import { runWriter } from '@/research/writer.ts'
import { env } from '@/env'

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
      emit({
        type: 'error',
        message: gateKeeperResult.reason || 'Invalid query',
      })
      emit({ type: 'stage', stage: 'error' })
      return
    }

    // Stage 2: Plan
    emit({ type: 'stage', stage: 'planning' })
    const plan = await runPlanner(gateKeeperResult.normalizedQuery)
    emit({ type: 'plan', plan })

    // Stage 3: Search
    emit({ type: 'stage', stage: 'searching' })
    const sources = await runSearcher(plan, emit)

    if (sources.length === 0) {
      emit({ type: 'error', message: 'No sources found for this topic.' })
      emit({ type: 'stage', stage: 'error' })
      return
    }

    // Stage 4: Write
    emit({ type: 'stage', stage: 'writing' })

    if (env.SKIP_WRITE === 'true') {
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
        emit({ type: 'report-delta', delta })
      }

      emit({ type: 'sources', sources: citedSources })
    } else {
      await runWriter(gateKeeperResult.normalizedQuery, sources, emit)
    }

    emit({ type: 'stage', stage: 'complete' })
  } catch (error) {
    emit({ type: 'error', message: getErrorMessage(error) })
    emit({ type: 'stage', stage: 'error' })
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
