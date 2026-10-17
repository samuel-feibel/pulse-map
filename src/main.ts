import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// Vite bundles the worker itself; MapLibre can't find it after dependency pre-bundling.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import './style.css'
import { CENTER, FRAME_MARGIN_METERS, HARVARD_SQUARE } from './config'
import { halfWidthToInclude, squareBounds } from './geo'
import { fetchLines } from './mbta/lines'
import { fetchStations, type Station } from './mbta/stations'
import { minimalStyle } from './mapStyle'
import { addLineLayers, addTrainLayers } from './trains/layers'
import { startLiveTrains } from './trains/live'
import { addStationLayers } from './trains/stationLayers'
import { planesModeFromUrl, startPlanes } from './planes/controller'
import { addRunwayLayer } from './planes/layers'
import { LOGAN_RUNWAYS } from './planes/runways'
import { startSports } from './sports/controller'
import { sportsModeFromUrl } from './sports/modes'
import { createDemoBadge } from './ui/demoBadge'
import { SPORTS_BOTTOM_LAYER } from './sports/layers'
import { startWeather } from './weather/controller'

maplibregl.setWorkerUrl(workerUrl)

// Garden in the middle, wide enough to show Harvard Square and every Logan runway end.
const mustShow = [HARVARD_SQUARE, ...LOGAN_RUNWAYS.flatMap((runway) => runway.ends.map((end) => end.position))]
const bounds = squareBounds(CENTER, halfWidthToInclude(CENTER, mustShow, FRAME_MARGIN_METERS))
const lngLatBounds: maplibregl.LngLatBoundsLike = [
  [bounds.west, bounds.south],
  [bounds.east, bounds.north],
]

function element<T extends HTMLElement>(id: string): T {
  const found = document.getElementById(id)
  if (!found) {
    throw new Error(`Missing #${id} element`)
  }
  return found as T
}

const container = element('map')
const reportDemo = createDemoBadge(element('demo-badge'))

const map = new maplibregl.Map({
  container,
  style: minimalStyle(),
  bounds: lngLatBounds,
  interactive: false,
  // No on-screen text on the wall. Map data © OpenStreetMap contributors, tiles by OpenFreeMap.
  attributionControl: false,
})

// Keep the same patch of city framed whenever the window (or projector output) changes size.
map.on('resize', () => map.fitBounds(lngLatBounds, { animate: false }))

map.on('error', (event) => {
  console.error('Map error:', event.error)
})

// Stations are a nice-to-have: if they fail to load, the lines and trains still show.
const loadStations = (): Promise<readonly Station[]> =>
  fetchStations().catch((error: unknown) => {
    console.error('Could not load stations; showing lines and trains without them.', error)
    return []
  })

map.on('load', async () => {
  // Layer order, bottom to top: roads, runways, subway lines, venue outlines and ripples, stations, trains, planes.
  const search = window.location.search
  addRunwayLayer(map)
  startSports(map, sportsModeFromUrl(search), reportDemo)
  try {
    const [lines, stations] = await Promise.all([fetchLines(), loadStations()])
    addLineLayers(map, lines, SPORTS_BOTTOM_LAYER)
    addStationLayers(map, stations)
    addTrainLayers(map, lines)
    startLiveTrains(map, lines)
  } catch (error) {
    console.error('Could not load subway lines; showing the map without trains.', error)
  }
  startPlanes(map, CENTER, planesModeFromUrl(search), reportDemo)
})

startWeather(
  {
    map: container,
    canvas: element<HTMLCanvasElement>('weather'),
    effects: element('weather'),
    tint: element('tint'),
    flash: element('flash'),
  },
  CENTER,
  reportDemo,
)
