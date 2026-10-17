import type { Timetable } from '../src/transit/schedule'
import type { Line, Station } from '../src/transit/types'

/** The GTFS text files this needs, as raw CSV. */
export interface GtfsFiles {
  readonly routes: string
  readonly trips: string
  readonly shapes: string
  readonly stops: string
  readonly stopTimes: string
  /** Needed only for timetables. */
  readonly calendar?: string
  readonly calendarDates?: string
}

export interface RailOptions {
  /** Prepended to ids ("SF:N") so lines and stations from different agencies never collide. */
  readonly prefix: string
  /** GTFS route_type values to keep: '0' light rail/streetcar, '1' subway, '2' rail, '5' cable car. */
  readonly routeTypes: readonly string[]
  /** Route types whose stops are shown as stations (e.g. skip cable cars, which stop every block). */
  readonly stationRouteTypes: readonly string[]
  /** Use the feed's parent stations (location_type 1) instead, as BART publishes them. */
  readonly useParentStations?: boolean
  /** Keep only stops whose name matches this pattern (e.g. 'Station' skips street-corner stops). */
  readonly stationNamePattern?: string
}

export interface RailNetwork {
  readonly lines: Line[]
  readonly stations: Station[]
}

type Row = Readonly<Record<string, string>>

/** Splits one CSV line, honoring double-quoted fields (which may contain commas and "" escapes). */
function splitLine(line: string): string[] {
  if (!line.includes('"')) {
    return line.split(',')
  }
  const fields: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (quoted && c === '"' && line[i + 1] === '"') {
      field += '"'
      i++
    } else if (c === '"') {
      quoted = !quoted
    } else if (c === ',' && !quoted) {
      fields.push(field)
      field = ''
    } else {
      field += c
    }
  }
  return [...fields, field]
}

const lines = (text: string): string[] => text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.length > 0)

function toRow(header: readonly string[], line: string): Row {
  const values = splitLine(line)
  return Object.fromEntries(header.map((name, i) => [name, values[i] ?? '']))
}

export function parseCsv(text: string): Row[] {
  const [head, ...body] = lines(text)
  if (!head) return []
  const header = splitLine(head)
  return body.map((line) => toRow(header, line))
}

/**
 * Only the rows whose `column` is in `keep`. Used for stop_times.txt, which can be ~75 MB:
 * it checks the column cheaply before building a row.
 */
function rowsWhere(text: string, column: string, keep: ReadonlySet<string>): Row[] {
  const [head, ...body] = lines(text)
  if (!head) return []
  const header = splitLine(head)
  const index = header.indexOf(column)
  return body.filter((line) => keep.has(splitLine(line)[index] ?? '')).map((line) => toRow(header, line))
}

const round6 = (value: string): number => Number(Number(value).toFixed(6))

function mostCommon(values: readonly string[]): string | undefined {
  const counts = values.reduce((acc, v) => acc.set(v, (acc.get(v) ?? 0) + 1), new Map<string, number>())
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
}

interface Representative {
  readonly route: Row
  readonly shapeId: string
  readonly tripId: string
}

/** For each route: the most common direction-0 shape, and one trip that uses it. */
function representatives(routes: readonly Row[], trips: readonly Row[]): Representative[] {
  return routes.flatMap((route) => {
    const outbound = trips.filter((t) => t.route_id === route.route_id && t.direction_id === '0' && t.shape_id)
    const shapeId = mostCommon(outbound.map((t) => t.shape_id))
    const trip = outbound.find((t) => t.shape_id === shapeId)
    return shapeId && trip ? [{ route, shapeId, tripId: trip.trip_id }] : []
  })
}

function shapeCoordinates(shapes: readonly Row[], shapeId: string): [number, number][] {
  return shapes
    .filter((p) => p.shape_id === shapeId)
    .sort((a, b) => Number(a.shape_pt_sequence) - Number(b.shape_pt_sequence))
    .map((p) => [round6(p.shape_pt_lon), round6(p.shape_pt_lat)])
}

const toStation = (prefix: string, stop: Row): Station => ({
  id: `${prefix}:${stop.stop_id}`,
  position: { lng: round6(stop.stop_lon), lat: round6(stop.stop_lat) },
})

