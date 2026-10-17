import { describe, expect, test } from 'vitest'
import { parseRoute, routeLabel } from './routes'

const body = (origin: string, destination: string) => ({
  response: { flightroute: { origin: { iata_code: origin }, destination: { iata_code: destination } } },
})

describe('parseRoute', () => {
  test('reads origin and destination airport codes', () => {
    expect(parseRoute(body('DFW', 'BOS'))).toEqual({ origin: 'DFW', destination: 'BOS' })
  })

  test('returns null when the callsign is unknown', () => {
    expect(parseRoute({ response: 'unknown callsign' })).toBeNull()
  })
})

describe('routeLabel', () => {
  test('shows where a departing plane is headed', () => {
    expect(routeLabel({ origin: 'BOS', destination: 'ORD' }, 'takeoff')).toBe('→ ORD')
  })

  test('shows where an arriving plane came from', () => {
    expect(routeLabel({ origin: 'ATL', destination: 'BOS' }, 'landing')).toBe('← ATL')
  })

  test('shows nothing when the route does not involve Boston, since it is probably stale', () => {
    expect(routeLabel({ origin: 'DFW', destination: 'EWR' }, 'landing')).toBeNull()
  })

  test('shows nothing when Boston is on the wrong end for this movement', () => {
    expect(routeLabel({ origin: 'BOS', destination: 'ORD' }, 'landing')).toBeNull()
  })
})
