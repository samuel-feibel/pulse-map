import { describe, expect, test } from 'vitest'
import { runwayEvent as eventAt } from './detect'
import type { Aircraft } from './types'

const LOGAN_REFERENCE = { lng: -71.0096, lat: 42.3656 }
const runwayEvent = (previous: Aircraft | null, next: Aircraft) => eventAt(previous, next, LOGAN_REFERENCE)

const nearLogan = { lng: -71.012, lat: 42.355 }
const aircraft = (overrides: Partial<Aircraft> = {}): Aircraft => ({
  id: 'a1',
  callsign: 'DAL457',
  type: 'A321',
  position: nearLogan,
  isOnGround: false,
  altitudeFt: 900,
  groundSpeedKt: 140,
  trackDeg: 40,
  verticalRateFpm: -700,
  positionAgeSec: 0,
  ...overrides,
})

describe('runwayEvent', () => {
  test('spots a plane low and descending near Logan as landing', () => {
    expect(runwayEvent(null, aircraft())).toBe('landing')
  })

  test('spots a plane low and climbing near Logan as taking off', () => {
    expect(runwayEvent(null, aircraft({ verticalRateFpm: 1800 }))).toBe('takeoff')
  })

  test('spots a plane that has just touched down', () => {
    const touchdown = aircraft({ isOnGround: true, altitudeFt: 0, verticalRateFpm: null })
    expect(runwayEvent(aircraft({ altitudeFt: 200 }), touchdown)).toBe('landing')
  })

  test('ignores planes at cruising height, far away, or taxiing', () => {
    expect(runwayEvent(null, aircraft({ altitudeFt: 9000 }))).toBeNull()
    expect(runwayEvent(null, aircraft({ position: { lng: -71.4, lat: 42.6 } }))).toBeNull()
    const taxiing = aircraft({ isOnGround: true, altitudeFt: 0, verticalRateFpm: null, groundSpeedKt: 12 })
    expect(runwayEvent(taxiing, taxiing)).toBeNull()
  })

  test('ignores level flight at low altitude', () => {
    expect(runwayEvent(null, aircraft({ verticalRateFpm: 0 }))).toBeNull()
  })
})
