import type { LngLat } from '../geo'
import { politeFetch } from '../net/politeFetch'
import type { Aircraft } from './types'

/**
 * adsb.fi open data: free, keyless, community ADS-B data (limit: 1 request per second). It doesn't allow
 * browser requests from other sites, so the Vite dev server proxies it at /adsb (see vite.config.ts).
 */
const PROXY_BASE = '/adsb'
/** Nautical miles around the center to fetch, a bit beyond the wall so planes fly in from off-screen. */
const RADIUS_NM = 12
/** adsb.fi allows 1 request/second; we never go faster than one every 5 seconds. */
const MIN_INTERVAL_MS = 5_000

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const finite = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null)

/** Transponders with no callsign set send blanks or zeros. */
function callsign(value: unknown): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : ''
  return trimmed && !/^0+$/.test(trimmed) ? trimmed : null
}

function toAircraft(raw: Record<string, unknown>): Aircraft | null {
  const lat = finite(raw.lat)
  const lng = finite(raw.lon)
  if (typeof raw.hex !== 'string' || lat === null || lng === null) {
    return null
  }
  const isOnGround = raw.alt_baro === 'ground'
  return {
    id: raw.hex,
    callsign: callsign(raw.flight),
    type: typeof raw.t === 'string' ? raw.t : null,
    position: { lng, lat },
    isOnGround,
    altitudeFt: isOnGround ? 0 : (finite(raw.alt_baro) ?? 0),
    groundSpeedKt: finite(raw.gs) ?? 0,
    trackDeg: finite(raw.track),
    verticalRateFpm: finite(raw.baro_rate),
    positionAgeSec: finite(raw.seen_pos) ?? 0,
  }
}

/** Accepts both readsb-style list names: 'aircraft' (adsb.fi) and 'ac' (adsb.lol, airplanes.live). */
export function parseAircraft(body: unknown): Aircraft[] {
  const list = isRecord(body) ? (body.aircraft ?? body.ac) : undefined
  if (!Array.isArray(list)) {
    throw new Error('Unexpected ADS-B response: missing aircraft list')
  }
  return list.filter(isRecord).flatMap((raw) => toAircraft(raw) ?? [])
}

export async function fetchAircraft(center: LngLat): Promise<Aircraft[]> {
  const url = `${PROXY_BASE}/api/v2/lat/${center.lat}/lon/${center.lng}/dist/${RADIUS_NM}`
  const response = await politeFetch('adsb.fi', url, MIN_INTERVAL_MS)
  return parseAircraft(await response.json())
}
