import type { Map as MapLibreMap } from 'maplibre-gl'
import type { LngLat } from '../geo'
import { fetchAircraft } from './adsb'
import { aircraftName } from './aircraftTypes'
import { DEMO_ROUTES, demoAircraft } from './demo'
import { runwayEvent } from './detect'
import { createPlaneLabels, type PlaneLabel } from './labels'
import { addPlaneLayers, setPlanes, type PlaneFeature, type TrailFeature } from './layers'
import { createRouteLookup, routeLabel, type Route } from './routes'
import { matchRunway } from './runways'
import { runAt, type RunwayRun } from './runwayRun'
import { displayPosition, settleFrom, trackAircraft, type TrackedPlane } from './tracker'
import { extendTrail, pruneTrail, type TrailPoint } from './trails'
import type { Aircraft, RunwayEventKind } from './types'

/** Positions are dead-reckoned between updates, so a gentle poll still looks smooth. */
const LIVE_POLL_MS = 10_000
const DEMO_POLL_MS = 2_000
const RETRY_MS = 15_000
const RUN_MS = 10_000
/** Don't replay a runway run for the same plane within this window. */
const EVENT_COOLDOWN_MS = 10 * 60_000
const LABEL_FADE = 0.1

export type PlanesMode = 'live' | 'demo'

interface ActiveRun {
  readonly run: RunwayRun
  readonly lines: readonly string[]
}

const labelOpacity = (progress: number): number =>
  Math.min(1, progress / LABEL_FADE, (1 - progress) / LABEL_FADE)

/** Live (or demo) aircraft: planes with fading trails, and scripted runway runs with call-outs at Logan. */
export function startPlanes(map: MapLibreMap, center: LngLat, mode: PlanesMode): void {
  addPlaneLayers(map)
  const showLabels = createPlaneLabels(map)
  const lookupRoute =
    mode === 'demo' ? (callsign: string) => Promise.resolve<Route | null>(DEMO_ROUTES.get(callsign) ?? null) : createRouteLookup()
  let planes = new Map<string, TrackedPlane>()
  const trails = new Map<string, TrailPoint[]>()
  const runs = new Map<string, ActiveRun>()
  const lastEventAt = new Map<string, number>()

  const startRun = (aircraft: Aircraft, kind: RunwayEventKind, previous: Aircraft | undefined, now: number): void => {
    const track = aircraft.trackDeg ?? previous?.trackDeg
    const runway = track === null || track === undefined ? null : matchRunway(aircraft.position, track)
    if (!runway) {
      return
    }
    lastEventAt.set(aircraft.id, now)
    const run: RunwayRun = { kind, from: runway.from.position, to: runway.to.position, startedAt: now, durationMs: RUN_MS }
    runs.set(aircraft.id, { run, lines: [aircraftName(aircraft.type)] })
    if (!aircraft.callsign) {
      return
    }
    void lookupRoute(aircraft.callsign).then((route) => {
      const label = route ? routeLabel(route, kind) : null
      const active = runs.get(aircraft.id)
      if (label && active?.run === run) {
        runs.set(aircraft.id, { ...active, lines: [...active.lines, label] })
      }
    })
  }

  const ingest = (aircraft: readonly Aircraft[], now: number): void => {
    const next = new Map<string, TrackedPlane>()
    aircraft.forEach((ac) => {
      const previous = planes.get(ac.id)
      const kind = runwayEvent(previous?.aircraft ?? null, ac)
      const isCoolingDown = now - (lastEventAt.get(ac.id) ?? -Infinity) < EVENT_COOLDOWN_MS
      if (kind && !isCoolingDown && !runs.has(ac.id)) {
        startRun(ac, kind, previous?.aircraft, now)
      }
      next.set(ac.id, trackAircraft(previous, ac, now))
    })
    // Keep planes mid-run even if they drop out of the feed, so the run can finish.
    runs.forEach((_, id) => {
      const kept = planes.get(id)
      if (!next.has(id) && kept) next.set(id, kept)
    })
    planes = next
  }

  /** Advances one plane to `now`: finishes its run if due, updates its trail, and returns what to draw. */
  const step = (id: string, plane: TrackedPlane, now: number): { feature: PlaneFeature; label?: PlaneLabel } | null => {
    const active = runs.get(id)
    const frame = active ? runAt(active.run, now) : null
    let current = plane
    if (active && !frame) {
      runs.delete(id)
      if (active.run.kind === 'takeoff') {
        current = settleFrom(plane, active.run.to, now)
        planes.set(id, current)
      }
    }
    const trail = trails.get(id) ?? []
    if (!frame && current.aircraft.isOnGround) {
      trails.set(id, pruneTrail(trail, now))
      return null
    }
    const position = frame?.position ?? displayPosition(current, now)
    trails.set(id, extendTrail(trail, position, now))
    const feature = { position, bearing: frame?.bearing ?? current.aircraft.trackDeg ?? 0 }
    const label = frame && active ? { lines: active.lines, position, opacity: labelOpacity(frame.progress) } : undefined
    return { feature, label }
  }

  const render = (now: number): void => {
    const drawn = new Map<string, PlaneFeature>()
    const labels = new Map<string, PlaneLabel>()
    planes.forEach((plane, id) => {
      const result = step(id, plane, now)
      if (result) drawn.set(id, result.feature)
      if (result?.label) labels.set(id, result.label)
    })
    trails.forEach((trail, id) => {
      if (!planes.has(id) && pruneTrail(trail, now).length === 0) trails.delete(id)
    })
    // Each trail ends exactly at its plane so it doesn't lag a sample behind.
    const trailFeatures: TrailFeature[] = [...trails.entries()].map(([id, trail]) => {
      const head = drawn.get(id)?.position
      return { coordinates: [...pruneTrail(trail, now).map((p) => p.position), ...(head ? [head] : [])] }
    })
    setPlanes(map, [...drawn.values()], trailFeatures)
    showLabels(labels)
    requestAnimationFrame(render)
  }

  if (mode === 'demo') {
    const startedAt = performance.now()
    const tick = (): void => ingest(demoAircraft(performance.now() - startedAt), performance.now())
    tick()
    window.setInterval(tick, DEMO_POLL_MS)
  } else {
    const poll = async (): Promise<void> => {
      let delay = LIVE_POLL_MS
      try {
        ingest(await fetchAircraft(center), performance.now())
      } catch (error) {
        delay = RETRY_MS
        console.error('Aircraft update failed; keeping the last positions.', error)
      }
      window.setTimeout(poll, delay)
    }
    void poll()
  }
  requestAnimationFrame(render)
}

/** `?planes=demo` plays scripted traffic instead of live ADS-B data. */
export const planesModeFromUrl = (search: string): PlanesMode =>
  new URLSearchParams(search).get('planes') === 'demo' ? 'demo' : 'live'
