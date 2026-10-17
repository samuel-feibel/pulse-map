export interface LngLat {
  readonly lng: number
  readonly lat: number
}

export interface Bounds {
  readonly west: number
  readonly south: number
  readonly east: number
  readonly north: number
}

export const EARTH_RADIUS_METERS = 6_371_008.8
export const toRadians = (degrees: number): number => (degrees * Math.PI) / 180
export const toDegrees = (radians: number): number => (radians * 180) / Math.PI

/** Great-circle (haversine) distance between two points. */
export function distanceMeters(a: LngLat, b: LngLat): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h))
}

/** Bounds of a square on the ground, `halfWidthMeters` from center to each edge. */
export function squareBounds(center: LngLat, halfWidthMeters: number): Bounds {
  if (!(halfWidthMeters > 0)) {
    throw new Error(`halfWidthMeters must be positive, got ${halfWidthMeters}`)
  }
  const dLat = toDegrees(halfWidthMeters / EARTH_RADIUS_METERS)
  const dLng = dLat / Math.cos(toRadians(center.lat))
  return {
    west: center.lng - dLng,
    south: center.lat - dLat,
    east: center.lng + dLng,
    north: center.lat + dLat,
  }
}

/** Smallest square half-width (center to edge) that keeps every point on the wall, plus a margin. */
export function halfWidthToInclude(center: LngLat, points: readonly LngLat[], marginMeters: number): number {
  if (points.length === 0) {
    throw new Error('halfWidthToInclude needs at least one point')
  }
  const reaches = points.map((p) =>
    Math.max(
      distanceMeters(center, { lng: p.lng, lat: center.lat }),
      distanceMeters(center, { lng: center.lng, lat: p.lat }),
    ),
  )
  return Math.max(...reaches) + marginMeters
}
