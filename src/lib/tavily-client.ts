import { tavily } from '@tavily/core'
import { env } from '@/env'
import {
  load,
  persist,
  type TavilySearchResult,
  type TavilyExtractResult,
} from '@/lib/tavily-cache'

const cacheOnly = env.USE_TAVILY_CACHE === 'true'

const client = tavily({ apiKey: env.TAVILY_API_KEY })

export async function search(
  query: string,
  options?: { maxResults?: number; searchDepth?: 'basic' | 'advanced' },
): Promise<TavilySearchResult> {
  const data = await load()

  if (data.searches[query]) {
    return data.searches[query]
  }

  if (cacheOnly) {
    return { results: [] }
  }

  const result = await client.search(query, options)
  data.searches[query] = result as TavilySearchResult
  await persist()

  return result as TavilySearchResult
}

export async function extract(urls: string[]): Promise<TavilyExtractResult> {
  const data = await load()

  const cached: TavilyExtractResult['results'] = []
  const uncached: string[] = []

  for (const url of urls) {
    if (data.extractions[url]) {
      cached.push(data.extractions[url])
    } else {
      uncached.push(url)
    }
  }

  if (uncached.length === 0 || cacheOnly) {
    return { results: cached }
  }

  const result = await client.extract(uncached)

  for (const r of result.results) {
    data.extractions[r.url] = r as TavilyExtractResult['results'][number]
  }
  await persist()

  return {
    results: [...cached, ...result.results] as TavilyExtractResult['results'],
  }
}
