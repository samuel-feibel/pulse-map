import { describe, expect, test } from 'vitest'
import { combineTransit } from './combine'
import type { Line, Station, TransitProvider, Vehicle } from './types'

const line = (routeId: string): Line => ({ routeId, color: '#fff', coordinates: [] })
const station = (id: string): Station => ({ id, position: { lng: 0, lat: 0 } })
const vehicle = (id: string): Vehicle => ({ id, routeId: 'r', position: { lng: 0, lat: 0 }, bearing: null, directionId: null })

const muni: TransitProvider = {
  loadLines: async () => [line('SF:N')],
  loadStations: async () => [station('SF:1')],
  fetchVehicles: async () => [vehicle('SF:9')],
  pollIntervalMs: 75_000,
}
const bart: TransitProvider = {
  loadLines: async () => [line('BA:2')],
  loadStations: async () => [station('BA:p1')],
}

describe('combineTransit', () => {
  const both = combineTransit([muni, bart])

  test('draws every agency’s lines and stations together', async () => {
    expect((await both.loadLines()).map((l) => l.routeId)).toEqual(['SF:N', 'BA:2'])
    expect((await both.loadStations()).map((s) => s.id)).toEqual(['SF:1', 'BA:p1'])
  })

  test('only polls agencies that have live vehicles, at the slowest of their intervals', async () => {
    expect((await both.fetchVehicles!()).map((v) => v.id)).toEqual(['SF:9'])
    expect(both.pollIntervalMs).toBe(75_000)
  })

  test('has no live vehicles when no agency does', () => {
    expect(combineTransit([bart]).fetchVehicles).toBeUndefined()
  })

  test('keeps the other agencies when one fails to load', async () => {
    const broken: TransitProvider = { loadLines: async () => Promise.reject(new Error('down')), loadStations: async () => [] }
    expect((await combineTransit([broken, bart]).loadLines()).map((l) => l.routeId)).toEqual(['BA:2'])
  })
})
