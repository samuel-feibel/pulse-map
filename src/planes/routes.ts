import { politeFetch } from '../net/politeFetch'
import type { RunwayEventKind } from './types'

/** adsbdb: free, keyless flight-route lookup by callsign. Routes can be out of date. */
const API_BASE = 'https://api.adsbdb.com/v0/callsign'
/** adsbdb publishes no limit; lookups only happen on takeoffs and landings, and never faster than this. */
const MIN_INTERVAL_MS = 5_000

export interface Route {
  readonly origin: string
  readonly destination: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const iata = (airport: unknown): string | null =>
  isRecord(airport) && typeof airport.iata_code === 'string' ? airport.iata_code : null

export function parseRoute(body: unknown): Route | null {
  const response = isRecord(body) ? body.response : undefined
  const route = isRecord(response) ? response.flightroute : undefined
  if (!isRecord(route)) {
    return null
  }
  const origin = iata(route.origin)
  const destination = iata(route.destination)
  return origin && destination ? { origin, destination } : null
}

/** '→ ORD' for a departure, '← ATL' for an arrival; null if the route doesn't fit this movement at `home`. */
export function routeLabel(route: Route, kind: RunwayEventKind, home: string): string | null {
  if (kind === 'takeoff' && route.origin === home) {
    return `→ ${route.destination}`
  }
  if (kind === 'landing' && route.destination === home) {
    return `← ${route.origin}`
  }
  return null
}

/** Looks up a route once per callsign; failures are remembered as "unknown" so they aren't retried. */
export function createRouteLookup(): (callsign: string) => Promise<Route | null> {
  const cache = new Map<string, Promise<Route | null>>()
  return (callsign) => {
    const cached = cache.get(callsign)
    if (cached) {
      return cached
    }
    const lookup = politeFetch('adsbdb', `${API_BASE}/${encodeURIComponent(callsign)}`, MIN_INTERVAL_MS)
      .then((response) => response.json())
      .then((body: unknown) => parseRoute(body))
      .catch((error: unknown) => {
        console.error(`Route lookup for ${callsign} failed.`, error)
        return null
      })
    cache.set(callsign, lookup)
    return lookup
  }
}
