import { describe, expect, test } from 'vitest'
import { distanceMeters } from '../geo'
import { centered, fieldOutline, rectangle, toLngLat, type Ring } from './shapes'

const width = (ring: Ring) => Math.max(...ring.map(([x]) => x)) - Math.min(...ring.map(([x]) => x))
const height = (ring: Ring) => Math.max(...ring.map(([, y]) => y)) - Math.min(...ring.map(([, y]) => y))
const isClosed = (ring: Ring) => ring[0][0] === ring.at(-1)![0] && ring[0][1] === ring.at(-1)![1]

describe('rectangle', () => {
  test('is a closed ring of the requested size, centered on the origin', () => {
    const ring = rectangle(600, 300, 0)
    expect(isClosed(ring)).toBe(true)
    expect(width(ring)).toBeCloseTo(600)
    expect(height(ring)).toBeCloseTo(300)
    expect(Math.min(...ring.map(([x]) => x))).toBeCloseTo(-300)
  })

  test('rounds its corners when given a corner radius', () => {
    const sharp = rectangle(600, 300, 0)
    const rounded = rectangle(600, 300, 80)
    expect(rounded.length).toBeGreaterThan(sharp.length)
    expect(width(rounded)).toBeCloseTo(600)
    // A rounded corner pulls the ring away from the exact corner point.
    expect(rounded.some(([x, y]) => x === 300 && y === 150)).toBe(false)
  })
})

describe('fieldOutline', () => {
  // A simple park: 330 ft down both lines, 400 ft to straightaway center.
  const WALL = [
    [0, 330],
    [45, 400],
    [90, 330],
  ] as const
  const [outfield, infield] = fieldOutline(WALL, 1, 45)

  test('starts and ends at home plate', () => {
    expect(outfield[0]).toEqual([0, 0])
    expect(isClosed(outfield)).toBe(true)
  })

  test('has a 90-foot infield diamond', () => {
    expect(isClosed(infield)).toBe(true)
    const [, first] = infield
    expect(Math.hypot(first[0], first[1])).toBeCloseTo(27.43, 1)
  })

  test('points center field along the given bearing', () => {
    const deepest = outfield.reduce((a, b) => (Math.hypot(...b) > Math.hypot(...a) ? b : a))
    const bearing = (Math.atan2(deepest[0], deepest[1]) * 180) / Math.PI
    expect(bearing).toBeGreaterThan(30)
    expect(bearing).toBeLessThan(60)
  })

  test("follows the park's own wall, e.g. a short right-field line", () => {
    const [field] = fieldOutline([[0, 339], [45, 391], [63, 415], [90, 309]], 1, 0)
    const rightFieldPole = field.at(-2)!
    expect(Math.hypot(...rightFieldPole)).toBeCloseTo(309 * 0.3048, 1)
    // With center field pointing up, the right-field line runs up and to the right at 45°.
    expect(rightFieldPole[0]).toBeCloseTo(rightFieldPole[1], 1)
  })

  test('scales up for visibility', () => {
    const [big] = fieldOutline(WALL, 4, 45)
    expect(Math.max(...big.map((p) => Math.hypot(...p)))).toBeCloseTo(4 * Math.max(...outfield.map((p) => Math.hypot(...p))))
  })
})

describe('toLngLat', () => {
  const anchor = { lng: -71.06, lat: 42.36 }

  test('places meter offsets at the right distance and direction from the anchor', () => {
    const [[lng, lat]] = toLngLat(anchor, [[1000, 0]])
    expect(lng).toBeGreaterThan(anchor.lng)
    expect(lat).toBeCloseTo(anchor.lat, 6)
    expect(distanceMeters(anchor, { lng, lat })).toBeCloseTo(1000, -1)
  })
})

describe('centered', () => {
  test('moves a group of outlines so their combined box is centered on the origin', () => {
    const [moved] = centered([[[0, 0], [100, 0], [100, 40], [0, 0]]])
    expect(Math.min(...moved.map(([x]) => x))).toBeCloseTo(-50)
    expect(Math.max(...moved.map(([, y]) => y))).toBeCloseTo(20)
  })
})
