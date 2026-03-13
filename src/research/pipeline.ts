import type { ResearchEvent } from '@/types'
import { runGateKeeper } from './gate-keeper.ts'
import { runPlanner } from './planner.ts'
import { runSearcher } from './searcher.ts'
import { runWriter } from './writer.ts'

export async function runResearchPipeline(
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
    const message =
      error instanceof Error ? error.message : 'An unexpected error occurred'
    emit({ type: 'error', message })
    emit({ type: 'stage', stage: 'error' })
  }
}
