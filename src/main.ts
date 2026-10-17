import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// Vite bundles the worker itself; MapLibre can't find it after dependency pre-bundling.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import './style.css'
import { cityFromUrl } from './cities'
import { halfWidthToInclude, squareBounds } from './geo'
import { minimalStyle } from './mapStyle'
import { planesModeFromUrl, startPlanes } from './planes/controller'
import { addRunwayLayer } from './planes/layers'
import { startSports } from './sports/controller'
import { SPORTS_BOTTOM_LAYER } from './sports/layers'
import { sportsModeFromUrl } from './sports/modes'
import { startTransit } from './trains/start'
import { createDemoBadge } from './ui/demoBadge'
import { startWeather } from './weather/controller'

maplibregl.setWorkerUrl(workerUrl)

const search = window.location.search
/** `?city=sf` for San Francisco; Boston otherwise. Each city's settings live in src/cities/. */
const city = cityFromUrl(search)
document.title = `Pulse Map · ${city.name}`

const { center, mustShow, marginMeters } = city.frame
const bounds = squareBounds(center, halfWidthToInclude(center, mustShow, marginMeters))
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

// Development only: lets the browser console inspect the map (`pulseMap.getStyle()`, etc.).
if (import.meta.env.DEV) {
  Object.assign(window, { pulseMap: map })
}

// Keep the same patch of city framed whenever the window (or projector output) changes size.
map.on('resize', () => map.fitBounds(lngLatBounds, { animate: false }))

map.on('error', (event) => {
  console.error('Map error:', event.error)
})

map.on('load', async () => {
  // Layer order, bottom to top: roads, runways, rail lines, venue outlines and ripples, stations, trains, planes.
  // Each feature only appears if the city has it.
  if (city.airport) {
    addRunwayLayer(map, city.airport.runways)
  }
  const teams = city.sportsTeams ?? []
  if (teams.length > 0) {
    startSports(map, teams, sportsModeFromUrl(search, teams.map((t) => t.id)), reportDemo)
  }
  if (city.transit) {
    await startTransit(map, city.transit, SPORTS_BOTTOM_LAYER)
  }
  if (city.airport) {
    startPlanes(map, center, city.airport, planesModeFromUrl(search), reportDemo)
  }
})

startWeather(
  {
    map: container,
    canvas: element<HTMLCanvasElement>('weather'),
    effects: element('weather'),
    tint: element('tint'),
    flash: element('flash'),
  },
  center,
  reportDemo,
)
