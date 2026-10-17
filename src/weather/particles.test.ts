import { describe, expect, test } from 'vitest'
import { createParticles, particleCount, stepParticles } from './particles'

const AREA = 1000 * 1000

describe('particleCount', () => {
  test.each(['clear', 'cloudy', 'fog'] as const)('draws no particles for %s', (kind) => {
    expect(particleCount(kind, 1, AREA)).toBe(0)
  })

  test('draws more drops in heavy rain than light rain', () => {
    expect(particleCount('rain', 1, AREA)).toBeGreaterThan(particleCount('rain', 0.35, AREA))
  })

  test('scales with the size of the wall', () => {
    expect(particleCount('snow', 1, AREA * 4)).toBeGreaterThan(particleCount('snow', 1, AREA))
  })
})

describe('stepParticles', () => {
  const size = { width: 100, height: 100 }
  const fixedRandom = () => 0.5

  test('moves particles down and along the wind', () => {
    const [p] = createParticles('rain', 1, size, fixedRandom)
    const [next] = stepParticles([p], 'rain', 0.01, 50, size, fixedRandom)
    expect(next.y).toBeGreaterThan(p.y)
    expect(next.x).toBeGreaterThan(p.x)
  })

  test('recycles a particle that falls off the bottom back to the top', () => {
    const [p] = createParticles('rain', 1, size, fixedRandom)
    const [next] = stepParticles([{ ...p, y: 99 }], 'rain', 1, 0, size, fixedRandom)
    expect(next.y).toBeLessThan(0)
  })

  test('wraps particles blown off one side onto the other', () => {
    const [p] = createParticles('snow', 1, size, fixedRandom)
    const [next] = stepParticles([{ ...p, x: 99 }], 'snow', 0.1, 500, size, fixedRandom)
    expect(next.x).toBeGreaterThanOrEqual(0)
    expect(next.x).toBeLessThan(100)
  })

  test('does not modify the input particles', () => {
    const particles = createParticles('rain', 1, size, fixedRandom)
    const snapshot = structuredClone(particles)
    stepParticles(particles, 'rain', 0.1, 10, size, fixedRandom)
    expect(particles).toEqual(snapshot)
  })
})
