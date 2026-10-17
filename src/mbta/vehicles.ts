import type { LngLat } from '../geo'
import { fetchMbta, SUBWAY_ROUTE_IDS } from './client'
import { numberOrNull, readDocument, relationshipId } from './jsonApi'

export interface Vehicle {
  readonly id: string
  readonly routeId: string
  readonly position: LngLat
  readonly bearing: number | null
  /** 0 or 1: which way along the route the train is heading (0 follows the line's shape order). */
  readonly directionId: number | null
}

export function parseVehicles(body: unknown): Vehicle[] {
  return readDocument(body).data.flatMap((resource): Vehicle[] => {
    const routeId = relationshipId(resource, 'route')
    const lat = numberOrNull(resource.attributes.latitude)
    const lng = numberOrNull(resource.attributes.longitude)
    if (!routeId || lat === null || lng === null) {
      return []
    }
    return [
      {
        id: resource.id,
        routeId,
        position: { lng, lat },
        bearing: numberOrNull(resource.attributes.bearing),
        directionId: numberOrNull(resource.attributes.direction_id),
      },
    ]
  })
}

export async function fetchVehicles(): Promise<Vehicle[]> {
  const body = await fetchMbta('/vehicles', {
    'filter[route]': SUBWAY_ROUTE_IDS.join(','),
    'fields[vehicle]': 'latitude,longitude,bearing,direction_id',
  })
  return parseVehicles(body)
}
