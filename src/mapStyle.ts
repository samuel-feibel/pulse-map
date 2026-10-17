import type {
  ExpressionSpecification,
  FilterSpecification,
  LayerSpecification,
  StyleSpecification,
} from 'maplibre-gl'

/** Free OpenStreetMap vector tiles (OpenMapTiles schema), worldwide, no API key required. */
const TILES_URL = 'https://tiles.openfreemap.org/planet'

export const COLORS = {
  background: '#000000',
  water: '#1d4f91',
  park: '#1e6b3a',
  road: '#8c8c8c',
} as const

const SOURCE = 'openmaptiles'

const MAJOR_ROADS = ['motorway', 'trunk', 'primary']
const MID_ROADS = ['secondary', 'tertiary']
const MINOR_ROADS = ['minor']

/** Road width in pixels at a given zoom, tiered by road class. */
function roadWidth(major: number, mid: number, minor: number): ExpressionSpecification {
  return ['match', ['get', 'class'], MAJOR_ROADS, major, MID_ROADS, mid, minor]
}

const notTunnel: FilterSpecification = ['!=', ['get', 'brunnel'], 'tunnel']

const layers: LayerSpecification[] = [
  {
    id: 'background',
    type: 'background',
    paint: { 'background-color': COLORS.background },
  },
  {
    id: 'park',
    type: 'fill',
    source: SOURCE,
    'source-layer': 'park',
    paint: { 'fill-color': COLORS.park },
  },
  {
    id: 'greenery',
    type: 'fill',
    source: SOURCE,
    'source-layer': 'landcover',
    filter: ['match', ['get', 'class'], ['grass', 'wood'], true, false],
    paint: { 'fill-color': COLORS.park },
  },
  {
    id: 'water',
    type: 'fill',
    source: SOURCE,
    'source-layer': 'water',
    filter: notTunnel,
    paint: { 'fill-color': COLORS.water },
  },
  {
    id: 'waterway',
    type: 'line',
    source: SOURCE,
    'source-layer': 'waterway',
    filter: notTunnel,
    paint: { 'line-color': COLORS.water, 'line-width': 1.5 },
  },
  {
    // Underground roads (e.g. the Big Dig) are hidden so only what you'd see from above is drawn.
    id: 'roads',
    type: 'line',
    source: SOURCE,
    'source-layer': 'transportation',
    filter: [
      'all',
      notTunnel,
      ['match', ['get', 'class'], [...MAJOR_ROADS, ...MID_ROADS, ...MINOR_ROADS], true, false],
    ],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': COLORS.road,
      'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 11, roadWidth(1.4, 0.8, 0.3), 16, roadWidth(8, 5, 2.5)],
    },
  },
]

/** Projector-friendly style: black ground, blue water, green parks, plain road lines, no labels. */
export function minimalStyle(): StyleSpecification {
  return {
    version: 8,
    sources: { [SOURCE]: { type: 'vector', url: TILES_URL } },
    layers,
  }
}
