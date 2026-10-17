import { describe, expect, test } from 'vitest'
import { distanceMeters } from '../geo'
import { bearingDegrees, moveAlong, predictPosition } from './motion'

const start = { lng: -71.0, lat: 42.36 }

describe('moveAlong', () => {
  test('moves the given distance in the given direction', () => {
    const north = moveAlong(start, 0, 1000)
    expect(north.lat).toBeGreaterThan(start.lat)
    expect(north.lng).toBeCloseTo(start.lng, 6)
    expect(distanceMeters(start, north)).toBeCloseTo(1000, -1)
    expect(moveAlong(start, 90, 1000).lng).toBeGreaterThan(start.lng)
  })
})

describe('bearingDegrees', () => {
  test('points from one place to another, clockwise from north', () => {
    expect(bearingDegrees(start, moveAlong(start, 90, 500))).toBeCloseTo(90, 0)
    expect(bearingDegrees(start, moveAlong(start, 200, 500))).toBeCloseTo(200, 0)
  })
})

describe('predictPosition', () => {
  test('dead-reckons along the track at ground speed', () => {
    // 100 knots ≈ 51.4 m/s, so 10 seconds ≈ 514 m.
    const predicted = predictPosition(start, 90, 100, 10)
    expect(distanceMeters(start, predicted)).toBeCloseTo(514, -1)
  })

  test('stops extrapolating after a cap so stale planes do not fly off', () => {
    const capped = predictPosition(start, 90, 100, 600)
    expect(distanceMeters(start, capped)).toBeLessThan(1100)
  })

  test('stays put without a track', () => {
    expect(predictPosition(start, null, 100, 10)).toEqual(start)
  })
})
