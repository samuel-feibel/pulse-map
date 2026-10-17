import type { LngLat } from '../geo'
import { moveAlong, bearingDegrees } from './motion'
import type { Route } from './routes'
import { LOGAN_RUNWAYS } from './runways'
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

/** Fake routes for the scripted flights, standing in for the route lookup. */
export const DEMO_ROUTES: ReadonlyMap<string, Route> = new Map([
  ...ARRIVALS.map((m): [string, Route] => [m.callsign, { origin: m.otherAirport, destination: 'BOS' }]),
  ...DEPARTURES.map((m): [string, Route] => [m.callsign, { origin: 'BOS', destination: m.otherAirport }]),
])

interface Overflight extends Flight {
  readonly start: LngLat
  readonly heading: number
  readonly speedKt: number
  readonly altitudeFt: number
}

const OVERFLIGHTS: readonly Overflight[] = [
  { callsign: 'SWA88', type: 'B38M', start: { lng: -71.2, lat: 42.4 }, heading: 100, speedKt: 300, altitudeFt: 9000 },
  { callsign: 'CPZ5410', type: 'E75L', start: { lng: -71.03, lat: 42.5 }, heading: 195, speedKt: 250, altitudeFt: 4000 },
  { callsign: 'ACA751', type: 'A223', start: { lng: -70.93, lat: 42.33 }, heading: 285, speedKt: 280, altitudeFt: 12000 },
]

const OVERFLIGHT_CYCLE_MS = 90 * SECOND
const MOVEMENT_CYCLE_MS = 40 * SECOND
/** Departures run half a cycle after arrivals so something is always happening. */
const DEPARTURE_OFFSET_MS = 20 * SECOND
const FINAL_APPROACH_METERS = 2500
const APPROACH_SPEED_KT = 140
const CLIMB_SPEED_KT = 160
const CLIMB_FPM = 1800

const runway = (name: string) => LOGAN_RUNWAYS.flatMap((r) => r.ends).find((e) => e.name === name)!
const ARRIVAL_FROM = runway('04R').position
const ARRIVAL_HEADING = bearingDegrees(ARRIVAL_FROM, runway('22L').position)
const DEPARTURE_LIFTOFF = runway('04L').position
const DEPARTURE_HEADING = bearingDegrees(runway('22R').position, DEPARTURE_LIFTOFF)

const base = (id: string, flight: Flight, position: LngLat): Omit<Aircraft, 'altitudeFt' | 'verticalRateFpm' | 'groundSpeedKt' | 'trackDeg' | 'isOnGround'> => ({
  id,
  callsign: flight.callsign,
  type: flight.type,
  position,
  positionAgeSec: 0,
})

function overflight(flight: Overflight, index: number, elapsedMs: number): Aircraft {
  const cycle = Math.floor(elapsedMs / OVERFLIGHT_CYCLE_MS)
  const seconds = (elapsedMs % OVERFLIGHT_CYCLE_MS) / SECOND
  const position = moveAlong(flight.start, flight.heading, flight.speedKt * KNOT * seconds)
  return {
    ...base(`demo-over-${index}-${cycle}`, flight, position),
    isOnGround: false,
    altitudeFt: flight.altitudeFt,
    groundSpeedKt: flight.speedKt,
    trackDeg: flight.heading,
    verticalRateFpm: 0,
  }
}

/** On short final to 04R, already low and descending, then on the ground at the threshold. */
function arrival(elapsedMs: number): Aircraft {
  const cycle = Math.floor(elapsedMs / MOVEMENT_CYCLE_MS)
  const flight = ARRIVALS[cycle % ARRIVALS.length]
  const flown = APPROACH_SPEED_KT * KNOT * ((elapsedMs % MOVEMENT_CYCLE_MS) / SECOND)
  const remaining = Math.max(FINAL_APPROACH_METERS - flown, 0)
  const isOnGround = remaining === 0
  return {
    ...base(`demo-arr-${cycle}`, flight, moveAlong(ARRIVAL_FROM, ARRIVAL_HEADING + 180, remaining)),
    isOnGround,
    altitudeFt: isOnGround ? 0 : Math.round((remaining / FINAL_APPROACH_METERS) * 800) + 50,
    groundSpeedKt: isOnGround ? 0 : APPROACH_SPEED_KT,
    trackDeg: ARRIVAL_HEADING,
    verticalRateFpm: isOnGround ? null : -700,
  }
}

/** Just airborne off 22R, climbing out south-west over the city. */
function departure(elapsedMs: number): Aircraft {
  const shifted = elapsedMs + MOVEMENT_CYCLE_MS - DEPARTURE_OFFSET_MS
  const cycle = Math.floor(shifted / MOVEMENT_CYCLE_MS)
  const flight = DEPARTURES[cycle % DEPARTURES.length]
  const seconds = (shifted % MOVEMENT_CYCLE_MS) / SECOND
  return {
    ...base(`demo-dep-${cycle}`, flight, moveAlong(DEPARTURE_LIFTOFF, DEPARTURE_HEADING, CLIMB_SPEED_KT * KNOT * seconds)),
    isOnGround: false,
    altitudeFt: Math.round(200 + (CLIMB_FPM / 60) * seconds),
    groundSpeedKt: CLIMB_SPEED_KT,
    trackDeg: DEPARTURE_HEADING,
    verticalRateFpm: CLIMB_FPM,
  }
}

/** Scripted traffic for trying out the visuals: overflights plus a Logan arrival and departure every 40s. */
export function demoAircraft(elapsedMs: number): Aircraft[] {
  return [...OVERFLIGHTS.map((f, i) => overflight(f, i, elapsedMs)), arrival(elapsedMs), departure(elapsedMs)]
}
