import type { LngLat } from './geo'

/** TD Garden, the center of the wall. */
export const CENTER: LngLat = { lng: -71.0621, lat: 42.3662 }

/** Harvard Square, which must stay on the wall (the west side). */
export const HARVARD_SQUARE: LngLat = { lng: -71.1189, lat: 42.3734 }

/** Breathing room past the farthest must-see point, so approaching planes and their labels fit. */
export const FRAME_MARGIN_METERS = 600

/** Free OpenStreetMap vector tiles (OpenMapTiles schema), no API key required. */
export const TILES_URL = 'https://tiles.openfreemap.org/planet'
