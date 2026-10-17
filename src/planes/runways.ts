import { distanceMeters, type LngLat } from '../geo'
import { bearingDegrees } from './motion'

export interface RunwayEnd {
  readonly name: string
  readonly position: LngLat
}

export interface Runway {
  readonly ends: readonly [RunwayEnd, RunwayEnd]
}

/** Builds a runway end from threshold coordinates. */
export const runwayEnd = (name: string, lat: number, lng: number): RunwayEnd => ({ name, position: { lng, lat } })

/** A runway oriented in a plane's direction of travel. */
export interface RunwayMatch {
  readonly from: RunwayEnd
  readonly to: RunwayEnd
}

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
export function matchRunway(position: LngLat, trackDeg: number, runways: readonly Runway[]): RunwayMatch | null {
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
