import { describe, expect, test } from 'vitest'
import { createCache } from './cache'

function memoryStore() {
  const store = new Map<string, string>()
  return { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) }
}

describe('cached', () => {
  test('loads once and reuses the result while it is fresh', async () => {
    let clock = 0
    let loads = 0
    const cached = createCache(memoryStore(), () => clock)
    const load = async () => ++loads
    await cached('lines', 1000, load)
    clock = 500
    expect(await cached('lines', 1000, load)).toBe(1)
    expect(loads).toBe(1)
  })

  test('loads again once the cached copy has expired', async () => {
    let clock = 0
    let loads = 0
    const cached = createCache(memoryStore(), () => clock)
    await cached('lines', 1000, async () => ++loads)
    clock = 1500
    expect(await cached('lines', 1000, async () => ++loads)).toBe(2)
  })

  test('ignores a corrupted cache entry', async () => {
    const store = memoryStore()
    store.setItem('cache:lines', '{not json')
    const cached = createCache(store, () => 0)
    expect(await cached('lines', 1000, async () => 'fresh')).toBe('fresh')
  })
})
