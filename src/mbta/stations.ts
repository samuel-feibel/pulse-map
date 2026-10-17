import { cached, DAY_MS } from '../net/cache'
import type { Station } from '../transit/types'
import { fetchMbta } from './client'
import { numberOrNull, readDocument } from './jsonApi'

export function parseStations(body: unknown): Station[] {
  return readDocument(body).data.flatMap((resource): Station[] => {
    const lat = numberOrNull(resource.attributes.latitude)
    const lng = numberOrNull(resource.attributes.longitude)
    return lat === null || lng === null ? [] : [{ id: resource.id, position: { lng, lat } }]
  })
}

/** Stations rarely change, so they're cached for a day instead of fetched on every page load. */
export const fetchStations = (routeIds: readonly string[]): Promise<Station[]> =>
  cached(`mbta-stations:${routeIds.join(',')}`, DAY_MS, () => loadStations(routeIds))

/** Filtering by route returns parent stations, one per station rather than per platform. */
async function loadStations(routeIds: readonly string[]): Promise<Station[]> {
  const body = await fetchMbta('/stops', {
    'filter[route]': routeIds.join(','),
    'fields[stop]': 'latitude,longitude',
  })
  return parseStations(body)
}
