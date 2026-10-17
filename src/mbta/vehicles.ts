import type { Vehicle } from '../transit/types'
import { fetchMbta } from './client'
import { numberOrNull, readDocument, relationshipId } from './jsonApi'

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

export async function fetchVehicles(routeIds: readonly string[]): Promise<Vehicle[]> {
  const body = await fetchMbta('/vehicles', {
    'filter[route]': routeIds.join(','),
    'fields[vehicle]': 'latitude,longitude,bearing,direction_id',
  })
  return parseVehicles(body)
}
