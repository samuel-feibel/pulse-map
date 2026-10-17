import { describe, expect, test } from 'vitest'
import { LOGAN } from '../cities/boston/airport'
import type { Airport } from './airport'
import { createDemoTraffic } from './demo'
import { runwayEvent } from './detect'

const demo = createDemoTraffic(LOGAN)
const eventsAt = (elapsedMs: number) => demo.aircraft(elapsedMs).map((a) => runwayEvent(null, a, LOGAN.reference))

describe('createDemoTraffic', () => {
  test('always has a few planes in the air', () => {
    expect(demo.aircraft(5_000).filter((a) => !a.isOnGround).length).toBeGreaterThanOrEqual(3)
  })

  test('includes an arrival and a departure that trigger runway events', () => {
    expect(eventsAt(1_000)).toContain('landing')
    expect(eventsAt(21_000)).toContain('takeoff')
  })

  test("routes every scripted arrival and departure through the city's airport", () => {
    const movers = demo.aircraft(1_000).filter((a) => runwayEvent(null, a, LOGAN.reference) !== null)
    movers.forEach((a) => {
      const route = demo.routes.get(a.callsign ?? '')
      expect([route?.origin, route?.destination]).toContain('BOS')
    })
  })

  test('refuses a demo runway the airport does not have', () => {
    const broken: Airport = { ...LOGAN, demo: { arrivalRunway: '99X', departureRunway: '22R' } }
    expect(() => createDemoTraffic(broken)).toThrow(/99X/)
  })
})
