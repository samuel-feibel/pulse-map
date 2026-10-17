import type { TransitProvider } from './types'

/** Settled results, logging (and dropping) any agency that failed so the others still show. */
async function gather<T>(loads: readonly Promise<T[]>[], what: string): Promise<T[]> {
  const results = await Promise.allSettled(loads)
  return results.flatMap((result) => {
    if (result.status === 'fulfilled') return result.value
    console.error(`One transit agency's ${what} failed to load; showing the rest.`, result.reason)
    return []
  })
}

/** Several agencies (e.g. Muni + BART) as one city's transit. */
export function combineTransit(providers: readonly TransitProvider[]): TransitProvider {
  const live = providers.filter((p) => p.fetchVehicles)
  const intervals = live.flatMap((p) => (p.pollIntervalMs ? [p.pollIntervalMs] : []))
  return {
    loadLines: () => gather(providers.map((p) => p.loadLines()), 'lines'),
    loadStations: () => gather(providers.map((p) => p.loadStations()), 'stations'),
    fetchVehicles:
      live.length > 0 ? () => gather(live.map((p) => p.fetchVehicles?.() ?? Promise.resolve([])), 'vehicles') : undefined,
    pollIntervalMs: intervals.length > 0 ? Math.max(...intervals) : undefined,
    parts: providers,
  }
}
