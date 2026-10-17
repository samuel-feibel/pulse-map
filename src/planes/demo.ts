import type { LngLat } from '../geo'
import { moveAlong, bearingDegrees } from './motion'
import type { Route } from './routes'
import type { Airport } from './airport'
import type { RunwayEnd } from './runways'
import type { Aircraft } from './types'

const SECOND = 1000
const KNOT = 0.514444

interface Flight {
  readonly callsign: string
  readonly type: string
}

interface Movement extends Flight {
  readonly otherAirport: string
}

const ARRIVALS: readonly Movement[] = [
  { callsign: 'DAL1847', type: 'A321', otherAirport: 'ATL' },
  { callsign: 'JBU532', type: 'A20N', otherAirport: 'FLL' },
  { callsign: 'UAL2210', type: 'B39M', otherAirport: 'ORD' },
]
const DEPARTURES: readonly Movement[] = [
  { callsign: 'AAL1622', type: 'B738', otherAirport: 'CLT' },
  { callsign: 'JBU1015', type: 'BCS3', otherAirport: 'MCO' },
  { callsign: 'BAW238', type: 'B772', otherAirport: 'LHR' },
]

interface Overflight extends Flight {
  /** Where it starts, relative to the airport: compass bearing and distance. */
  readonly fromBearing: number
  readonly fromMeters: number
  readonly heading: number
  readonly speedKt: number
  readonly altitudeFt: number
}

/** Planes passing over at altitude, laid out around whichever airport the city has. */
const OVERFLIGHTS: readonly Overflight[] = [
  { callsign: 'SWA88', type: 'B38M', fromBearing: 285, fromMeters: 16_000, heading: 100, speedKt: 300, altitudeFt: 9000 },
  { callsign: 'CPZ5410', type: 'E75L', fromBearing: 354, fromMeters: 15_000, heading: 195, speedKt: 250, altitudeFt: 4000 },
  { callsign: 'ACA751', type: 'A223', fromBearing: 120, fromMeters: 7_500, heading: 285, speedKt: 280, altitudeFt: 12000 },
]

const OVERFLIGHT_CYCLE_MS = 90 * SECOND
const MOVEMENT_CYCLE_MS = 40 * SECOND
/** Departures run half a cycle after arrivals so something is always happening. */
const DEPARTURE_OFFSET_MS = 20 * SECOND
const FINAL_APPROACH_METERS = 2500
const APPROACH_SPEED_KT = 140
const CLIMB_SPEED_KT = 160
const CLIMB_FPM = 1800

const base = (id: string, flight: Flight, position: LngLat): Omit<Aircraft, 'altitudeFt' | 'verticalRateFpm' | 'groundSpeedKt' | 'trackDeg' | 'isOnGround'> => ({
  id,
  callsign: flight.callsign,
  type: flight.type,
  position,
  positionAgeSec: 0,
})

function overflight(flight: Overflight, index: number, airport: LngLat, elapsedMs: number): Aircraft {
  const cycle = Math.floor(elapsedMs / OVERFLIGHT_CYCLE_MS)
  const seconds = (elapsedMs % OVERFLIGHT_CYCLE_MS) / SECOND
  const start = moveAlong(airport, flight.fromBearing, flight.fromMeters)
  const position = moveAlong(start, flight.heading, flight.speedKt * KNOT * seconds)
  return {
    ...base(`demo-over-${index}-${cycle}`, flight, position),
    isOnGround: false,
    altitudeFt: flight.altitudeFt,
    groundSpeedKt: flight.speedKt,
    trackDeg: flight.heading,
    verticalRateFpm: 0,
  }
}

interface RunwayPath {
  /** Where the movement starts on the runway (threshold for arrivals, start of roll for departures). */
  readonly from: LngLat
  /** The opposite end: where an arrival rolls toward, or where a departure lifts off. */
  readonly to: LngLat
  readonly heading: number
}

/** The runway named `name` (e.g. '04R'), oriented from that end toward the opposite one. */
function runwayPath(airport: Airport, name: string): RunwayPath {
  const runway = airport.runways.find((r) => r.ends.some((e) => e.name === name))
  if (!runway) {
    throw new Error(`Demo runway ${name} isn't one of ${airport.code}'s runways`)
  }
  const [a, b] = runway.ends
  const [from, to]: readonly [RunwayEnd, RunwayEnd] = a.name === name ? [a, b] : [b, a]
  return { from: from.position, to: to.position, heading: bearingDegrees(from.position, to.position) }
}

/** On short final, already low and descending, then on the ground at the threshold. */
function arrival(path: RunwayPath, elapsedMs: number): Aircraft {
  const cycle = Math.floor(elapsedMs / MOVEMENT_CYCLE_MS)
  const flight = ARRIVALS[cycle % ARRIVALS.length]
  const flown = APPROACH_SPEED_KT * KNOT * ((elapsedMs % MOVEMENT_CYCLE_MS) / SECOND)
  const remaining = Math.max(FINAL_APPROACH_METERS - flown, 0)
  const isOnGround = remaining === 0
  return {
    ...base(`demo-arr-${cycle}`, flight, moveAlong(path.from, path.heading + 180, remaining)),
    isOnGround,
    altitudeFt: isOnGround ? 0 : Math.round((remaining / FINAL_APPROACH_METERS) * 800) + 50,
    groundSpeedKt: isOnGround ? 0 : APPROACH_SPEED_KT,
    trackDeg: path.heading,
    verticalRateFpm: isOnGround ? null : -700,
  }
}

/** Just airborne off the far end of the departure runway, climbing out. */
function departure(path: RunwayPath, elapsedMs: number): Aircraft {
  const shifted = elapsedMs + MOVEMENT_CYCLE_MS - DEPARTURE_OFFSET_MS
  const cycle = Math.floor(shifted / MOVEMENT_CYCLE_MS)
  const flight = DEPARTURES[cycle % DEPARTURES.length]
  const seconds = (shifted % MOVEMENT_CYCLE_MS) / SECOND
  return {
    ...base(`demo-dep-${cycle}`, flight, moveAlong(path.to, path.heading, CLIMB_SPEED_KT * KNOT * seconds)),
    isOnGround: false,
    altitudeFt: Math.round(200 + (CLIMB_FPM / 60) * seconds),
    groundSpeedKt: CLIMB_SPEED_KT,
    trackDeg: path.heading,
    verticalRateFpm: CLIMB_FPM,
  }
}

export interface DemoTraffic {
  readonly aircraft: (elapsedMs: number) => Aircraft[]
  /** Fake routes for the scripted flights, standing in for the route lookup. */
  readonly routes: ReadonlyMap<string, Route>
}

/** Scripted traffic for trying out the visuals: overflights plus an arrival and a departure every 40s. */
export function createDemoTraffic(airport: Airport): DemoTraffic {
  const arrivalPath = runwayPath(airport, airport.demo.arrivalRunway)
  const departurePath = runwayPath(airport, airport.demo.departureRunway)
  return {
    aircraft: (elapsedMs) => [
      ...OVERFLIGHTS.map((f, i) => overflight(f, i, airport.reference, elapsedMs)),
      arrival(arrivalPath, elapsedMs),
      departure(departurePath, elapsedMs),
    ],
    routes: new Map([
      ...ARRIVALS.map((m): [string, Route] => [m.callsign, { origin: m.otherAirport, destination: airport.code }]),
      ...DEPARTURES.map((m): [string, Route] => [m.callsign, { origin: airport.code, destination: m.otherAirport }]),
    ]),
  }
}
