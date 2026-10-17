import type { FeatureCollection, LineString, Point } from 'geojson'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import type { Line } from '../mbta/lines'
import { trainAt, type Network, type Tracks } from './tracker'
import { buildTrack } from './trackGeometry'

const LINES_SOURCE = 'subway-lines'
const TRAINS_SOURCE = 'trains'
const TRAIN_CORE_COLOR = '#FFFFFF'
const CAPSULE_WIDTH_PX = 28
const CAPSULE_HEIGHT_PX = 56
const CAPSULE_PIXEL_RATIO = 2
/** Thin white rim so a train stands out against its own line, which is the same color. */
const CAPSULE_RIM = 'rgba(255, 255, 255, 0.9)'
const HEADLIGHT_COLOR = '#FFFFFF'

/** One capsule image per line color, e.g. 'train-DA291C'. */
const capsuleImageName = (color: string): string => `train-${color.replace('#', '')}`

export type RouteColors = ReadonlyMap<string, string>

/** Each route's track shapes, so trains can be drawn on (and glide along) their tracks. */
export function buildNetwork(lines: readonly Line[]): Network {
  const network = new Map<string, ReturnType<typeof buildTrack>[]>()
  lines.forEach((line) => network.set(line.routeId, [...(network.get(line.routeId) ?? []), buildTrack(line.coordinates)]))
  return network
}

export const routeColors = (lines: readonly Line[]): RouteColors =>
  new Map(lines.map((line) => [line.routeId, line.color]))

function linesCollection(lines: readonly Line[]): FeatureCollection<LineString> {
  return {
    type: 'FeatureCollection',
    features: lines.map((line) => ({
      type: 'Feature',
      properties: { color: line.color },
      geometry: { type: 'LineString', coordinates: line.coordinates.map(([lng, lat]) => [lng, lat]) },
    })),
  }
}

export function trainsCollection(
  tracks: Tracks,
  colors: RouteColors,
  now: number,
  glideMs: number,
  network: Network,
): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: [...tracks.values()].map((track) => {
      const { position, bearing } = trainAt(track, now, glideMs, network)
      return {
        type: 'Feature',
        properties: { color: colors.get(track.routeId) ?? TRAIN_CORE_COLOR, bearing },
        geometry: { type: 'Point', coordinates: [position.lng, position.lat] },
      }
    }),
  }
}

/** A train seen from above: a rounded capsule in the line color, nose up (north), headlight at the front. */
function capsuleIcon(color: string): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = CAPSULE_WIDTH_PX
  canvas.height = CAPSULE_HEIGHT_PX
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('2D canvas is not available for the train icon')
  }
  const rim = 3
  const width = CAPSULE_WIDTH_PX - rim * 2
  const height = CAPSULE_HEIGHT_PX - rim * 2
  ctx.beginPath()
  ctx.roundRect(rim, rim, width, height, width / 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.lineWidth = rim
  ctx.strokeStyle = CAPSULE_RIM
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(CAPSULE_WIDTH_PX / 2, rim + width / 2, width * 0.28, 0, Math.PI * 2)
  ctx.fillStyle = HEADLIGHT_COLOR
  ctx.fill()
  return ctx.getImageData(0, 0, CAPSULE_WIDTH_PX, CAPSULE_HEIGHT_PX)
}

/** Subway lines in their MBTA colors, drawn above the roads (and below `beforeLayerId`, if given). */
export function addLineLayers(map: MapLibreMap, lines: readonly Line[], beforeLayerId?: string): void {
  map.addSource(LINES_SOURCE, { type: 'geojson', data: linesCollection(lines) })
  const before = beforeLayerId && map.getLayer(beforeLayerId) ? beforeLayerId : undefined
  map.addLayer(
    {
      id: 'subway-lines',
      type: 'line',
      source: LINES_SOURCE,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ['get', 'color'],
        'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 11, 2, 16, 8],
      },
    },
    before,
  )
}

/** Each train is a soft glow under a line-colored capsule whose headlight shows which way it's heading. */
export function addTrainLayers(map: MapLibreMap, lines: readonly Line[]): void {
  map.addSource(TRAINS_SOURCE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  map.addLayer({
    id: 'train-glow',
    type: 'circle',
    source: TRAINS_SOURCE,
    paint: {
      'circle-color': ['get', 'color'],
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 10, 16, 24],
      'circle-blur': 0.8,
      'circle-opacity': 0.7,
    },
  })
  const colors = new Set([...lines.map((line) => line.color), TRAIN_CORE_COLOR])
  colors.forEach((color) => map.addImage(capsuleImageName(color), capsuleIcon(color), { pixelRatio: CAPSULE_PIXEL_RATIO }))
  map.addLayer({
    id: 'train-capsules',
    type: 'symbol',
    source: TRAINS_SOURCE,
    layout: {
      'icon-image': ['concat', 'train-', ['slice', ['get', 'color'], 1]],
      'icon-size': ['interpolate', ['linear'], ['zoom'], 11, 0.55, 16, 1.3],
      'icon-rotate': ['get', 'bearing'],
      'icon-rotation-alignment': 'map',
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  })
}

export function setTrains(map: MapLibreMap, data: FeatureCollection<Point>): void {
  map.getSource<GeoJSONSource>(TRAINS_SOURCE)?.setData(data)
}
