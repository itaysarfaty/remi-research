import type { ResearchEvent } from '@/types'
import { runResearchPipeline } from './pipeline.ts'

export function createResearchStream(query: string): ReadableStream {
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
