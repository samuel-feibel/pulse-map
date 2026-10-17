import { describe, expect, test } from 'vitest'
import { CITIES, cityFromUrl } from './index'

describe('cityFromUrl', () => {
  test('picks the city named in ?city=', () => {
    expect(cityFromUrl('?city=sf').id).toBe('sf')
    expect(cityFromUrl('?city=boston').id).toBe('boston')
  })

  test('falls back to Boston when no city, or an unknown one, is given', () => {
    expect(cityFromUrl('').id).toBe('boston')
    expect(cityFromUrl('?city=atlantis').id).toBe('boston')
  })
})

describe('CITIES', () => {
  test('have unique ids', () => {
    const ids = CITIES.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('each have at least one place to frame', () => {
    CITIES.forEach((city) => expect(city.frame.mustShow.length).toBeGreaterThan(0))
  })
})
