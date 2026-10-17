import { describe, expect, test } from 'vitest'
import { runwayEvent } from './detect'
import { DEMO_ROUTES, demoAircraft } from './demo'

describe('demoAircraft', () => {
  test('always has a few planes in the air', () => {
    expect(demoAircraft(5_000).filter((a) => !a.isOnGround).length).toBeGreaterThanOrEqual(3)
  })

  test('includes an arrival and a departure that trigger runway events', () => {
    const events = demoAircraft(1_000).map((a) => runwayEvent(null, a))
    expect(events).toContain('landing')
    expect(demoAircraft(21_000).map((a) => runwayEvent(null, a))).toContain('takeoff')
  })

  test('has a known route for every scripted arrival and departure', () => {
    const movers = demoAircraft(1_000).filter((a) => runwayEvent(null, a) !== null)
    movers.forEach((a) => expect(DEMO_ROUTES.get(a.callsign ?? '')).toBeDefined())
  })
})
