import type { Vehicle } from '../src/transit/types'

/** 511 reports direction as OB/IB (or N/S for the T line); GTFS direction 0 is outbound/north. */
const DIRECTIONS: Readonly<Record<string, number>> = { OB: 0, IB: 1, N: 0, S: 1 }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const number = (value: unknown): number | null => {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : typeof value === 'number' ? value : NaN
  return Number.isFinite(n) ? n : null
}

function toVehicle(activity: unknown, prefix: string): Vehicle | null {
  const journey = isRecord(activity) ? activity.MonitoredVehicleJourney : undefined
  if (!isRecord(journey) || typeof journey.LineRef !== 'string' || !isRecord(journey.VehicleLocation)) {
    return null
  }
  const lat = number(journey.VehicleLocation.Latitude)
  const lng = number(journey.VehicleLocation.Longitude)
  if (lat === null || lng === null || typeof journey.VehicleRef !== 'string') {
    return null
  }
  return {
    id: `${prefix}:${journey.VehicleRef}`,
    routeId: `${prefix}:${journey.LineRef}`,
    position: { lng, lat },
    bearing: number(journey.Bearing),
    directionId: typeof journey.DirectionRef === 'string' ? (DIRECTIONS[journey.DirectionRef] ?? null) : null,
  }
}

/** Vehicles from a 511 SIRI VehicleMonitoring JSON response. */
export function parseVehicleMonitoring(body: unknown, prefix: string): Vehicle[] {
  const delivery =
    isRecord(body) && isRecord(body.Siri) && isRecord(body.Siri.ServiceDelivery)
      ? body.Siri.ServiceDelivery.VehicleMonitoringDelivery
      : undefined
  if (!isRecord(delivery)) {
    throw new Error('Unexpected 511 response: missing VehicleMonitoringDelivery')
  }
  const activities = Array.isArray(delivery.VehicleActivity) ? delivery.VehicleActivity : []
  return activities.flatMap((a) => toVehicle(a, prefix) ?? [])
}
