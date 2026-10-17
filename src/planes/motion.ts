import { EARTH_RADIUS_METERS, toDegrees, toRadians, type LngLat } from '../geo'

const METERS_PER_SECOND_PER_KNOT = 0.514444
/** Don't dead-reckon further than this: a plane that stops reporting shouldn't keep flying on screen. */
const MAX_PREDICTION_SEC = 20

/** Moves `meters` from `start` along a compass bearing. Flat-earth approximation, fine at city scale. */
export function moveAlong(start: LngLat, bearing: number, meters: number): LngLat {
  const north = meters * Math.cos(toRadians(bearing))
  const east = meters * Math.sin(toRadians(bearing))
  return {
    lat: start.lat + toDegrees(north / EARTH_RADIUS_METERS),
    lng: start.lng + toDegrees(east / (EARTH_RADIUS_METERS * Math.cos(toRadians(start.lat)))),
  }
}

/** Compass bearing from `a` to `b`, 0–360° clockwise from north. */
export function bearingDegrees(a: LngLat, b: LngLat): number {
  const north = toRadians(b.lat - a.lat)
  const east = toRadians(b.lng - a.lng) * Math.cos(toRadians(a.lat))
  return (toDegrees(Math.atan2(east, north)) + 360) % 360
}

/** Where a plane should be `ageSec` after a report, flying straight at its reported speed. */
export function predictPosition(position: LngLat, trackDeg: number | null, groundSpeedKt: number, ageSec: number): LngLat {
  if (trackDeg === null) {
    return position
  }
  const seconds = Math.min(Math.max(ageSec, 0), MAX_PREDICTION_SEC)
  return moveAlong(position, trackDeg, groundSpeedKt * METERS_PER_SECOND_PER_KNOT * seconds)
}