/** Reduces a whole GTFS feed to just its rail lines (one shape per route) and stations. */
export function buildRailNetwork(files: GtfsFiles, options: RailOptions): RailNetwork {
  const routes = parseCsv(files.routes).filter((r) => options.routeTypes.includes(r.route_type))
  const reps = representatives(routes, parseCsv(files.trips))
  const shapeIds = new Set(reps.map((r) => r.shapeId))
  const shapes = parseCsv(files.shapes).filter((p) => shapeIds.has(p.shape_id))
  const lineList: Line[] = reps.map(({ route, shapeId }) => ({
    routeId: `${options.prefix}:${route.route_id}`,
    color: `#${(route.route_color || 'FFFFFF').toUpperCase()}`,
    coordinates: shapeCoordinates(shapes, shapeId),
  }))

  const stops = parseCsv(files.stops)
  if (options.useParentStations) {
    return { lines: lineList, stations: stops.filter((s) => s.location_type === '1').map((s) => toStation(options.prefix, s)) }
  }
  const stationTrips = new Set(
    reps.filter((r) => options.stationRouteTypes.includes(r.route.route_type)).map((r) => r.tripId),
  )
  const stopIds = new Set(rowsWhere(files.stopTimes, 'trip_id', stationTrips).map((st) => st.stop_id))
  const named = options.stationNamePattern ? new RegExp(options.stationNamePattern) : null
  const stations = stops
    .filter((s) => stopIds.has(s.stop_id) && (!named || named.test(s.stop_name)))
    .map((s) => toStation(options.prefix, s))
  return { lines: lineList, stations }
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

/** Service ids running on `date` (YYYYMMDD): regular weekly service plus/minus calendar_dates exceptions. */
export function activeServiceIds(calendar: string, calendarDates: string, date: string): Set<string> {
  const weekday = WEEKDAYS[new Date(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T12:00:00Z`).getUTCDay()]
  const regular = parseCsv(calendar)
    .filter((c) => c[weekday] === '1' && c.start_date <= date && date <= c.end_date)
    .map((c) => c.service_id)
  const exceptions = parseCsv(calendarDates).filter((d) => d.date === date)
  const removed = new Set(exceptions.filter((d) => d.exception_type === '2').map((d) => d.service_id))
  const added = exceptions.filter((d) => d.exception_type === '1').map((d) => d.service_id)
  return new Set([...regular.filter((id) => !removed.has(id)), ...added])
}

/** "25:05:00" → seconds after the service day's midnight (GTFS times can run past 24:00). */
const toSeconds = (time: string): number => {
  const [h, m, sec] = time.split(':').map(Number)
  return h * 3600 + m * 60 + (sec || 0)
}

/** Every rail trip running on `date`, with its stop times, for animating trains by timetable. */
export function buildTimetable(files: GtfsFiles, options: RailOptions, date: string): Timetable {
  const routes = parseCsv(files.routes).filter((r) => options.routeTypes.includes(r.route_type))
  const allTrips = parseCsv(files.trips)
  // Trips are drawn on the line of the same color (one drawn line per color, e.g. BART's Yellow-N and Yellow-S).
  const lineByColor = new Map(
    representatives(routes, allTrips).map((rep) => [rep.route.route_color, `${options.prefix}:${rep.route.route_id}`]),
  )
  const colorByRoute = new Map(routes.map((r) => [r.route_id, r.route_color]))
  const active = activeServiceIds(files.calendar ?? '', files.calendarDates ?? '', date)
  const trips = allTrips.filter((t) => colorByRoute.has(t.route_id) && active.has(t.service_id))

  const stopRows = new Map(parseCsv(files.stops).map((s) => [s.stop_id, s]))
  const stationOf = (stopId: string): Row | undefined => {
    const stop = stopRows.get(stopId)
    return stop?.parent_station ? (stopRows.get(stop.parent_station) ?? stop) : stop
  }

  const timesByTrip = new Map<string, Row[]>()
  rowsWhere(files.stopTimes, 'trip_id', new Set(trips.map((t) => t.trip_id))).forEach((row) => {
    timesByTrip.set(row.trip_id, [...(timesByTrip.get(row.trip_id) ?? []), row])
  })

  const stops: Record<string, [number, number]> = {}
  const timetableTrips = trips.flatMap((trip) => {
    const lineId = lineByColor.get(colorByRoute.get(trip.route_id) ?? '')
    const rows = (timesByTrip.get(trip.trip_id) ?? []).sort((a, b) => Number(a.stop_sequence) - Number(b.stop_sequence))
    if (!lineId || rows.length < 2) return []
    const tripStops = rows.flatMap((row): [string, number, number][] => {
      const station = stationOf(row.stop_id)
      if (!station) return []
      const id = `${options.prefix}:${station.stop_id}`
      stops[id] = [round6(station.stop_lon), round6(station.stop_lat)]
      return [[id, toSeconds(row.arrival_time), toSeconds(row.departure_time)]]
    })
    return [{ id: `${options.prefix}:${trip.trip_id}`, lineId, stops: tripStops }]
  })
  return { stops, trips: timetableTrips }
}
