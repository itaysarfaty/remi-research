import { generateText, Output } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod/v4'
import type { ResearchPlan } from '@/types'

const PLANNER_SYSTEM = `You are a research planner for a culinary deep-research tool. Given a dish or ingredient, create a structured research plan with topics across three sections.

Sections:
1. **overview** — What it is, key characteristics, varieties/regional variants, how it's made or used
2. **origin** — Historical origins, cultural significance, evolution over time, traditional contexts
3. **today** — Modern relevance, global spread, contemporary adaptations, cultural impact today

Rules:
- Generate 4-7 topics total, distributed across all three sections
- Each topic should be specific and searchable
- Focus on the STORY — no recipes, no nutrition facts, no cooking instructions
- Topics should be complementary, not overlapping
- The summary should be a short, casual paragraph (2-3 sentences) written like you're excitedly telling a friend what you're about to dig into. Mention specific interesting angles and topics — NOT the structure of the write-up. Be curious and conversational. Vary your tone and sentence structure — don't fall into a formula. Sometimes lead with a question, sometimes with a surprising fact, sometimes jump straight into what makes this subject fascinating. Never start with "Ooh" or "Let's trace".`

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
