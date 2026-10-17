import type { Map as MapLibreMap } from 'maplibre-gl'
import type { Station, TransitProvider } from '../transit/types'
import { addLineLayers, addTrainLayers } from './layers'
import { startLiveTrains } from './live'
import { addStationLayers } from './stationLayers'

/** Draws a city's rail lines, stations and live trains. Lines go beneath `beforeLayerId` if it exists. */
export async function startTransit(map: MapLibreMap, transit: TransitProvider, beforeLayerId?: string): Promise<void> {
  // Stations are a nice-to-have: if they fail to load, the lines and trains still show.
  const stations = transit.loadStations().catch((error: unknown): Station[] => {
    console.error('Could not load stations; showing lines and trains without them.', error)
    return []
  })
  try {
    const lines = await transit.loadLines()
    addLineLayers(map, lines, beforeLayerId)
    addStationLayers(map, await stations)
    addTrainLayers(map, lines)
    startLiveTrains(map, lines, transit)
  } catch (error) {
    console.error('Could not load rail lines; showing the map without trains.', error)
  }
}
