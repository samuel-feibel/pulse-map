/**
 * A guard around fetch that keeps us well inside each free API's rate limit.
 *
 * Request times are recorded in localStorage, so spacing holds across page reloads (the dev server
 * reloads on every save) and across open tabs, not just within one page. A 429 pauses that service
 * for as long as the server asks, and at least a minute.
 */

export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface PoliteDeps {
  readonly now: () => number
  readonly sleep: (ms: number) => Promise<void>
  readonly storage: KeyValueStore
  readonly fetch: (url: string, init?: RequestInit) => Promise<Response>
}

export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

const MIN_BACKOFF_MS = 60_000
const STORAGE_PREFIX = 'polite-fetch:'

const readNextAllowed = (storage: KeyValueStore, service: string): number => {
  const stored = Number(storage.getItem(STORAGE_PREFIX + service))
  return Number.isFinite(stored) ? stored : 0
}

const writeNextAllowed = (storage: KeyValueStore, service: string, at: number): void =>
  storage.setItem(STORAGE_PREFIX + service, String(at))

function retryAfterMs(response: Response): number {
  const seconds = Number(response.headers.get('Retry-After'))
  return Math.max(Number.isFinite(seconds) ? seconds * 1000 : 0, MIN_BACKOFF_MS)
}

export type PoliteFetch = (service: string, url: string, minIntervalMs: number, init?: RequestInit) => Promise<Response>

export function createPoliteFetch(deps: PoliteDeps): PoliteFetch {
  return async (service, url, minIntervalMs, init) => {
    // Reserve our slot before waiting, so concurrent callers queue up behind us instead of all firing at once.
    const now = deps.now()
    const startAt = Math.max(now, readNextAllowed(deps.storage, service))
    writeNextAllowed(deps.storage, service, startAt + minIntervalMs)
    if (startAt > now) {
      await deps.sleep(startAt - now)
    }

    const response = await deps.fetch(url, init)
    if (response.status === 429) {
      writeNextAllowed(deps.storage, service, deps.now() + retryAfterMs(response))
    }
    if (!response.ok) {
      throw new HttpError(`${service} request failed: ${response.status} ${response.statusText}`, response.status)
    }
    return response
  }
}

/** localStorage when available; otherwise (private mode, blocked storage) an in-memory stand-in. */
export function browserStorage(): KeyValueStore {
  const memory = new Map<string, string>()
  const fallback: KeyValueStore = { getItem: (k) => memory.get(k) ?? null, setItem: (k, v) => void memory.set(k, v) }
  try {
    const probe = `${STORAGE_PREFIX}probe`
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    return window.localStorage
  } catch {
    return fallback
  }
}

/** One shared store so every module sees the same request history. */
export const browserStore: KeyValueStore = browserStorage()

export const politeFetch: PoliteFetch = createPoliteFetch({
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => window.setTimeout(resolve, ms)),
  storage: browserStore,
  fetch: (url, init) => fetch(url, init),
})
