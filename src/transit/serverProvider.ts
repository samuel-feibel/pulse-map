import type { LngLat } from '../geo'
import { politeFetch } from '../net/politeFetch'
import { buildTrack, type TrackShape } from '../trains/trackGeometry'
import { scheduledVehicles, type Timetable } from './schedule'
import { serviceClock } from './serviceClock'
import type { Line, Station, TransitProvider, Vehicle } from './types'

/** The dev server rate-limits 511 itself (one fetch per 75 s, shared by all tabs); polling faster gains nothing. */
const LIVE_POLL_MS = 75_000
/** Timetable trains are placed locally, so they can update often at no cost. */
const TIMETABLE_POLL_MS = 5_000
const SECONDS_PER_DAY = 86_400
/**
 * These requests only reach Pulse Map's own dev server, which does the real rate limiting upstream,
 * so the browser-side spacing just stops accidental bursts.
 */
const LOCAL_MIN_INTERVAL_MS = 1_000

type Source = { readonly kind: 'live' } | { readonly kind: 'timetable'; readonly timeZone: string } | { readonly kind: 'none' }

interface Options {
  /** Agency id on the dev server (see server/transitPlugin.ts), e.g. 'SF', 'BA' or 'CT'. */
  readonly agency: string
  /** Route ids to show (without the agency prefix), e.g. ['N', 'J']; all rail routes when omitted. */
  readonly routes?: readonly string[]
  /** Where train positions come from: live data, the published timetable, or nowhere (lines only). */
  readonly trains: Source
}

interface RailNetwork {
  readonly lines: Line[]
  readonly stations: { readonly id: string; readonly position: LngLat }[]
}

const isRailNetwork = (body: unknown): body is RailNetwork =>
  typeof body === 'object' && body !== null && Array.isArray((body as RailNetwork).lines) && Array.isArray((body as RailNetwork).stations)

const isTimetable = (body: unknown): body is Timetable =>
  typeof body === 'object' && body !== null && Array.isArray((body as Timetable).trips) && typeof (body as Timetable).stops === 'object'

async function getJson(service: string, url: string): Promise<unknown> {
  const response = await politeFetch(service, url, LOCAL_MIN_INTERVAL_MS)
  return response.json()
}

/** Transit served by Pulse Map's own dev server (Bay Area agencies via 511.org and their schedule feeds). */
export function createServerTransit({ agency, routes, trains }: Options): TransitProvider {
  const wanted = routes ? new Set(routes.map((r) => `${agency}:${r}`)) : null
  const keep = (routeId: string): boolean => !wanted || wanted.has(routeId)

  let network: Promise<RailNetwork> | null = null
  const loadNetwork = (): Promise<RailNetwork> => {
    network ??= getJson(`pulse-server:${agency}`, `/api/transit/rail/${agency}`).then((body) => {
      if (!isRailNetwork(body)) throw new Error(`Unexpected rail data for ${agency}`)
      return body
    })
    return network
  }

  const liveVehicles = async (): Promise<Vehicle[]> => {
    const body = await getJson(`pulse-server-live:${agency}`, `/api/transit/vehicles/${agency}`)
    return Array.isArray(body) ? (body as Vehicle[]).filter((v) => keep(v.routeId)) : []
  }

  const timetables = new Map<string, Promise<Timetable>>()
  let shapes: Promise<Map<string, TrackShape>> | null = null
  const loadDay = (date: string): Promise<Timetable> => {
    const existing = timetables.get(date)
    if (existing) return existing
    const loading = getJson(`pulse-server-timetable:${agency}`, `/api/transit/timetable/${agency}?date=${date}`).then((body) => {
      if (!isTimetable(body)) throw new Error(`Unexpected timetable for ${agency}`)
      return body
    })
    timetables.set(date, loading)
    return loading
  }

  const timetableVehicles = async (timeZone: string): Promise<Vehicle[]> => {
    const clock = serviceClock(new Date(), timeZone)
    // Forget days that are no longer today or yesterday.
    ;[...timetables.keys()].filter((d) => d !== clock.today && d !== clock.yesterday).forEach((d) => timetables.delete(d))
    shapes ??= loadNetwork().then((n) => new Map(n.lines.map((l) => [l.routeId, buildTrack(l.coordinates)])))
    const [lineShapes, today, yesterday] = await Promise.all([shapes, loadDay(clock.today), loadDay(clock.yesterday)])
    // Yesterday's late trains (times past 24:00) can still be running after midnight.
    const lateNight = scheduledVehicles(yesterday, lineShapes, clock.seconds + SECONDS_PER_DAY).map((v) => ({
      ...v,
      id: `${v.id}@${clock.yesterday}`,
    }))
    return [...scheduledVehicles(today, lineShapes, clock.seconds), ...lateNight].filter((v) => keep(v.routeId))
  }

  return {
    loadLines: async () => (await loadNetwork()).lines.filter((line) => keep(line.routeId)),
    loadStations: async (): Promise<Station[]> => (await loadNetwork()).stations,
    fetchVehicles:
      trains.kind === 'live'
        ? liveVehicles
        : trains.kind === 'timetable'
          ? () => timetableVehicles(trains.timeZone)
          : undefined,
    pollIntervalMs: trains.kind === 'live' ? LIVE_POLL_MS : trains.kind === 'timetable' ? TIMETABLE_POLL_MS : undefined,
  }
}
