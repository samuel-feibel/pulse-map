import { describe, expect, test } from 'vitest'
import { distanceMeters } from '../geo'
import type { Vehicle } from '../mbta/vehicles'
import { buildTrack } from './trackGeometry'
import { trainAt, updateTracks, type Network } from './tracker'

const DURATION = 10_000
const corner = { lng: -71.0, lat: 42.36 }
const start = { lng: -71.0 - 0.01216, lat: 42.36 }
const end = { lng: -71.0, lat: 42.36 + 0.009 }
const network: Network = new Map([
  [
    'Red',
    [
      buildTrack([
        [start.lng, start.lat],
        [corner.lng, corner.lat],
        [end.lng, end.lat],
      ]),
    ],
  ],
])
const none: Network = new Map()

const at = (id: string, position: { lng: number; lat: number }, directionId: number | null = 0): Vehicle => ({
  id,
  routeId: 'Red',
  position,
  bearing: null,
  directionId,
})

const beforeCorner = { lng: corner.lng - 0.0025, lat: corner.lat }
const afterCorner = { lng: corner.lng, lat: corner.lat + 0.0018 }

describe('updateTracks', () => {
  test('places a newly seen train on the track at its reported position', () => {
    const tracks = updateTracks(new Map(), [at('a', beforeCorner)], 0, DURATION, network)
    expect(distanceMeters(trainAt(tracks.get('a')!, 0, DURATION, network).position, beforeCorner)).toBeLessThan(5)
  })

  test('glides along the track around a bend instead of cutting the corner', () => {
    const first = updateTracks(new Map(), [at('a', beforeCorner)], 0, DURATION, network)
    const second = updateTracks(first, [at('a', afterCorner)], 10_000, DURATION, network)
    const midway = trainAt(second.get('a')!, 15_000, DURATION, network).position
    expect(distanceMeters(midway, corner)).toBeLessThan(15)
  })

  test('points trains in direction 0 along the track, and direction 1 the opposite way', () => {
    const outbound = updateTracks(new Map(), [at('a', beforeCorner, 0)], 0, DURATION, network)
    const inbound = updateTracks(new Map(), [at('a', beforeCorner, 1)], 0, DURATION, network)
    expect(trainAt(outbound.get('a')!, 0, DURATION, network).bearing).toBeCloseTo(90, -1)
    expect(trainAt(inbound.get('a')!, 0, DURATION, network).bearing).toBeCloseTo(270, -1)
  })

  test('jumps straight to the new spot when the move is too far to be real motion', () => {
    const first = updateTracks(new Map(), [at('a', start)], 0, DURATION, network)
    const far = { lng: -70.9, lat: 42.4 }
    const second = updateTracks(first, [at('a', far)], 10_000, DURATION, network)
    expect(distanceMeters(trainAt(second.get('a')!, 10_000, DURATION, network).position, far)).toBeLessThan(5)
  })

  test('glides in a straight line when the route has no track shape', () => {
    const a = { lng: -71.0, lat: 42.36 }
    const b = { lng: -71.002, lat: 42.36 }
    const first = updateTracks(new Map(), [at('a', a)], 0, DURATION, none)
    const second = updateTracks(first, [at('a', b)], 10_000, DURATION, none)
    expect(trainAt(second.get('a')!, 15_000, DURATION, none).position.lng).toBeCloseTo(-71.001, 6)
  })

  test('drops trains that are no longer reported', () => {
    const first = updateTracks(new Map(), [at('a', start), at('b', end)], 0, DURATION, network)
    const second = updateTracks(first, [at('b', end)], 10_000, DURATION, network)
    expect([...second.keys()]).toEqual(['b'])
  })

  test('does not modify the previous tracks', () => {
    const first = updateTracks(new Map(), [at('a', beforeCorner)], 0, DURATION, network)
    const snapshot = structuredClone([...first.entries()])
    updateTracks(first, [at('a', afterCorner)], 10_000, DURATION, network)
    expect([...first.entries()]).toEqual(snapshot)
  })
})
