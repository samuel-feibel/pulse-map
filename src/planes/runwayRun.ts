import type { LngLat } from '../geo'
import { bearingDegrees } from './motion'
import type { RunwayEventKind } from './types'

/** A scripted roll down the runway, shown for a fixed time regardless of the real tracking data. */
export interface RunwayRun {
  readonly kind: RunwayEventKind
  readonly from: LngLat
  readonly to: LngLat
  readonly startedAt: number
  readonly durationMs: number
}

export interface RunFrame {
  readonly position: LngLat
  readonly bearing: number
  /** 0 → 1 through the run. */
  readonly progress: number
}

/** A landing plane rolls out and stops this far down the runway. */
const LANDING_ROLLOUT = 0.75

/** Landings touch down fast and brake; takeoffs start slow and accelerate to the far end. */
function distanceFraction(kind: RunwayEventKind, t: number): number {
  return kind === 'landing' ? LANDING_ROLLOUT * (1 - (1 - t) ** 2) : t ** 2
}

export function runAt(run: RunwayRun, now: number): RunFrame | null {
  const t = (now - run.startedAt) / run.durationMs
  if (t < 0 || t >= 1) {
    return null
  }
  const f = distanceFraction(run.kind, t)
  return {
    position: {
      lng: run.from.lng + (run.to.lng - run.from.lng) * f,
      lat: run.from.lat + (run.to.lat - run.from.lat) * f,
    },
    bearing: bearingDegrees(run.from, run.to),
    progress: t,
  }
}
