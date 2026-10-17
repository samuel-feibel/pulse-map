import { describe, expect, test } from 'vitest'
import { rippleAt } from './ripples'

const ripple = { startedAt: 1000, durationMs: 2000, maxRadius: 100 }

describe('rippleAt', () => {
  test('starts small and fully visible', () => {
    const r = rippleAt(ripple, 1000)!
    expect(r.radius).toBeLessThan(20)
    expect(r.opacity).toBeCloseTo(1)
  })

  test('grows and fades as it spreads', () => {
    const early = rippleAt(ripple, 1500)!
    const late = rippleAt(ripple, 2500)!
    expect(late.radius).toBeGreaterThan(early.radius)
    expect(late.opacity).toBeLessThan(early.opacity)
  })

  test('is gone once its time is up, and not visible before it starts', () => {
    expect(rippleAt(ripple, 3000)).toBeNull()
    expect(rippleAt(ripple, 999)).toBeNull()
  })
})
