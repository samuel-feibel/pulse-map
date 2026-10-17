import { browserStore, type KeyValueStore } from './politeFetch'

const PREFIX = 'cache:'

interface Entry {
  readonly savedAt: number
  readonly value: unknown
}

const isEntry = (value: unknown): value is Entry =>
  typeof value === 'object' && value !== null && typeof (value as Entry).savedAt === 'number' && 'value' in value

function read(storage: KeyValueStore, key: string): Entry | null {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(PREFIX + key) ?? 'null')
    return isEntry(parsed) ? parsed : null
  } catch {
    return null
  }
}

/**
 * Keeps slow-changing API data (like subway line shapes) for `ttlMs`, so reloading the page
 * doesn't spend rate-limited requests re-fetching it.
 */
export function createCache(storage: KeyValueStore, now: () => number = Date.now) {
  return async <T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> => {
    const entry = read(storage, key)
    if (entry && now() - entry.savedAt < ttlMs) {
      return entry.value as T
    }
    const value = await load()
    try {
      storage.setItem(PREFIX + key, JSON.stringify({ savedAt: now(), value }))
    } catch (error) {
      console.warn(`Could not cache ${key}; it will be fetched again next time.`, error)
    }
    return value
  }
}

export const DAY_MS = 24 * 60 * 60_000

/** Shared browser-backed cache. */
export const cached = createCache(browserStore)
