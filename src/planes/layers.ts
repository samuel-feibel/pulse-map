import type { FeatureCollection, LineString, Point } from 'geojson'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import type { LngLat } from '../geo'
import { LOGAN_RUNWAYS } from './runways'

const RUNWAYS_SOURCE = 'runways'
const PLANES_SOURCE = 'planes'
const TRAILS_SOURCE = 'plane-trails'
const PLANE_ICON = 'plane'
/** Flight-radar yellow. */
export const PLANE_COLOR = '#FFC72C'
const RUNWAY_COLOR = '#6b6b6b'
const ICON_PX = 64
const ICON_PIXEL_RATIO = 2

export interface PlaneFeature {
  readonly position: LngLat
  readonly bearing: number
}

export interface TrailFeature {
  readonly coordinates: readonly LngLat[]
}

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }

/** A simple top-down airliner silhouette, nose pointing up (north) so icon-rotate = track. */
function planeIcon(): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = ICON_PX
  canvas.height = ICON_PX
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('2D canvas is not available for the plane icon')
  }
  const s = ICON_PX / 32
  const shape: readonly (readonly [number, number])[] = [
    [16, 1], [18, 4], [18, 12], [30, 19], [30, 21], [18, 18], [18, 26], [22, 29], [22, 31],
    [16, 29.5], [10, 31], [10, 29], [14, 26], [14, 18], [2, 21], [2, 19], [14, 12], [14, 4],
  ]
  ctx.fillStyle = PLANE_COLOR
  ctx.strokeStyle = '#000'
  ctx.lineWidth = s
  ctx.beginPath()
  shape.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x * s, y * s) : ctx.lineTo(x * s, y * s)))
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  return ctx.getImageData(0, 0, ICON_PX, ICON_PX)
}

/** Logan's runways as grey strips, so takeoffs and landings have something to roll along. */
export function addRunwayLayer(map: MapLibreMap, beforeLayerId?: string): void {
  map.addSource(RUNWAYS_SOURCE, {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: LOGAN_RUNWAYS.map(({ ends }) => ({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: ends.map((e) => [e.position.lng, e.position.lat]) },
      })),
    },
  })
  map.addLayer(
    {
      id: 'runways',
      type: 'line',
      source: RUNWAYS_SOURCE,
      paint: {
        'line-color': RUNWAY_COLOR,
        'line-width': ['interpolate', ['exponential', 2], ['zoom'], 11, 2.5, 16, 40],
      },
    },
    beforeLayerId && map.getLayer(beforeLayerId) ? beforeLayerId : undefined,
  )
}

/** Planes and their fading trails, on top of everything else. */
export function addPlaneLayers(map: MapLibreMap): void {
  map.addImage(PLANE_ICON, planeIcon(), { pixelRatio: ICON_PIXEL_RATIO })
  // lineMetrics lets each trail fade from transparent (oldest) to solid (at the plane).
  map.addSource(TRAILS_SOURCE, { type: 'geojson', data: EMPTY, lineMetrics: true })
  map.addSource(PLANES_SOURCE, { type: 'geojson', data: EMPTY })
  map.addLayer({
    id: 'plane-trails',
    type: 'line',
    source: TRAILS_SOURCE,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1.5, 16, 4],
      'line-gradient': ['interpolate', ['linear'], ['line-progress'], 0, 'rgba(255, 199, 44, 0)', 1, 'rgba(255, 199, 44, 0.75)'],
    },
  })
  map.addLayer({
    id: 'planes',
    type: 'symbol',
    source: PLANES_SOURCE,
    layout: {
      'icon-image': PLANE_ICON,
      'icon-size': ['interpolate', ['linear'], ['zoom'], 11, 0.55, 16, 1.4],
      'icon-rotate': ['get', 'bearing'],
      'icon-rotation-alignment': 'map',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  })
}

export function setPlanes(map: MapLibreMap, planes: readonly PlaneFeature[], trails: readonly TrailFeature[]): void {
  const planeData: FeatureCollection<Point> = {
    type: 'FeatureCollection',
    features: planes.map((p) => ({
      type: 'Feature',
      properties: { bearing: p.bearing },
      geometry: { type: 'Point', coordinates: [p.position.lng, p.position.lat] },
    })),
  }
  const trailData: FeatureCollection<LineString> = {
    type: 'FeatureCollection',
    features: trails
      .filter((t) => t.coordinates.length >= 2)
      .map((t) => ({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: t.coordinates.map((c) => [c.lng, c.lat]) },
      })),
  }
  map.getSource<GeoJSONSource>(PLANES_SOURCE)?.setData(planeData)
  map.getSource<GeoJSONSource>(TRAILS_SOURCE)?.setData(trailData)
}
