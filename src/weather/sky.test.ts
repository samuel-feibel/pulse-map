import { describe, expect, test } from 'vitest'
import { lightingForSunAltitude } from './sky'

describe('lightingForSunAltitude', () => {
  test('is full brightness with no warm tint in daytime', () => {
    expect(lightingForSunAltitude(40)).toEqual({ brightness: 1, warmth: 0 })
  })

  test('dims at night with no warm tint', () => {
    const night = lightingForSunAltitude(-30)
    expect(night.brightness).toBeLessThan(0.7)
    expect(night.warmth).toBe(0)
  })

  test('is warmest around sunrise and sunset', () => {
    expect(lightingForSunAltitude(0).warmth).toBeGreaterThan(lightingForSunAltitude(5).warmth)
    expect(lightingForSunAltitude(0).warmth).toBeGreaterThan(lightingForSunAltitude(-5).warmth)
  })

  test('gets steadily darker as the sun sets', () => {
    const levels = [10, 3, -3, -10].map((alt) => lightingForSunAltitude(alt).brightness)
    expect([...levels].sort((a, b) => b - a)).toEqual(levels)
  })
})
