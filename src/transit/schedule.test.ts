import { describe, expect, test } from 'vitest'
import { distanceMeters } from '../geo'
import { buildTrack } from '../trains/trackGeometry'
import { scheduledVehicles, type Timetable } from './schedule'

// A straight north–south line about 2.2 km long; stop A at the south end, B at the north end.
const line = buildTrack([
  [-122.4, 37.7],
  [-122.4, 37.72],
])
const shapes = new Map([['BA:Y', line]])
const timetable: Timetable = {
  stops: { 'BA:A': [-122.4, 37.7], 'BA:B': [-122.4, 37.72] },
  trips: [
    { id: 'BA:north', lineId: 'BA:Y', stops: [['BA:A', 1000, 1060], ['BA:B', 1660, 1700]] },
    { id: 'BA:south', lineId: 'BA:Y', stops: [['BA:B', 2000, 2000], ['BA:A', 2600, 2600]] },
  ],
}
const at = (seconds: number) => scheduledVehicles(timetable, shapes, seconds)

describe('scheduledVehicles', () => {
  test('waits at a station between arriving and departing', () => {
    const [train] = at(1030)
    expect(distanceMeters(train.position, { lng: -122.4, lat: 37.7 })).toBeLessThan(5)
  })

  test('is partway along the track between stations, by time', () => {
    const [train] = at(1360)
    expect(distanceMeters(train.position, { lng: -122.4, lat: 37.71 })).toBeLessThan(20)
  })

  test('faces along the line for trips running in its order, and the other way otherwise', () => {
    expect(at(1360)[0].directionId).toBe(0)
    expect(at(2300)[0].directionId).toBe(1)
  })

  test('only shows trips that are currently running', () => {
    expect(at(900)).toEqual([])
    expect(at(1800).map((v) => v.id)).toEqual([])
    expect(at(2300).map((v) => v.id)).toEqual(['BA:south'])
  })

  test('skips trips whose line is not drawn', () => {
    expect(scheduledVehicles(timetable, new Map(), 1360)).toEqual([])
  })
})
