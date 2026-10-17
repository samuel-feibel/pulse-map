import { distanceMeters, type LngLat } from '../geo'
import type { Aircraft, RunwayEventKind } from './types'

/** Logan's airport reference point. */
export const LOGAN: LngLat = { lng: -71.0096, lat: 42.3656 }
const NEAR_AIRPORT_METERS = 8000
const LOW_ALTITUDE_FT = 1500
/** Climb or descent rate that marks a real departure or arrival rather than level flight. */
const MIN_VERTICAL_RATE_FPM = 300

/** Whether a plane is taking off from or landing at Logan right now, judged from two consecutive reports. */
export function runwayEvent(previous: Aircraft | null, next: Aircraft): RunwayEventKind | null {
  if (distanceMeters(next.position, LOGAN) > NEAR_AIRPORT_METERS) {
    return null
  }
  if (next.isOnGround) {
    const justTouchedDown = previous !== null && !previous.isOnGround && previous.altitudeFt < LOW_ALTITUDE_FT
    return justTouchedDown ? 'landing' : null
  }
  if (next.altitudeFt > LOW_ALTITUDE_FT || next.verticalRateFpm === null) {
    return null
  }
  if (next.verticalRateFpm <= -MIN_VERTICAL_RATE_FPM) return 'landing'
  if (next.verticalRateFpm >= MIN_VERTICAL_RATE_FPM) return 'takeoff'
  return null
}
