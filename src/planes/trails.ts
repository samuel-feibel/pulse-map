import type { LngLat } from '../geo'

export interface TrailPoint {
  readonly position: LngLat
  readonly at: number
}

/** Short trails: about 30 seconds of flight, sampled once a second. */
const SAMPLE_MS = 1_000
const MAX_AGE_MS = 30_000

export function extendTrail(trail: readonly TrailPoint[], position: LngLat, now: number): TrailPoint[] {
  const last = trail.at(-1)
  const sampled = !last || now - last.at >= SAMPLE_MS ? [...trail, { position, at: now }] : [...trail]
  return sampled.filter((point) => now - point.at <= MAX_AGE_MS)
}

/** Lets a trail fade away without adding points (e.g. once a plane has landed and is hidden). */
export const pruneTrail = (trail: readonly TrailPoint[], now: number): TrailPoint[] =>
  trail.filter((point) => now - point.at <= MAX_AGE_MS)
