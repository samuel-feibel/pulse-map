import type { FeatureCollection, Point } from 'geojson'
import type { Map as MapLibreMap } from 'maplibre-gl'
import type { Station } from '../mbta/stations'

const STATIONS_SOURCE = 'stations'
const STATION_FILL = '#000000'
const STATION_RING = '#FFFFFF'

function stationsCollection(stations: readonly Station[]): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: stations.map((station) => ({
      type: 'Feature',
      properties: { id: station.id },
      geometry: { type: 'Point', coordinates: [station.position.lng, station.position.lat] },
    })),
  }
}

/** Stations as small white rings, transit-map style. Add after the lines and before the trains. */
export function addStationLayers(map: MapLibreMap, stations: readonly Station[]): void {
  map.addSource(STATIONS_SOURCE, { type: 'geojson', data: stationsCollection(stations) })
  map.addLayer({
    id: 'stations',
    type: 'circle',
    source: STATIONS_SOURCE,
    paint: {
      'circle-color': STATION_FILL,
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 11, 2.5, 16, 6],
      'circle-stroke-color': STATION_RING,
      'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 11, 1.2, 16, 2],
    },
  })
}
