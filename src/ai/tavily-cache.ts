import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { ResearchSource, SearchBatch } from '@/types'

export interface CacheEntry {
  sources: ResearchSource[]
  searchBatches: SearchBatch[]
  batchUrls: Array<{
    batchIndex: number
    urls: Array<{ url: string; title: string }>
  }>
  searchResultsCount: number
}

type Cache = Record<string, CacheEntry>

const CACHE_PATH = resolve(process.cwd(), 'tavily-cache.json')

export async function readCache(): Promise<Cache> {
  try {
    const data = await readFile(CACHE_PATH, 'utf-8')
    return JSON.parse(data)
  } catch {
    return {}
  }
}

export async function writeCache(cache: Cache): Promise<void> {
  await writeFile(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf-8')
}

export async function getCachedEntry(
  normalizedQuery: string,
): Promise<CacheEntry | null> {
  const cache = await readCache()
  return cache[normalizedQuery] ?? null
}

export async function hasCachedQuery(
  normalizedQuery: string,
): Promise<boolean> {
  const cache = await readCache()
  return normalizedQuery in cache
}
