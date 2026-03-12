import { createFileRoute } from '@tanstack/react-router'
import { runResearchPipeline } from '@/research/ai/pipeline'
import type { ResearchEvent } from '@/types'

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

        const encoder = new TextEncoder()

        const stream = new ReadableStream({
          async start(controller) {
            const emit = (event: ResearchEvent) => {
              const data = `data: ${JSON.stringify(event)}\n\n`
              controller.enqueue(encoder.encode(data))
            }

            try {
              await runResearchPipeline(query, emit)
            } catch {
              const errorEvent: ResearchEvent = {
                type: 'error',
                message: 'Pipeline failed unexpectedly',
              }
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`),
              )
            } finally {
              controller.close()
            }
          },
        })

        return new Response(stream, {
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
