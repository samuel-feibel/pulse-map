import { describe, expect, test } from 'vitest'
import { windVector } from './wind'

describe('windVector', () => {
  test('a westerly wind (from 270°) blows toward the east', () => {
    const v = windVector(10, 270)
    expect(v.east).toBeCloseTo(10)
    expect(v.north).toBeCloseTo(0)
  })

  test('a northerly wind (from 0°) blows toward the south', () => {
    const v = windVector(10, 0)
    expect(v.east).toBeCloseTo(0)
    expect(v.north).toBeCloseTo(-10)
  })

  test('calm air has no movement', () => {
    expect(windVector(0, 123)).toEqual({ east: 0, north: 0 })
  })
})
