import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { join } from 'node:path'
import { strFromU8, unzipSync } from 'fflate'
import type { Plugin } from 'vite'
import { buildRailNetwork, buildTimetable, type GtfsFiles, type RailNetwork, type RailOptions } from './gtfs'
import { parseVehicleMonitoring } from './siri'

/**
 * Dev-server endpoints for transit data that needs a key or heavy processing:
 *   GET /api/transit/rail/:agency      rail lines + stations, reduced from the agency's GTFS feed
 *   GET /api/transit/vehicles/:agency  live vehicle positions (511.org)
 *   GET /api/transit/timetable/:agency?date=YYYYMMDD
 *                                      that day's scheduled trips, for agencies with no live positions
 *
 * The 511 key stays here on the server. 511 allows 60 requests/hour per key, so live positions are
 * fetched at most every 75 s (≈ 48/hour), shared by every open tab, and the server stops calling 511
 * when its reported remaining budget runs low.
 */

const API_511 = 'https://api.511.org/transit'
const VEHICLE_REFRESH_MS = 75_000
const RAIL_TTL_MS = 7 * 24 * 60 * 60_000
/** Bump when the rail extraction changes, so extracts are rebuilt from the (still cached) downloads. */
const RAIL_FORMAT = 3
/** Keep this many 511 requests in hand for the weekly schedule download. */
const BUDGET_RESERVE = 5
const RATE_LIMITED_PAUSE_MS = 15 * 60_000
const GTFS_FILES = ['routes.txt', 'trips.txt', 'shapes.txt', 'stops.txt', 'stop_times.txt', 'calendar.txt', 'calendar_dates.txt']
/** Day timetables kept in memory (today and yesterday per agency is plenty). */
const TIMETABLE_CACHE_SIZE = 8

interface Agency {
  readonly feedUrl: (key: string) => string
  readonly feedNeedsKey: boolean
  readonly rail: RailOptions
  /** 511 operator id for live vehicles; omitted when the agency publishes none (BART, Caltrain). */
  readonly liveVehicles?: string
  /** Serve daily timetables so trains can be animated by schedule instead. */
  readonly timetable?: boolean
}

const AGENCIES: Readonly<Record<string, Agency>> = {
  // Muni: light rail and the F line (route type 0) plus cable cars (5). Every stop is shown; the named
  // Metro stations (subway, Central Subway, Glen Park) are major, street-corner stops minor.
  SF: {
    feedUrl: (key) => `${API_511}/datafeeds?api_key=${key}&operator_id=SF`,
    feedNeedsKey: true,
    rail: { prefix: 'SF', routeTypes: ['0', '5'], stationRouteTypes: ['0', '5'], majorStationPattern: 'Station' },
    liveVehicles: 'SF',
  },
  // BART publishes its own GTFS feed (no key needed) but no live train positions.
  BA: {
    feedUrl: () => 'https://www.bart.gov/dev/schedules/google_transit.zip',
    feedNeedsKey: false,
    rail: { prefix: 'BA', routeTypes: ['1'], stationRouteTypes: [], useParentStations: true },
    timetable: true,
  },
  // Caltrain: commuter rail (route type 2) from 4th & King down the Peninsula. Schedule via 511 (weekly);
  // live positions would cost another ~48 requests/hour, so trains run by timetable.
  CT: {
    feedUrl: (key) => `${API_511}/datafeeds?api_key=${key}&operator_id=CT`,
    feedNeedsKey: true,
    rail: { prefix: 'CT', routeTypes: ['2'], stationRouteTypes: [], useParentStations: true },
    timetable: true,
  },
}

interface Budget {
  remaining: number | null
  pausedUntil: number
}

