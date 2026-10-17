import type { Map as MapLibreMap } from 'maplibre-gl'
import type { Line, TransitProvider, Vehicle } from '../transit/types'
import { buildNetwork, routeColors, setTrains, trainsCollection } from './layers'
import { updateTracks, type Network, type Tracks } from './tracker'

/** Default poll: every 10 seconds, gentle on free transit APIs (6/minute against MBTA's keyless 20). */
const DEFAULT_POLL_INTERVAL_MS = 10_000
/** Longest wait between retries after repeated failures. */
const MAX_BACKOFF_MS = 10 * 60_000

interface Source {
  readonly fetchVehicles: () => Promise<Vehicle[]>
  readonly pollMs: number
  tracks: Tracks
}

/** Each agency with trains, polled at its own pace (e.g. live Muni every 75 s, timetable BART every 5 s). */
function sourcesOf(transit: TransitProvider): Source[] {
  return (transit.parts ?? [transit]).flatMap((part) =>
    part.fetchVehicles
      ? [{ fetchVehicles: part.fetchVehicles, pollMs: part.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS, tracks: new Map() }]
      : [],
  )
}

function startPolling(source: Source, network: Network): void {
  let failures = 0
  const poll = async (): Promise<void> => {
    try {
      source.tracks = updateTracks(source.tracks, await source.fetchVehicles(), performance.now(), source.pollMs, network)
      failures = 0
    } catch (error) {
      failures += 1
      console.error(`Train update failed (attempt ${failures}); keeping last positions.`, error)
    }
    window.setTimeout(poll, Math.min(source.pollMs * 2 ** failures, MAX_BACKOFF_MS))
  }
  void poll()
}

/** Polls train positions and animates trains smoothly along their tracks between updates. */
export function startLiveTrains(map: MapLibreMap, lines: readonly Line[], transit: TransitProvider): void {
  const sources = sourcesOf(transit)
  if (sources.length === 0) {
    return
  }
  const colors = routeColors(lines)
  const network = buildNetwork(lines)
  sources.forEach((source) => startPolling(source, network))

  const render = (): void => {
    const now = performance.now()
    const features = sources.flatMap((s) => trainsCollection(s.tracks, colors, now, s.pollMs, network).features)
    setTrains(map, { type: 'FeatureCollection', features })
    requestAnimationFrame(render)
  }
  requestAnimationFrame(render)
}
