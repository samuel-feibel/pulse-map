import { describe, expect, test } from 'vitest'
import { aircraftName } from './aircraftTypes'

describe('aircraftName', () => {
  test('turns common ICAO type codes into familiar names', () => {
    expect(aircraftName('B738')).toBe('737-800')
    expect(aircraftName('A21N')).toBe('A321neo')
    expect(aircraftName('BCS3')).toBe('A220-300')
  })

  test('falls back to the raw code, or a generic name when unknown', () => {
    expect(aircraftName('ZZZ9')).toBe('ZZZ9')
    expect(aircraftName(null)).toBe('Aircraft')
  })
})
