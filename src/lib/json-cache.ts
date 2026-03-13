import { readFile, writeFile } from 'node:fs/promises'

export class JsonCache<T> {
  private data: T | null = null

  constructor(
    private path: string,
    private defaultData: () => T = () => ({}) as T,
  ) {}

  async load(): Promise<T> {
    if (this.data) return this.data

    try {
      const raw = await readFile(this.path, 'utf-8')
      this.data = JSON.parse(raw)
    } catch {
      this.data = this.defaultData()
    }

    return this.data!
  }

  async persist(): Promise<void> {
    if (!this.data) return
    await writeFile(this.path, JSON.stringify(this.data, null, 2), 'utf-8')
  }
}
