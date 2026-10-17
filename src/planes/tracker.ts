import type { LngLat } from '../geo'
import { predictPosition } from './motion'
import type { Aircraft } from './types'

/** When a fresh report disagrees with where we drew the plane, ease into it over this long. */
const SETTLE_MS = 2_000

export interface TrackedPlane {
  readonly aircraft: Aircraft
  /** When the reported position was true (fetch time minus the report's age). */
  readonly reportedAt: number
  /** Offset from the prediction at `correctedAt`, shrinking to nothing over SETTLE_MS. */
  readonly correction: LngLat
  readonly correctedAt: number
}

const NO_CORRECTION: LngLat = { lng: 0, lat: 0 }

function predicted(plane: Pick<TrackedPlane, 'aircraft' | 'reportedAt'>, now: number): LngLat {
  const { position, trackDeg, groundSpeedKt, isOnGround } = plane.aircraft
  return isOnGround ? position : predictPosition(position, trackDeg, groundSpeedKt, (now - plane.reportedAt) / 1000)
}

/** Where to draw a plane now: dead-reckoned from its last report, smoothed after corrections. */
export function displayPosition(plane: TrackedPlane, now: number): LngLat {
  const base = predicted(plane, now)
  const remaining = Math.max(0, 1 - (now - plane.correctedAt) / SETTLE_MS)
  return { lng: base.lng + plane.correction.lng * remaining, lat: base.lat + plane.correction.lat * remaining }
}

/** Folds a new report into a tracked plane without the drawn position jumping. */
export function trackAircraft(previous: TrackedPlane | undefined, aircraft: Aircraft, now: number): TrackedPlane {
  const next = { aircraft, reportedAt: now - aircraft.positionAgeSec * 1000 }
  if (!previous) {
    return { ...next, correction: NO_CORRECTION, correctedAt: now }
  }
  const drawn = displayPosition(previous, now)
  const target = predicted(next, now)
  return { ...next, correction: { lng: drawn.lng - target.lng, lat: drawn.lat - target.lat }, correctedAt: now }
}

/** Starts easing from an arbitrary drawn position (e.g. the end of a runway run) back to the real track. */
export const settleFrom = (plane: TrackedPlane, drawn: LngLat, now: number): TrackedPlane => {
  const target = predicted(plane, now)
  return { ...plane, correction: { lng: drawn.lng - target.lng, lat: drawn.lat - target.lat }, correctedAt: now }
}
