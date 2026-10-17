export interface Point {
  readonly x: number
  readonly y: number
}

export interface Bolt {
  /** paths[0] is the main channel; the rest are branches forking off it. */
  readonly paths: readonly (readonly Point[])[]
}

type Random = () => number

const MAIN_DEPTH = 6
const BRANCH_DEPTH = 4
const MAIN_JAGGEDNESS = 0.18
const BRANCH_JAGGEDNESS = 0.2
const MIN_BRANCHES = 2
const EXTRA_BRANCHES = 3
/** Branches fork from the upper part of the bolt, like real lightning. */
const BRANCH_ZONE = 0.7
const BRANCH_ANGLE: readonly [number, number] = [0.3, 0.7]
const BRANCH_LENGTH: readonly [number, number] = [0.15, 0.35]

const between = (random: Random, [min, max]: readonly [number, number]): number => min + random() * (max - min)
const distance = (a: Point, b: Point): number => Math.hypot(b.x - a.x, b.y - a.y)

/** Midpoint displacement: repeatedly nudges midpoints sideways to make a jagged line. */
function jagged(a: Point, b: Point, offset: number, depth: number, random: Random): Point[] {
  if (depth === 0) {
    return [a, b]
  }
  const length = distance(a, b) || 1
  const nudge = (random() - 0.5) * 2 * offset
  const mid = {
    x: (a.x + b.x) / 2 + (-(b.y - a.y) / length) * nudge,
    y: (a.y + b.y) / 2 + ((b.x - a.x) / length) * nudge,
  }
  return [
    ...jagged(a, mid, offset / 2, depth - 1, random).slice(0, -1),
    ...jagged(mid, b, offset / 2, depth - 1, random),
  ]
}

function branch(main: readonly Point[], heading: number, mainLength: number, random: Random): Point[] {
  const origin = main[1 + Math.floor(random() * (main.length - 2) * BRANCH_ZONE)]
  const side = random() < 0.5 ? -1 : 1
  const angle = heading + side * between(random, BRANCH_ANGLE)
  const length = mainLength * between(random, BRANCH_LENGTH)
  const end = { x: origin.x + Math.cos(angle) * length, y: origin.y + Math.sin(angle) * length }
  return jagged(origin, end, length * BRANCH_JAGGEDNESS, BRANCH_DEPTH, random)
}

export function createBolt(start: Point, end: Point, random: Random = Math.random): Bolt {
  const length = distance(start, end)
  const main = jagged(start, end, length * MAIN_JAGGEDNESS, MAIN_DEPTH, random)
  const heading = Math.atan2(end.y - start.y, end.x - start.x)
  const branchCount = MIN_BRANCHES + Math.floor(random() * EXTRA_BRANCHES)
  const branches = Array.from({ length: branchCount }, () => branch(main, heading, length, random))
  return { paths: [main, ...branches] }
}
