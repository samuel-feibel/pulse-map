import { describe, expect, test } from 'vitest'
import { WEATHER_PRESETS } from './overrides'
import { mistSettings } from './mist'

describe('mistSettings', () => {
  test('draws nothing under a clear sky', () => {
    expect(mistSettings({ ...WEATHER_PRESETS.clear, cloudCover: 0 }).count).toBe(0)
  })

  test('draws more clouds as cloud cover rises', () => {
    const partly = mistSettings({ ...WEATHER_PRESETS.cloudy, cloudCover: 0.4 })
    const overcast = mistSettings({ ...WEATHER_PRESETS.cloudy, cloudCover: 1 })
    expect(overcast.count).toBeGreaterThan(partly.count)
    expect(partly.alpha).toBeGreaterThan(0)
  })

  test('draws fog as visible, moving mist', () => {
    const fog = mistSettings(WEATHER_PRESETS.fog)
    expect(fog.count).toBeGreaterThan(0)
    expect(fog.alpha).toBeGreaterThan(0)
    expect(fog.minDriftPxPerSec).toBeGreaterThan(0)
  })

  test('leaves rain and snow without extra cloud layers', () => {
    expect(mistSettings(WEATHER_PRESETS.rain).count).toBe(0)
    expect(mistSettings(WEATHER_PRESETS.snow).count).toBe(0)
  })
})
