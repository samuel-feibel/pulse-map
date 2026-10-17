import { describe, expect, test } from 'vitest'
import { parseAircraft } from './adsb'

const plane = (overrides: Record<string, unknown>) => ({
  hex: 'abc123',
  flight: 'DAL457  ',
  t: 'A321',
  lat: 42.36,
  lon: -71.02,
  alt_baro: 1200,
  gs: 140,
  track: 40,
  baro_rate: -700,
  seen_pos: 0.5,
  ...overrides,
})

describe('parseAircraft', () => {
  test('reads position, motion and identity', () => {
    expect(parseAircraft({ ac: [plane({})] })).toEqual([
      {
        id: 'abc123',
        callsign: 'DAL457',
        type: 'A321',
        position: { lng: -71.02, lat: 42.36 },
        isOnGround: false,
        altitudeFt: 1200,
        groundSpeedKt: 140,
        trackDeg: 40,
        verticalRateFpm: -700,
        positionAgeSec: 0.5,
      },
    ])
  })

  test('marks planes on the ground', () => {
    const [ac] = parseAircraft({ ac: [plane({ alt_baro: 'ground', baro_rate: undefined })] })
    expect(ac).toMatchObject({ isOnGround: true, altitudeFt: 0, verticalRateFpm: null })
  })

  test('treats placeholder callsigns as unknown', () => {
    expect(parseAircraft({ ac: [plane({ flight: '00000000' })] })[0].callsign).toBeNull()
    expect(parseAircraft({ ac: [plane({ flight: null })] })[0].callsign).toBeNull()
  })

  test("also reads adsb.fi's 'aircraft' list", () => {
    expect(parseAircraft({ aircraft: [plane({})] })).toHaveLength(1)
  })

  test('skips aircraft without a position', () => {
    expect(parseAircraft({ ac: [plane({ lat: undefined })] })).toEqual([])
  })

  test('throws on a response without an aircraft list', () => {
    expect(() => parseAircraft({})).toThrow()
  })
})
