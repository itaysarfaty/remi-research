import { createFileRoute } from '@tanstack/react-router'
import { createResearchStream } from '@/research/create-stream'

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
