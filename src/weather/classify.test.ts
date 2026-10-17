import { describe, expect, test } from 'vitest'
import { classifyWeatherCode } from './classify'

describe('classifyWeatherCode', () => {
  test.each([
    [0, 'clear'],
    [1, 'clear'],
    [2, 'cloudy'],
    [3, 'cloudy'],
    [45, 'fog'],
    [48, 'fog'],
    [51, 'drizzle'],
    [57, 'drizzle'],
    [61, 'rain'],
    [67, 'rain'],
    [80, 'rain'],
    [71, 'snow'],
    [77, 'snow'],
    [86, 'snow'],
    [95, 'storm'],
    [99, 'storm'],
  ])('maps WMO code %i to %s', (code, kind) => {
    expect(classifyWeatherCode(code).kind).toBe(kind)
  })

  test('grades intensity from light to heavy', () => {
    const light = classifyWeatherCode(61).intensity
    const moderate = classifyWeatherCode(63).intensity
    const heavy = classifyWeatherCode(65).intensity
    expect(light).toBeLessThan(moderate)
    expect(moderate).toBeLessThan(heavy)
    expect(heavy).toBeLessThanOrEqual(1)
  })

  test('treats an unknown code as clear rather than failing', () => {
    expect(classifyWeatherCode(42)).toEqual({ kind: 'clear', intensity: 0 })
  })
})
