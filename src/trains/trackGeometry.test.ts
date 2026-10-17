import { describe, expect, test } from 'vitest'
import { distanceMeters } from '../geo'
import { buildTrack, pointAlong, projectOnto, snapToRoute } from './trackGeometry'

// An L-shaped track: 1 km east, then 1 km north (roughly, at Boston's latitude).
const corner = { lng: -71.0, lat: 42.36 }
const start = { lng: -71.0 - 0.01216, lat: 42.36 }
const end = { lng: -71.0, lat: 42.36 + 0.009 }
const track = buildTrack([
  [start.lng, start.lat],
  [corner.lng, corner.lat],
  [end.lng, end.lat],
])

describe('buildTrack', () => {
  test('measures the track length along its bends', () => {
    expect(track.length).toBeCloseTo(2000, -2)
  })
})

describe('projectOnto', () => {
  test('finds how far along the track a nearby point is, and how far off it', () => {
    const nearCorner = { lng: corner.lng + 0.0005, lat: corner.lat + 0.0003 }
    const { along, offset } = projectOnto(track, nearCorner)
    expect(along).toBeGreaterThan(900)
    expect(along).toBeLessThan(1100)
    expect(offset).toBeLessThan(60)
  })
})

describe('pointAlong', () => {
  test('follows the bend instead of cutting the corner', () => {
    const { position } = pointAlong(track, 1000)
    expect(distanceMeters(position, corner)).toBeLessThan(15)
  })

  test('reports the direction of the track at that point', () => {
    expect(pointAlong(track, 500).bearing).toBeCloseTo(90, -1)
    expect(pointAlong(track, 1500).bearing).toBeCloseTo(0, -1)
  })

  test('clamps to the ends of the track', () => {
    expect(distanceMeters(pointAlong(track, -50).position, start)).toBeLessThan(1)
    expect(distanceMeters(pointAlong(track, 99_999).position, end)).toBeLessThan(1)
  })
})

describe('snapToRoute', () => {
  const branch = buildTrack([
    [start.lng, start.lat],
    [start.lng, start.lat - 0.009],
  ])

  test('picks the branch the train is actually on', () => {
    const onBranch = { lng: start.lng + 0.0001, lat: start.lat - 0.006 }
    expect(snapToRoute([track, branch], onBranch)?.trackIndex).toBe(1)
  })

  test('gives up when the train is far from every track (e.g. in a yard)', () => {
    expect(snapToRoute([track, branch], { lng: -71.2, lat: 42.5 })).toBeNull()
  })
})
