import { describe, expect, test } from 'vitest'
import { extendTrail } from './trails'

const p = (lng: number) => ({ lng, lat: 42 })

describe('extendTrail', () => {
  test('adds a point once enough time has passed since the last one', () => {
    const trail = extendTrail([], p(0), 0)
    expect(extendTrail(trail, p(1), 200)).toHaveLength(1)
    expect(extendTrail(trail, p(1), 2000)).toHaveLength(2)
  })

  test('forgets points older than the trail length', () => {
    let trail = extendTrail([], p(0), 0)
    for (let t = 1000; t <= 60_000; t += 1000) {
      trail = extendTrail(trail, p(t), t)
    }
    expect(trail[0].at).toBeGreaterThan(60_000 - 31_000)
  })

  test('does not modify the existing trail', () => {
    const trail = extendTrail([], p(0), 0)
    extendTrail(trail, p(1), 5000)
    expect(trail).toHaveLength(1)
  })
})
