import type { LngLat } from '../geo'
import { cached, DAY_MS } from '../net/cache'
import { fetchMbta, SUBWAY_ROUTE_IDS } from './client'
import { numberOrNull, readDocument } from './jsonApi'

export interface Station {
  readonly id: string
  readonly position: LngLat
}

export function parseStations(body: unknown): Station[] {
  return readDocument(body).data.flatMap((resource): Station[] => {
    const lat = numberOrNull(resource.attributes.latitude)
    const lng = numberOrNull(resource.attributes.longitude)
    return lat === null || lng === null ? [] : [{ id: resource.id, position: { lng, lat } }]
  })
}

/** Stations rarely change, so they're cached for a day instead of fetched on every page load. */
export const fetchStations = (): Promise<Station[]> => cached('mbta-stations', DAY_MS, loadStations)

/** Filtering by route returns parent stations, one per station rather than per platform. */
async function loadStations(): Promise<Station[]> {
  const body = await fetchMbta('/stops', {
    'filter[route]': SUBWAY_ROUTE_IDS.join(','),
    'fields[stop]': 'latitude,longitude',
  })
  return parseStations(body)
}
