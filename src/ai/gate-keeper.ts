import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod/v4'
import { GATE_KEEPER_SYSTEM } from './prompts.ts'
import { env } from '@/env.ts'
import { hasCachedQuery } from './tavily-cache.ts'
import type { GateKeeperResult } from '@/types'

const schema = z.object({
  valid: z.boolean(),
  reason: z.string().nullable(),
  normalizedQuery: z.string(),
})

export async function runGateKeeper(query: string): Promise<GateKeeperResult> {
  const { output } = await generateText({
    model: openai('gpt-4o-mini'),
    system: GATE_KEEPER_SYSTEM,
    prompt: `Evaluate this query: "${query}"`,
    output: Output.object({ schema }),
  })

  if (output.valid && env.USE_TAVILY_CACHE === 'true') {
    const inCache = await hasCachedQuery(output.normalizedQuery)
    if (!inCache) {
      return {
        valid: false,
        reason: 'Query not found in cache',
        normalizedQuery: output.normalizedQuery,
      }
    }
  }

  return output
}