function createTransitService(key: string | undefined, cacheDir: string, log: (message: string) => void) {
  const budget: Budget = { remaining: null, pausedUntil: 0 }
  const vehicleCache = new Map<string, { readonly at: number; readonly body: string }>()
  const railCache = new Map<string, { readonly savedAt: number; readonly body: string }>()
  const timetableCache = new Map<string, string>()

  const canCall511 = (): boolean =>
    Date.now() >= budget.pausedUntil && (budget.remaining === null || budget.remaining > BUDGET_RESERVE)

  async function fetch511(url: string): Promise<Response> {
    if (!canCall511()) {
      throw new Error(`511 budget low (${budget.remaining} left); waiting before calling again`)
    }
    const response = await fetch(url)
    const remaining = Number(response.headers.get('RateLimit-Remaining'))
    budget.remaining = Number.isFinite(remaining) ? remaining : budget.remaining
    if (response.status === 429) {
      budget.pausedUntil = Date.now() + RATE_LIMITED_PAUSE_MS
    }
    if (!response.ok) {
      throw new Error(`511 request failed: ${response.status} ${response.statusText}`)
    }
    return response
  }

  async function vehicles(agencyId: string): Promise<string> {
    const agency = AGENCIES[agencyId]
    if (!agency?.liveVehicles) {
      return '[]'
    }
    const cached = vehicleCache.get(agencyId)
    if (cached && Date.now() - cached.at < VEHICLE_REFRESH_MS) {
      return cached.body
    }
    if (!key) {
      throw new Error('TRANSIT_511_API_KEY is not set in .env.local')
    }
    try {
      const response = await fetch511(`${API_511}/VehicleMonitoring?api_key=${key}&agency=${agency.liveVehicles}&format=json`)
      const json: unknown = JSON.parse((await response.text()).replace(/^﻿/, ''))
      const body = JSON.stringify(parseVehicleMonitoring(json, agency.rail.prefix))
      vehicleCache.set(agencyId, { at: Date.now(), body })
      return body
    } catch (error) {
      if (cached) {
        log(`Live vehicles for ${agencyId}: ${String(error)}; serving the last positions.`)
        return cached.body
      }
      throw error
    }
  }

  /** The agency's GTFS zip, downloaded at most once a week and kept on disk. */
  async function feedZip(agencyId: string, agency: Agency): Promise<Uint8Array> {
    const file = join(cacheDir, `gtfs-${agencyId}.zip`)
    const age = await stat(file).then((s) => Date.now() - s.mtimeMs).catch(() => Infinity)
    if (age < RAIL_TTL_MS) {
      return new Uint8Array(await readFile(file))
    }
    if (agency.feedNeedsKey && !key) {
      throw new Error('TRANSIT_511_API_KEY is not set in .env.local')
    }
    log(`Downloading ${agencyId} schedule data (weekly)…`)
    const url = agency.feedUrl(key ?? '')
    const response = agency.feedNeedsKey ? await fetch511(url) : await fetch(url)
    if (!response.ok) {
      throw new Error(`${agencyId} schedule download failed: ${response.status}`)
    }
    const bytes = new Uint8Array(await response.arrayBuffer())
    await mkdir(cacheDir, { recursive: true })
    await writeFile(file, bytes)
    return bytes
  }

  async function feedFiles(agencyId: string, agency: Agency): Promise<GtfsFiles> {
    const zip = unzipSync(await feedZip(agencyId, agency), { filter: (f) => GTFS_FILES.includes(f.name) })
    const text = (name: string): string => {
      const file = zip[name]
      if (!file) throw new Error(`${agencyId} schedule feed is missing ${name}`)
      return strFromU8(file)
    }
    // Some feeds list service only by date (calendar_dates.txt), so calendar.txt is optional.
    const optional = (name: string): string => (zip[name] ? strFromU8(zip[name]) : '')
    return {
      routes: text('routes.txt'),
      trips: text('trips.txt'),
      shapes: text('shapes.txt'),
      stops: text('stops.txt'),
      stopTimes: text('stop_times.txt'),
      calendar: optional('calendar.txt'),
      calendarDates: optional('calendar_dates.txt'),
    }
  }

  async function extractRail(agencyId: string, agency: Agency): Promise<RailNetwork> {
    return buildRailNetwork(await feedFiles(agencyId, agency), agency.rail)
  }

  async function timetable(agencyId: string, date: string | null): Promise<string> {
    const agency = AGENCIES[agencyId]
    if (!agency?.timetable) {
      throw new Error(`No timetable for ${agencyId}`)
    }
    if (!date || !/^\d{8}$/.test(date)) {
      throw new Error('Timetable needs ?date=YYYYMMDD')
    }
    const cacheKey = `${agencyId}:${date}`
    const cached = timetableCache.get(cacheKey)
    if (cached) {
      return cached
    }
    const body = JSON.stringify(buildTimetable(await feedFiles(agencyId, agency), agency.rail, date))
    if (timetableCache.size >= TIMETABLE_CACHE_SIZE) {
      timetableCache.delete(timetableCache.keys().next().value ?? '')
    }
    timetableCache.set(cacheKey, body)
    return body
  }

  async function rail(agencyId: string): Promise<string> {
    const agency = AGENCIES[agencyId]
    if (!agency) {
      throw new Error(`Unknown transit agency ${agencyId}`)
    }
    const file = join(cacheDir, `rail-${agencyId}-v${RAIL_FORMAT}.json`)
    const memory = railCache.get(agencyId)
    const disk = memory ?? (await readFile(file, 'utf8').then((t) => JSON.parse(t) as { savedAt: number; body: string }).catch(() => undefined))
    if (disk && Date.now() - disk.savedAt < RAIL_TTL_MS) {
      railCache.set(agencyId, disk)
      return disk.body
    }
    try {
      const entry = { savedAt: Date.now(), body: JSON.stringify(await extractRail(agencyId, agency)) }
      railCache.set(agencyId, entry)
      await mkdir(cacheDir, { recursive: true })
      await writeFile(file, JSON.stringify(entry))
      return entry.body
    } catch (error) {
      if (disk) {
        log(`${agencyId} schedule refresh failed (${String(error)}); using the cached copy.`)
        return disk.body
      }
      throw error
    }
  }

  return { vehicles, rail, timetable }
}

function send(res: ServerResponse, status: number, body: string): void {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(body)
}

export function transitPlugin(options: { readonly key?: string; readonly cacheDir: string }): Plugin {
  return {
    name: 'pulse-map-transit',
    configureServer(server) {
      const log = (message: string): void => server.config.logger.info(`[transit] ${message}`)
      const service = createTransitService(options.key, options.cacheDir, log)
      server.middlewares.use('/api/transit', (req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const [, kind, agencyId] = url.pathname.split('/')
        const handlers: Readonly<Record<string, (agency: string) => Promise<string>>> = {
          rail: service.rail,
          vehicles: service.vehicles,
          timetable: (agency) => service.timetable(agency, url.searchParams.get('date')),
        }
        const handler = kind ? handlers[kind] : undefined
        if (!handler || !agencyId) {
          send(res, 404, JSON.stringify({ error: 'Unknown transit endpoint' }))
          return
        }
        handler(agencyId)
          .then((body) => send(res, 200, body))
          .catch((error: unknown) => {
            log(`${kind}/${agencyId} failed: ${String(error)}`)
            send(res, 503, JSON.stringify({ error: String(error) }))
          })
      })
    },
  }
}
