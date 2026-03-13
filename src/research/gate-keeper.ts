import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod/v4'
import type { GateKeeperResult } from '@/types'

const GATE_KEEPER_SYSTEM = `You are a query validator for a culinary research tool. Your job is to determine if a user query is about a specific dish or ingredient.

Rules:
- ACCEPT queries about specific dishes (e.g., "pad thai", "ramen", "tiramisu", "sourdough bread")
- ACCEPT queries about specific ingredients (e.g., "saffron", "miso", "truffle", "vanilla")
- REJECT queries that are too broad or vague (e.g., "food", "Italian cuisine", "healthy eating")
- REJECT queries about more than 3 ingredients at once
- REJECT queries that are not about food at all
- REJECT recipe requests — this is a research tool, not a recipe finder

If the query is valid, normalize it to a clean, canonical form (e.g., "pad thai" not "PAD THAI recipe please").
If invalid, provide a brief, helpful reason why.`

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
