import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

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
let data: TavilyCache | null = null

const defaultCache: TavilyCache = {
  searches: {},
  extractions: {},
}

const cacheIsEmpty = (cache: TavilyCache): boolean => {
  return (
    Object.keys(cache.searches).length === 0 &&
    Object.keys(cache.extractions).length === 0
  )
}

export async function load(): Promise<TavilyCache> {
  if (data) return data

  try {
    const raw = await readFile(cachePath, 'utf-8')
    const parsed = JSON.parse(raw)
    data = cacheIsEmpty(parsed) ? defaultCache : parsed
  } catch {
    data = defaultCache
  }

  return data!
}

export async function persist(): Promise<void> {
  if (!data) return
  await writeFile(cachePath, JSON.stringify(data, null, 2), 'utf-8')
}

export type { TavilySearchResult, TavilyExtractResult, TavilyCache }
