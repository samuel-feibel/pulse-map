import { describe, expect, test } from 'vitest'
import { parseVehicleMonitoring } from './siri'

const activity = (line: string | null, direction: string, lat: string, lng: string, ref = 'v1') => ({
  MonitoredVehicleJourney: {
    LineRef: line,
    DirectionRef: direction,
    VehicleLocation: { Latitude: lat, Longitude: lng },
    Bearing: '165.0000000000',
    VehicleRef: ref,
  },
})

const body = (activities: unknown[]) => ({
  Siri: { ServiceDelivery: { VehicleMonitoringDelivery: { VehicleActivity: activities } } },
})

describe('parseVehicleMonitoring', () => {
  test('reads position, line and heading, prefixing ids by agency', () => {
    const [v] = parseVehicleMonitoring(body([activity('PM', 'IB', '37.7996407', '-122.412453', '12')]), 'SF')
    expect(v).toEqual({
      id: 'SF:12',
      routeId: 'SF:PM',
      position: { lng: -122.412453, lat: 37.7996407 },
      bearing: 165,
      directionId: 1,
    })
  })

  test('maps outbound/northbound to direction 0 and inbound/southbound to 1', () => {
    const dirs = ['OB', 'IB', 'N', 'S', '??'].map(
      (d) => parseVehicleMonitoring(body([activity('T', d, '37.7', '-122.4')]), 'SF')[0].directionId,
    )
    expect(dirs).toEqual([0, 1, 0, 1, null])
  })

  test('skips vehicles without a line or position', () => {
    expect(parseVehicleMonitoring(body([activity(null, 'IB', '37.7', '-122.4'), activity('N', 'IB', '', '')]), 'SF')).toEqual([])
  })

  test('treats a feed with no vehicles (as BART sends) as an empty list', () => {
    expect(parseVehicleMonitoring({ Siri: { ServiceDelivery: { VehicleMonitoringDelivery: {} } } }, 'BA')).toEqual([])
  })

  test('throws on a response that is not SIRI', () => {
    expect(() => parseVehicleMonitoring({ nope: true }, 'SF')).toThrow()
  })
})
