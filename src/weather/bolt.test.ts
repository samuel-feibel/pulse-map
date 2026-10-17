import { describe, expect, test } from 'vitest'
import { createBolt } from './bolt'

/** Small deterministic PRNG so bolts are repeatable in tests. */
function seeded(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 2 ** 32
    return state / 2 ** 32
  }
}

const start = { x: 100, y: 0 }
const end = { x: 160, y: 400 }

describe('createBolt', () => {
  test('main channel runs from the cloud to the ground strike point', () => {
    const [main] = createBolt(start, end, seeded(1)).paths
    expect(main[0]).toEqual(start)
    expect(main[main.length - 1]).toEqual(end)
  })

  test('main channel is jagged, not a straight line', () => {
    const [main] = createBolt(start, end, seeded(2)).paths
    expect(main.length).toBeGreaterThan(10)
    const offLine = main.some((p) => Math.abs(p.x - (start.x + ((end.x - start.x) * p.y) / end.y)) > 2)
    expect(offLine).toBe(true)
  })

  test('every branch forks off a point on the main channel', () => {
    const [main, ...branches] = createBolt(start, end, seeded(3)).paths
    expect(branches.length).toBeGreaterThan(0)
    branches.forEach((branch) => expect(main).toContainEqual(branch[0]))
  })

  test('is repeatable for the same random source', () => {
    expect(createBolt(start, end, seeded(4))).toEqual(createBolt(start, end, seeded(4)))
  })
})
