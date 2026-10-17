import { describe, expect, test } from 'vitest'
import { distanceMeters, halfWidthToInclude, squareBounds } from './geo'

const GARDEN = { lng: -71.0621, lat: 42.3662 }
const HARVARD = { lng: -71.1189, lat: 42.3734 }

describe('distanceMeters', () => {
  test('returns zero for the same point', () => {
    expect(distanceMeters(GARDEN, GARDEN)).toBe(0)
  })

  test('measures Garden to Harvard Square as roughly 4.7 km', () => {
    const d = distanceMeters(GARDEN, HARVARD)
    expect(d).toBeGreaterThan(4600)
    expect(d).toBeLessThan(4800)
  })
})

describe('squareBounds', () => {
  test('is centered on the given point', () => {
    const { west, east, south, north } = squareBounds(GARDEN, 1000)
    expect((west + east) / 2).toBeCloseTo(GARDEN.lng, 6)
    expect((south + north) / 2).toBeCloseTo(GARDEN.lat, 6)
  })

  test('spans the same distance east-west as north-south', () => {
    const b = squareBounds(GARDEN, 4700)
    const width = distanceMeters({ lng: b.west, lat: GARDEN.lat }, { lng: b.east, lat: GARDEN.lat })
    const height = distanceMeters({ lng: GARDEN.lng, lat: b.south }, { lng: GARDEN.lng, lat: b.north })
    expect(width).toBeCloseTo(9400, -1)
    expect(height).toBeCloseTo(9400, -1)
  })

  test('puts Harvard Square on the west edge when sized by its distance', () => {
    const b = squareBounds(GARDEN, distanceMeters(GARDEN, HARVARD))
    expect(b.west).toBeLessThanOrEqual(HARVARD.lng)
    expect(HARVARD.lng - b.west).toBeLessThan(0.01)
  })

  test('rejects a non-positive half-width', () => {
    expect(() => squareBounds(GARDEN, 0)).toThrow()
  })
})

describe('halfWidthToInclude', () => {
  const LOGAN_FAR_END = { lng: -70.9877, lat: 42.3602 }

  test('reaches the farthest point east-west or north-south, plus a margin', () => {
    const half = halfWidthToInclude(GARDEN, [HARVARD, LOGAN_FAR_END], 500)
    const b = squareBounds(GARDEN, half)
    expect(b.west).toBeLessThan(HARVARD.lng)
    expect(b.east).toBeGreaterThan(LOGAN_FAR_END.lng)
    const eastReach = distanceMeters(GARDEN, { lng: LOGAN_FAR_END.lng, lat: GARDEN.lat })
    expect(half).toBeCloseTo(eastReach + 500, -1)
  })

  test('uses the north-south distance when that is larger', () => {
    const north = { lng: GARDEN.lng, lat: GARDEN.lat + 0.05 }
    expect(halfWidthToInclude(GARDEN, [north], 0)).toBeCloseTo(distanceMeters(GARDEN, north), -1)
  })

  test('rejects an empty list of points', () => {
    expect(() => halfWidthToInclude(GARDEN, [], 0)).toThrow()
  })
})
