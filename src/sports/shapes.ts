import { EARTH_RADIUS_METERS, toDegrees, toRadians, type LngLat } from '../geo'

/** A closed outline in meters: x toward the east, y toward the north. */
export type Ring = readonly (readonly [number, number])[]

const CORNER_STEPS = 8
const FEET = 0.3048
const QUARTER_TURN = 90

const close = (points: Ring): Ring => [...points, points[0]]

/** A rectangle centered on the origin, optionally with rounded corners (like a hockey rink). */
export function rectangle(width: number, height: number, cornerRadius: number): Ring {
  const halfW = width / 2
  const halfH = height / 2
  if (cornerRadius <= 0) {
    return close([
      [-halfW, -halfH],
      [halfW, -halfH],
      [halfW, halfH],
      [-halfW, halfH],
    ])
  }
  const r = Math.min(cornerRadius, halfW, halfH)
  // Corner arc centers, counterclockwise from bottom-right, each sweeping a quarter turn.
  const centers: readonly (readonly [number, number])[] = [
    [halfW - r, -halfH + r],
    [halfW - r, halfH - r],
    [-halfW + r, halfH - r],
    [-halfW + r, -halfH + r],
  ]
  const points = centers.flatMap(([cx, cy], corner) =>
    Array.from({ length: CORNER_STEPS + 1 }, (_, step): [number, number] => {
      const angle = toRadians(corner * QUARTER_TURN - QUARTER_TURN + (step / CORNER_STEPS) * QUARTER_TURN)
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
    }),
  )
  return close(points)
}

/**
 * Fenway Park's outfield wall in feet, as [degrees from the left-field line, distance from home plate]:
 * the short Green Monster in left, the deep triangle in center, the curving right field to Pesky's Pole.
 */
const FENWAY_WALL: readonly (readonly [number, number])[] = [
  [0, 310],
  [15, 335],
  [30, 379],
  [37, 390],
  [42, 420],
  [50, 400],
  [62, 380],
  [75, 380],
  [85, 330],
  [90, 302],
]
const BASE_PATH_FEET = 90
const HOME_TO_SECOND_FEET = BASE_PATH_FEET * Math.SQRT2

const polar = (bearingDegrees: number, meters: number): [number, number] => [
  meters * Math.sin(toRadians(bearingDegrees)),
  meters * Math.cos(toRadians(bearingDegrees)),
]

/** Fenway's field (outfield wall, then infield diamond), home plate at the origin. */
export function fieldOutline(scale: number, centerFieldBearing: number): readonly [Ring, Ring] {
  const leftFieldLine = centerFieldBearing - QUARTER_TURN / 2
  const meters = (feet: number) => feet * FEET * scale
  const home: [number, number] = [0, 0]
  const wall = FENWAY_WALL.map(([angle, feet]) => polar(leftFieldLine + angle, meters(feet)))
  const diamond: Ring = [
    home,
    polar(centerFieldBearing + QUARTER_TURN / 2, meters(BASE_PATH_FEET)),
    polar(centerFieldBearing, meters(HOME_TO_SECOND_FEET)),
    polar(centerFieldBearing - QUARTER_TURN / 2, meters(BASE_PATH_FEET)),
    home,
  ]
  return [[home, ...wall, home], diamond]
}

/** Places a meter-based outline on the map around `anchor`. Accurate enough at city scale. */
export function toLngLat(anchor: LngLat, ring: Ring): [number, number][] {
  const metersPerLngDegree = toRadians(EARTH_RADIUS_METERS * Math.cos(toRadians(anchor.lat)))
  return ring.map(([x, y]) => [anchor.lng + x / metersPerLngDegree, anchor.lat + toDegrees(y / EARTH_RADIUS_METERS)])
}

/** Shifts outlines together so the center of their combined bounding box sits at the origin. */
export function centered(rings: readonly Ring[]): Ring[] {
  const points = rings.flat()
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2
  return rings.map((ring) => ring.map(([x, y]) => [x - cx, y - cy] as const))
}
