import type { Feature, FeatureCollection, MultiLineString, Point, Polygon } from 'geojson'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import type { LngLat } from '../geo'
import { toLngLat, type Ring } from './shapes'
import { FILL_OPACITY, OUTLINE_WIDTH_PX } from './tuning'

const OUTLINE_SOURCE = 'sports-outlines'
const RIPPLE_SOURCE = 'sports-ripples'
const RIPPLE_STROKE_WIDTH = 3

/** First sports layer, so the subway lines can be slotted in beneath the venue outlines. */
export const SPORTS_BOTTOM_LAYER = 'sports-fills'

export interface OutlineFeature {
  readonly marker: LngLat
  readonly outline: readonly Ring[]
  readonly color: string
  readonly opacity: number
}

export interface RippleFeature {
  readonly marker: LngLat
  readonly color: string
  readonly radius: number
  readonly opacity: number
}

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }

/** Each venue becomes a filled shape (its outer ring) plus crisp edges (every ring, e.g. Fenway's infield). */
function outlineCollection(items: readonly OutlineFeature[]): FeatureCollection<Polygon | MultiLineString> {
  return {
    type: 'FeatureCollection',
    features: items.flatMap((item): Feature<Polygon | MultiLineString>[] => {
      const rings = item.outline.map((ring) => toLngLat(item.marker, ring))
      const properties = { color: item.color, opacity: item.opacity }
      return [
        { type: 'Feature', properties, geometry: { type: 'Polygon', coordinates: rings.slice(0, 1) } },
        { type: 'Feature', properties, geometry: { type: 'MultiLineString', coordinates: rings } },
      ]
    }),
  }
}

function rippleCollection(items: readonly RippleFeature[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: items.map((item) => ({
      type: 'Feature',
      properties: { color: item.color, radius: item.radius, opacity: item.opacity },
      geometry: { type: 'Point', coordinates: [item.marker.lng, item.marker.lat] },
    })),
  }
}

/** A filled venue outline for each game on, and rings that spread out when Boston scores. */
export function addSportsLayers(map: MapLibreMap): void {
  map.addSource(OUTLINE_SOURCE, { type: 'geojson', data: EMPTY })
  map.addSource(RIPPLE_SOURCE, { type: 'geojson', data: EMPTY })
  map.addLayer({
    id: SPORTS_BOTTOM_LAYER,
    type: 'fill',
    source: OUTLINE_SOURCE,
    filter: ['==', ['geometry-type'], 'Polygon'],
    paint: {
      'fill-color': ['get', 'color'],
      'fill-opacity': ['*', ['get', 'opacity'], FILL_OPACITY],
    },
  })
  map.addLayer({
    id: 'sports-outlines',
    type: 'line',
    source: OUTLINE_SOURCE,
    filter: ['!=', ['geometry-type'], 'Polygon'],
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: {
      'line-color': ['get', 'color'],
      'line-width': OUTLINE_WIDTH_PX,
      'line-opacity': ['get', 'opacity'],
    },
  })
  map.addLayer({
    id: 'sports-ripples',
    type: 'circle',
    source: RIPPLE_SOURCE,
    paint: {
      'circle-opacity': 0,
      'circle-radius': ['get', 'radius'],
      'circle-stroke-color': ['get', 'color'],
      'circle-stroke-width': RIPPLE_STROKE_WIDTH,
      'circle-stroke-opacity': ['get', 'opacity'],
    },
  })
}

export function setSportsFrame(map: MapLibreMap, outlines: readonly OutlineFeature[], ripples: readonly RippleFeature[]): void {
  map.getSource<GeoJSONSource>(OUTLINE_SOURCE)?.setData(outlineCollection(outlines))
  map.getSource<GeoJSONSource>(RIPPLE_SOURCE)?.setData(rippleCollection(ripples))
}
