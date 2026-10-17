import type { Map as MapLibreMap } from 'maplibre-gl'
import type { Line } from '../mbta/lines'
import { fetchVehicles } from '../mbta/vehicles'
import { buildNetwork, routeColors, setTrains, trainsCollection } from './layers'
import { updateTracks, type Tracks } from './tracker'

/** 6 requests/minute, well under the keyless limit of 20. */
const POLL_INTERVAL_MS = 10_000
const MAX_BACKOFF_MS = 60_000

/** Polls live MBTA positions and animates trains smoothly between updates. */
export function startLiveTrains(map: MapLibreMap, lines: readonly Line[]): void {
  const colors = routeColors(lines)
  const network = buildNetwork(lines)
  let tracks: Tracks = new Map()
  let failures = 0

  const poll = async (): Promise<void> => {
    try {
      tracks = updateTracks(tracks, await fetchVehicles(), performance.now(), POLL_INTERVAL_MS, network)
      failures = 0
    } catch (error) {
      failures += 1
      console.error(`Train update failed (attempt ${failures}); keeping last positions.`, error)
    }
    const delay = Math.min(POLL_INTERVAL_MS * 2 ** failures, MAX_BACKOFF_MS)
    window.setTimeout(poll, delay)
  }

  const render = (): void => {
    setTrains(map, trainsCollection(tracks, colors, performance.now(), POLL_INTERVAL_MS, network))
    requestAnimationFrame(render)
  }

  void poll()
  requestAnimationFrame(render)
}
