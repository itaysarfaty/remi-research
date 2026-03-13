import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { tavily } from '@tavily/core'
import { env } from '@/lib/env.ts'

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

const CACHE_PATH = resolve(process.cwd(), 'tavily-cache.json')

async function readCache(): Promise<TavilyCache> {
  try {
    const data = await readFile(CACHE_PATH, 'utf-8')
    return JSON.parse(data)
  } catch {
    return { searches: {}, extractions: {} }
  }
}

async function persistCache(cache: TavilyCache): Promise<void> {
  await writeFile(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8')
}

const client = tavily({ apiKey: env.TAVILY_API_KEY })

const cacheOnly = env.USE_TAVILY_CACHE === 'true'

export async function search(
  query: string,
  options?: { maxResults?: number; searchDepth?: 'basic' | 'advanced' },
): Promise<TavilySearchResult> {
  const cache = await readCache()

  if (cache.searches[query]) {
    return cache.searches[query]
  }

  if (cacheOnly) {
    return { results: [] }
  }

  const result = await client.search(query, options)
  cache.searches[query] = result as TavilySearchResult
  await persistCache(cache)

  return result as TavilySearchResult
}

export async function extract(urls: string[]): Promise<TavilyExtractResult> {
  const cache = await readCache()

  const cached: TavilyExtractResult['results'] = []
  const uncached: string[] = []

  for (const url of urls) {
    if (cache.extractions[url]) {
      cached.push(cache.extractions[url])
    } else {
      uncached.push(url)
    }
  }

  if (uncached.length === 0 || cacheOnly) {
    return { results: cached }
  }

  const result = await client.extract(uncached)

  for (const r of result.results) {
    cache.extractions[r.url] = r as TavilyExtractResult['results'][number]
  }
  await persistCache(cache)

  return { results: [...cached, ...result.results] as TavilyExtractResult['results'] }
}
