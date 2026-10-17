import { describe, expect, test } from 'vitest'
import { parseCurrentWeather } from './openMeteo'

const response = {
  current: {
    weather_code: 63,
    cloud_cover: 80,
    wind_speed_10m: 20,
    wind_direction_10m: 270,
    temperature_2m: 12.5,
  },
}

describe('parseCurrentWeather', () => {
  test('reads condition, clouds and wind', () => {
    expect(parseCurrentWeather(response)).toEqual({
      kind: 'rain',
      intensity: expect.any(Number),
      cloudCover: 0.8,
      windSpeedKmh: 20,
      windFromDegrees: 270,
    })
  })

  test('defaults missing optional fields to calm and clear skies', () => {
    const weather = parseCurrentWeather({ current: { weather_code: 0 } })
    expect(weather).toMatchObject({ kind: 'clear', cloudCover: 0, windSpeedKmh: 0 })
  })

  test('throws when there is no current weather code', () => {
    expect(() => parseCurrentWeather({ current: {} })).toThrow()
    expect(() => parseCurrentWeather('nope')).toThrow()
  })
})
