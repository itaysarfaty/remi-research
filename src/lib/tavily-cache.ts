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

interface CachedBatch {
  label: string
  queries: string[]
}

interface TavilyCacheEntry {
  batches: CachedBatch[]
  searches: Record<string, TavilySearchResult>
  extractions: Record<string, TavilyExtractResult['results'][number]>
}

type TavilyCache = Record<string, TavilyCacheEntry>

const cachePath = resolve(process.cwd(), 'tavily-cache.json')
let store: TavilyCache | null = null

async function loadStore(): Promise<TavilyCache> {
  if (store) return store

  try {
    const raw = await readFile(cachePath, 'utf-8')
    store = JSON.parse(raw)
  } catch {
    store = {}
  }

  return store!
}

export async function load(term: string): Promise<TavilyCacheEntry> {
  const s = await loadStore()

  if (!s[term]) {
    s[term] = { batches: [], searches: {}, extractions: {} }
  }

  return s[term]
}

export async function persist(): Promise<void> {
  if (!store) return
  await writeFile(cachePath, JSON.stringify(store, null, 2), 'utf-8')
}

export type { TavilySearchResult, TavilyExtractResult, TavilyCacheEntry, CachedBatch }
