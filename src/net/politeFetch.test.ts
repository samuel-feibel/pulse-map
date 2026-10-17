import { describe, expect, test } from 'vitest'
import { createPoliteFetch, type PoliteDeps } from './politeFetch'

function fakeDeps(responses: Response[] = []) {
  let clock = 1_000_000
  const store = new Map<string, string>()
  const calls: number[] = []
  const deps: PoliteDeps = {
    now: () => clock,
    sleep: async (ms) => {
      clock += ms
    },
    storage: {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => void store.set(k, v),
    },
    fetch: async () => {
      calls.push(clock)
      return responses.shift() ?? new Response('{}', { status: 200 })
    },
  }
  return { deps, calls, advance: (ms: number) => (clock += ms) }
}

describe('politeFetch', () => {
  test('spaces requests to the same service by at least the minimum interval', async () => {
    const { deps, calls } = fakeDeps()
    const polite = createPoliteFetch(deps)
    await polite('mbta', 'https://x', 10_000)
    await polite('mbta', 'https://x', 10_000)
    expect(calls[1] - calls[0]).toBeGreaterThanOrEqual(10_000)
  })

  test('keeps the spacing across a page reload', async () => {
    const { deps, calls } = fakeDeps()
    await createPoliteFetch(deps)('adsb', 'https://x', 5_000)
    await createPoliteFetch(deps)('adsb', 'https://x', 5_000)
    expect(calls[1] - calls[0]).toBeGreaterThanOrEqual(5_000)
  })

  test('does not hold back a different service', async () => {
    const { deps, calls } = fakeDeps()
    const polite = createPoliteFetch(deps)
    await polite('mbta', 'https://x', 10_000)
    await polite('espn', 'https://y', 10_000)
    expect(calls[1]).toBe(calls[0])
  })

  test('backs off after a 429, honoring Retry-After', async () => {
    const limited = new Response('', { status: 429, headers: { 'Retry-After': '120' } })
    const { deps, calls } = fakeDeps([limited])
    const polite = createPoliteFetch(deps)
    await expect(polite('adsb', 'https://x', 5_000)).rejects.toThrow(/429/)
    await polite('adsb', 'https://x', 5_000)
    expect(calls[1] - calls[0]).toBeGreaterThanOrEqual(120_000)
  })

  test('backs off at least a minute after a 429 without Retry-After', async () => {
    const { deps, calls } = fakeDeps([new Response('', { status: 429 })])
    const polite = createPoliteFetch(deps)
    await expect(polite('adsb', 'https://x', 5_000)).rejects.toThrow()
    await polite('adsb', 'https://x', 5_000)
    expect(calls[1] - calls[0]).toBeGreaterThanOrEqual(60_000)
  })
})
