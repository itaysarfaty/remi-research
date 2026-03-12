import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod/v4'
import { PLANNER_SYSTEM } from './prompts.ts'
import type { ResearchPlan } from '@/types'

const schema = z.object({
  summary: z
    .string()
    .describe(
      'A short paragraph (2-3 sentences) describing the research plan in natural language',
    ),
  topics: z.array(
    z.object({
      section: z.enum(['overview', 'origin', 'today']),
      topic: z.string(),
      description: z.string(),
    }),
  ),
})

export async function runPlanner(
  normalizedQuery: string,
): Promise<ResearchPlan> {
  const { output } = await generateText({
    model: openai('gpt-4o-mini'),
    system: PLANNER_SYSTEM,
    prompt: `Create a research plan for: "${normalizedQuery}"`,
    output: Output.object({ schema }),
  })

  return {
    query: normalizedQuery,
    summary: output.summary,
    topics: output.topics,
  }
}
