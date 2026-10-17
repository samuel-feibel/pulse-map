import { describe, expect, test } from 'vitest'
import polyline from '@mapbox/polyline'
import { parseLines } from './lines'

const redShape = polyline.encode([
  [42.39, -71.14],
  [42.36, -71.06],
])

const routePatternsResponse = {
  data: [
    {
      type: 'route_pattern',
      id: 'Red-1-0',
      attributes: { direction_id: 0 },
      relationships: {
        route: { data: { type: 'route', id: 'Red' } },
        representative_trip: { data: { type: 'trip', id: 'trip-red-0' } },
      },
    },
    {
      type: 'route_pattern',
      id: 'Red-1-1',
      attributes: { direction_id: 1 },
      relationships: {
        route: { data: { type: 'route', id: 'Red' } },
        representative_trip: { data: { type: 'trip', id: 'trip-red-1' } },
      },
    },
  ],
  included: [
    { type: 'trip', id: 'trip-red-0', relationships: { shape: { data: { type: 'shape', id: 'shape-red-0' } } } },
    { type: 'trip', id: 'trip-red-1', relationships: { shape: { data: { type: 'shape', id: 'shape-red-1' } } } },
    { type: 'shape', id: 'shape-red-0', attributes: { polyline: redShape } },
    { type: 'shape', id: 'shape-red-1', attributes: { polyline: redShape } },
    { type: 'route', id: 'Red', attributes: { color: 'DA291C' } },
  ],
}

describe('parseLines', () => {
  test('decodes one line per route pattern in direction 0, as [lng, lat]', () => {
    const lines = parseLines(routePatternsResponse)
    expect(lines).toHaveLength(1)
    expect(lines[0].routeId).toBe('Red')
    expect(lines[0].coordinates[0][0]).toBeCloseTo(-71.14, 5)
    expect(lines[0].coordinates[0][1]).toBeCloseTo(42.39, 5)
  })

  test('takes the line color from the included route', () => {
    expect(parseLines(routePatternsResponse)[0].color).toBe('#DA291C')
  })

  test('skips patterns whose shape is missing', () => {
    const withoutShapes = {
      ...routePatternsResponse,
      included: routePatternsResponse.included.filter((item) => item.type !== 'shape'),
    }
    expect(parseLines(withoutShapes)).toEqual([])
  })

  test('throws on a response that is not JSON:API', () => {
    expect(() => parseLines({ nope: true })).toThrow()
  })
})
