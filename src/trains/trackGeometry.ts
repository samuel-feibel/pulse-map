import { toDegrees, toRadians, type LngLat } from '../geo'

/** Meters per degree of latitude (and of longitude at the equator). */
const METERS_PER_DEGREE = 111_320
/** Trains farther than this from every track of their route (yards, bad GPS) aren't snapped. */
const MAX_SNAP_OFFSET_METERS = 150
/** Stick with the branch a train was already on unless another is clearly closer (shared trunks). */
const BRANCH_STICKINESS_METERS = 25

/** A subway line's centerline, measured so positions can be expressed as "meters along the track". */
export interface TrackShape {
  readonly points: readonly LngLat[]
  /** Distance from the start of the track to each point, in meters. */
  readonly cumulative: readonly number[]
  readonly length: number
  readonly metersPerLngDegree: number
}

export interface Projection {
  readonly along: number
  readonly offset: number
}

export interface Snap extends Projection {
  readonly trackIndex: number
}

/** Flat x/y meters relative to `origin`; plenty accurate across a city. */
const toXY = (shape: Pick<TrackShape, 'metersPerLngDegree'>, origin: LngLat, p: LngLat): [number, number] => [
  (p.lng - origin.lng) * shape.metersPerLngDegree,
  (p.lat - origin.lat) * METERS_PER_DEGREE,
]

export function buildTrack(coordinates: readonly (readonly [number, number])[]): TrackShape {
  const points = coordinates.map(([lng, lat]) => ({ lng, lat }))
  const metersPerLngDegree = METERS_PER_DEGREE * Math.cos(toRadians(points[0]?.lat ?? 0))
  const cumulative = points.reduce<number[]>((acc, p, i) => {
    if (i === 0) return [0]
    const [x, y] = toXY({ metersPerLngDegree }, points[i - 1], p)
    return [...acc, acc[i - 1] + Math.hypot(x, y)]
  }, [])
  return { points, cumulative, length: cumulative.at(-1) ?? 0, metersPerLngDegree }
}

/** How far along the track the closest point to `p` is, and how far `p` is from the track. */
export function projectOnto(shape: TrackShape, p: LngLat): Projection {
  let best: Projection = { along: 0, offset: Infinity }
  for (let i = 1; i < shape.points.length; i++) {
    const a = shape.points[i - 1]
    const [bx, by] = toXY(shape, a, shape.points[i])
    const [px, py] = toXY(shape, a, p)
    const segment = bx * bx + by * by
    const t = segment === 0 ? 0 : Math.min(Math.max((px * bx + py * by) / segment, 0), 1)
    const offset = Math.hypot(px - t * bx, py - t * by)
    if (offset < best.offset) {
      best = { along: shape.cumulative[i - 1] + t * Math.sqrt(segment), offset }
    }
  }
  return best
}

/** The point `along` meters down the track, and the track's compass direction there. */
export function pointAlong(shape: TrackShape, along: number): { position: LngLat; bearing: number } {
  const target = Math.min(Math.max(along, 0), shape.length)
  const i = Math.max(1, shape.cumulative.findIndex((d) => d >= target))
  const a = shape.points[i - 1]
  const b = shape.points[Math.min(i, shape.points.length - 1)]
  const span = shape.cumulative[i] - shape.cumulative[i - 1]
  const t = span > 0 ? (target - shape.cumulative[i - 1]) / span : 0
  const [bx, by] = toXY(shape, a, b)
  return {
    position: { lng: a.lng + (b.lng - a.lng) * t, lat: a.lat + (b.lat - a.lat) * t },
    bearing: (toDegrees(Math.atan2(bx, by)) + 360) % 360,
  }
}

/** Snaps a train to the closest of its route's tracks (branches), or null if it's off every track. */
export function snapToRoute(shapes: readonly TrackShape[], p: LngLat, preferredIndex?: number): Snap | null {
  const snaps = shapes.map((shape, trackIndex) => ({ ...projectOnto(shape, p), trackIndex }))
  const closest = snaps.reduce<Snap | null>((best, s) => (!best || s.offset < best.offset ? s : best), null)
  if (!closest || closest.offset > MAX_SNAP_OFFSET_METERS) {
    return null
  }
  const preferred = preferredIndex === undefined ? undefined : snaps[preferredIndex]
  return preferred && preferred.offset <= closest.offset + BRANCH_STICKINESS_METERS ? preferred : closest
}
