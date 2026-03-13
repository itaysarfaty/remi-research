import { createFileRoute } from '@tanstack/react-router'

import type { ResearchEvent } from '@/types'
import { getErrorMessage } from '@/lib/utils'
import { runGateKeeper } from '@/research/gate-keeper.ts'
import { runPlanner } from '@/research/planner.ts'
import { runSearcher } from '@/research/searcher.ts'
import { runWriter } from '@/research/writer.ts'

async function runResearchPipeline(
  query: string,
  emit: (event: ResearchEvent) => void,
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
    await runWriter(gateKeeperResult.normalizedQuery, sources, emit)

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
      const emit = (event: ResearchEvent) => {
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
