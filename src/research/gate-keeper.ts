import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod/v4'
import { GATE_KEEPER_SYSTEM } from './prompts.ts'
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

  return output
}
