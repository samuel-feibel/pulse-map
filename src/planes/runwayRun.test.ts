import { describe, expect, test } from 'vitest'
import { distanceMeters } from '../geo'
import { runAt, type RunwayRun } from './runwayRun'

const from = { lng: -71.0118, lat: 42.3511 }
const to = { lng: -70.9993, lat: 42.3769 }
const run = (kind: RunwayRun['kind']): RunwayRun => ({ kind, from, to, startedAt: 1000, durationMs: 10_000 })

describe('runAt', () => {
  test('starts at the runway threshold, heading down the runway', () => {
    const frame = runAt(run('landing'), 1000)!
    expect(distanceMeters(frame.position, from)).toBeLessThan(1)
    expect(frame.bearing).toBeGreaterThan(10)
    expect(frame.bearing).toBeLessThan(30)
  })

  test('a landing plane slows down and stops short of the far end', () => {
    const half = runAt(run('landing'), 6000)!
    const end = runAt(run('landing'), 10_999)!
    const covered = (p: { lng: number; lat: number }) => distanceMeters(from, p) / distanceMeters(from, to)
    expect(covered(half.position)).toBeGreaterThan(0.4)
    expect(covered(end.position)).toBeLessThan(0.9)
  })

  test('a departing plane speeds up and reaches the far end', () => {
    const half = runAt(run('takeoff'), 6000)!
    const end = runAt(run('takeoff'), 10_999)!
    expect(distanceMeters(from, half.position)).toBeLessThan(distanceMeters(from, to) / 2)
    expect(distanceMeters(end.position, to)).toBeLessThan(50)
  })

  test('is over once its time is up', () => {
    expect(runAt(run('takeoff'), 11_001)).toBeNull()
  })
})
