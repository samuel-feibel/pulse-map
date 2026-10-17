import { distanceMeters, type LngLat } from '../geo'
import { bearingDegrees } from './motion'

export interface RunwayEnd {
  readonly name: string
  readonly position: LngLat
}

export interface Runway {
  readonly ends: readonly [RunwayEnd, RunwayEnd]
}

/** A runway oriented in a plane's direction of travel. */
export interface RunwayMatch {
  readonly from: RunwayEnd
  readonly to: RunwayEnd
}

const end = (name: string, lat: number, lng: number): RunwayEnd => ({ name, position: { lng, lat } })

/** Logan's runways (threshold coordinates from OurAirports). */
export const LOGAN_RUNWAYS: readonly Runway[] = [
  { ends: [end('04L', 42.357997, -71.014344), end('22R', 42.378322, -71.004511)] },
  { ends: [end('04R', 42.351064, -71.011801), end('22L', 42.376923, -70.999288)] },
  { ends: [end('09', 42.355801, -71.012901), end('27', 42.360199, -70.987701)] },
  { ends: [end('14', 42.356602, -71.0233), end('32', 42.348598, -71.008202)] },
  { ends: [end('15L', 42.3736, -71.009102), end('33R', 42.368599, -71.002502)] },
  { ends: [end('15R', 42.374298, -71.017899), end('33L', 42.354599, -70.9916)] },
]

const MAX_HEADING_DIFF = 25
/** How far either side of the extended centerline a plane may be. */
const MAX_OFFSET_METERS = 600
/** How far before the threshold (on final) or past the far end (after liftoff) still counts. */
const MAX_BEFORE_METERS = 9000
const MAX_AFTER_METERS = 4000

const headingDiff = (a: number, b: number): number => Math.abs(((a - b + 540) % 360) - 180)

/** Along-track and cross-track distance of `point` relative to the line from `from` heading `bearing`. */
function offsets(from: LngLat, bearing: number, point: LngLat): { along: number; across: number } {
  const distance = distanceMeters(from, point)
  const angle = ((bearingDegrees(from, point) - bearing) * Math.PI) / 180
  return { along: distance * Math.cos(angle), across: Math.abs(distance * Math.sin(angle)) }
}

/** The runway a plane is lined up with, oriented the way it's moving, or null. */
export function matchRunway(position: LngLat, trackDeg: number, runways: readonly Runway[] = LOGAN_RUNWAYS): RunwayMatch | null {
  const candidates = runways.flatMap(({ ends: [a, b] }) =>
    [
      { from: a, to: b },
      { from: b, to: a },
    ].flatMap((match) => {
      const heading = bearingDegrees(match.from.position, match.to.position)
      const length = distanceMeters(match.from.position, match.to.position)
      const { along, across } = offsets(match.from.position, heading, position)
      const fits =
        headingDiff(heading, trackDeg) <= MAX_HEADING_DIFF &&
        across <= MAX_OFFSET_METERS &&
        along >= -MAX_BEFORE_METERS &&
        along <= length + MAX_AFTER_METERS
      return fits ? [{ match, across }] : []
    }),
  )
  const best = candidates.sort((x, y) => x.across - y.across)[0]
  return best?.match ?? null
}
