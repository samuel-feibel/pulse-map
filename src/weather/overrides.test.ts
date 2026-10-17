import { describe, expect, test } from 'vitest'
import { nextOption, parseOverrides, SKY_PRESETS, WEATHER_PRESETS } from './overrides'

describe('parseOverrides', () => {
  test('reads known weather and sky presets from the query string', () => {
    expect(parseOverrides('?weather=snow&sky=dusk')).toEqual({ weather: 'snow', sky: 'dusk' })
  })

  test('ignores unknown or missing values so the wall falls back to live data', () => {
    expect(parseOverrides('?weather=hail&sky=')).toEqual({ weather: null, sky: null })
    expect(parseOverrides('')).toEqual({ weather: null, sky: null })
  })
})

describe('nextOption', () => {
  const names = Object.keys(WEATHER_PRESETS)

  test('goes from live to the first preset', () => {
    expect(nextOption(null, names)).toBe(names[0])
  })

  test('goes from the last preset back to live', () => {
    expect(nextOption(names[names.length - 1], names)).toBeNull()
  })
})

describe('presets', () => {
  test('cover every kind of weather the wall can draw', () => {
    const kinds = new Set(Object.values(WEATHER_PRESETS).map((w) => w.kind))
    expect([...kinds].sort()).toEqual(['clear', 'cloudy', 'drizzle', 'fog', 'rain', 'snow', 'storm'])
  })

  test('include a daytime and a nighttime sky', () => {
    expect(SKY_PRESETS.day).toBeGreaterThan(0)
    expect(SKY_PRESETS.night).toBeLessThan(0)
  })
})
