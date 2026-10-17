import { describe, expect, test } from 'vitest'
import { distanceMeters } from '../geo'
import { displayPosition, trackAircraft } from './tracker'
import type { Aircraft } from './types'

const report = (lng: number, overrides: Partial<Aircraft> = {}): Aircraft => ({
  id: 'a1',
  callsign: 'JBU1',
  type: 'A320',
  position: { lng, lat: 42.36 },
  isOnGround: false,
  altitudeFt: 5000,
  groundSpeedKt: 200,
  trackDeg: 90,
  verticalRateFpm: 0,
  positionAgeSec: 0,
  ...overrides,
})

describe('trackAircraft', () => {
  test('a newly seen plane is drawn at its reported position', () => {
    const plane = trackAircraft(undefined, report(-71), 0)
    expect(distanceMeters(displayPosition(plane, 0), { lng: -71, lat: 42.36 })).toBeLessThan(1)
  })

  test('flies ahead between reports at its ground speed', () => {
    const plane = trackAircraft(undefined, report(-71), 0)
    expect(displayPosition(plane, 5000).lng).toBeGreaterThan(-71)
  })

  test('accounts for how old the report already was', () => {
    const fresh = trackAircraft(undefined, report(-71), 0)
    const stale = trackAircraft(undefined, report(-71, { positionAgeSec: 3 }), 0)
    expect(displayPosition(stale, 0).lng).toBeGreaterThan(displayPosition(fresh, 0).lng)
  })

  test('does not jump when a new report disagrees with the prediction, then settles on it', () => {
    const first = trackAircraft(undefined, report(-71), 0)
    const before = displayPosition(first, 5000)
    const second = trackAircraft(first, report(-70.99), 5000)
    expect(distanceMeters(displayPosition(second, 5000), before)).toBeLessThan(1)
    const settled = displayPosition(second, 10_000)
    const predicted = displayPosition(trackAircraft(undefined, report(-70.99), 5000), 10_000)
    expect(distanceMeters(settled, predicted)).toBeLessThan(1)
  })
})
