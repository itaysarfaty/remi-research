import { resolve } from 'node:path'
import { tavily } from '@tavily/core'
import { env } from '@/lib/env.ts'
import { JsonCache } from '@/lib/json-cache.ts'

const cacheOnly = env.USE_TAVILY_CACHE === 'true'

interface TavilySearchResult {
  results: Array<{
    url: string
    title: string
    score: number
    content: string
    rawContent: string
  }>
}

interface TavilyExtractResult {
  results: Array<{
    url: string
    rawContent: string
  }>
}

interface TavilyCache {
  searches: Record<string, TavilySearchResult>
  extractions: Record<string, TavilyExtractResult['results'][number]>
}

const cachePath = resolve(process.cwd(), 'tavily-cache.json')
const cache = new JsonCache<TavilyCache>(cachePath)
const client = tavily({ apiKey: env.TAVILY_API_KEY })

export async function search(
  query: string,
  options?: { maxResults?: number; searchDepth?: 'basic' | 'advanced' },
): Promise<TavilySearchResult> {
  const data = await cache.load()

  if (data.searches[query]) {
    return data.searches[query]
  }

  if (cacheOnly) {
    return { results: [] }
  }

  const result = await client.search(query, options)
  data.searches[query] = result as TavilySearchResult
  await cache.persist()

  return result as TavilySearchResult
}

export async function extract(urls: string[]): Promise<TavilyExtractResult> {
  const data = await cache.load()

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
  await cache.persist()

  return {
    results: [...cached, ...result.results] as TavilyExtractResult['results'],
  }
}
