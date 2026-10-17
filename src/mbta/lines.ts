import polyline from '@mapbox/polyline'
import { cached, DAY_MS } from '../net/cache'
import type { Line } from '../transit/types'
import { fetchMbta } from './client'
import { readDocument, relationshipId, type Resource } from './jsonApi'

const FALLBACK_COLOR = '#FFFFFF'

/** One line per route pattern. Direction 1 retraces direction 0, so only direction 0 is drawn. */
export function parseLines(body: unknown): Line[] {
  const { data, included } = readDocument(body)
  const byKey = new Map(included.map((r): [string, Resource] => [`${r.type}:${r.id}`, r]))
  const find = (type: string, id: string | null) => (id ? byKey.get(`${type}:${id}`) : undefined)

  return data
    .filter((pattern) => pattern.attributes.direction_id === 0)
    .flatMap((pattern): Line[] => {
      const routeId = relationshipId(pattern, 'route')
      const trip = find('trip', relationshipId(pattern, 'representative_trip'))
      const shape = trip && find('shape', relationshipId(trip, 'shape'))
      const encoded = shape?.attributes.polyline
      if (!routeId || typeof encoded !== 'string') {
        return []
      }
      const color = find('route', routeId)?.attributes.color
      return [
        {
          routeId,
          color: typeof color === 'string' ? `#${color}` : FALLBACK_COLOR,
          coordinates: polyline.decode(encoded).map(([lat, lng]) => [lng, lat] as const),
        },
      ]
    })
}

/** Line shapes rarely change, so they're cached for a day instead of fetched on every page load. */
export const fetchLines = (routeIds: readonly string[]): Promise<Line[]> =>
  cached(`mbta-lines:${routeIds.join(',')}`, DAY_MS, () => loadLines(routeIds))

async function loadLines(routeIds: readonly string[]): Promise<Line[]> {
  const body = await fetchMbta('/route_patterns', {
    'filter[route]': routeIds.join(','),
    'filter[canonical]': 'true',
    include: 'route,representative_trip.shape',
    'fields[route_pattern]': 'direction_id',
    'fields[route]': 'color',
    'fields[trip]': 'shape',
    'fields[shape]': 'polyline',
  })
  return parseLines(body)
}
