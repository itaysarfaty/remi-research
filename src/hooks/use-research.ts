import { useReducer, useEffect } from 'react'
import type { ResearchState, ResearchEvent } from '@/types'

const initialState: ResearchState = {
  stage: 'idle',
  errorAtStage: null,
  gateKeeperResult: null,
  plan: null,
  searchBatches: [],
  batchUrls: [],
  searchResultsCount: 0,
  extractionProgress: null,
  report: '',
  citedSources: [],
  error: null,
}

type Action = ResearchEvent | { type: 'reset' }

function reducer(state: ResearchState, event: Action): ResearchState {
  switch (event.type) {
    case 'reset':
      return initialState
    case 'stage':
      if (event.stage === 'error') {
        return { ...state, stage: 'error', errorAtStage: state.stage }
      }
      return { ...state, stage: event.stage }
    case 'gate-keeper':
      return { ...state, gateKeeperResult: event.result }
    case 'plan':
      return { ...state, plan: event.plan }
    case 'search-batch':
      return { ...state, searchBatches: [...state.searchBatches, event.batch] }
    case 'batch-urls':
      return {
        ...state,
        batchUrls: [
          ...state.batchUrls,
          { batchIndex: event.batchIndex, urls: event.urls },
        ],
      }
    case 'search-results':
      return { ...state, searchResultsCount: event.count }
    case 'extraction-progress':
      return {
        ...state,
        extractionProgress: {
          extracted: event.extracted,
          total: event.total,
        },
      }
    case 'report-delta':
      return { ...state, report: state.report + event.delta }
    case 'sources':
      return { ...state, citedSources: event.sources }
    case 'error':
      return { ...state, error: event.message }
  }
}

export function useResearch(query: string | null, key: number = 0) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    dispatch({ type: 'reset' })

    if (!query) return

    const controller = new AbortController()

    async function run() {
      try {
        const response = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
          signal: controller.signal,
        })

        if (!response.ok || !response.body) {
          dispatch({
            type: 'error',
            message: `Failed to start research (${response.status})`,
          })
          dispatch({ type: 'stage', stage: 'error' })
          return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split('\n\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data: ')) continue
            try {
              const event = JSON.parse(trimmed.slice(6)) as ResearchEvent
              dispatch(event)
            } catch {
              // Skip malformed events
            }
          }
        }

        if (buffer.trim().startsWith('data: ')) {
          try {
            const event = JSON.parse(buffer.trim().slice(6)) as ResearchEvent
            dispatch(event)
          } catch {
            // Skip
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        dispatch({ type: 'error', message: 'Connection lost' })
        dispatch({ type: 'stage', stage: 'error' })
      }
    }

    run()

    return () => controller.abort()
  }, [query, key])

  return state
}
