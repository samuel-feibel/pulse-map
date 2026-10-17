import { describe, expect, test } from 'vitest'
import { parseVehicles } from './vehicles'

const vehicle = (id: string, routeId: string, latitude: number | null, longitude: number | null) => ({
  type: 'vehicle',
  id,
  attributes: { latitude, longitude, bearing: 90, direction_id: 1 },
  relationships: { route: { data: { type: 'route', id: routeId } } },
})

describe('parseVehicles', () => {
  test('maps vehicles to id, route and position', () => {
    const result = parseVehicles({ data: [vehicle('v1', 'Orange', 42.36, -71.06)] })
    expect(result).toEqual([{ id: 'v1', routeId: 'Orange', position: { lng: -71.06, lat: 42.36 }, bearing: 90, directionId: 1 }])
  })

  test('skips vehicles without a position', () => {
    expect(parseVehicles({ data: [vehicle('v1', 'Red', null, null)] })).toEqual([])
  })

  test('throws on a response that is not JSON:API', () => {
    expect(() => parseVehicles('oops')).toThrow()
  })
})
