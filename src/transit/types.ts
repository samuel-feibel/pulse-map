import type { LngLat } from '../geo'

/** One drawable rail line (a route, or one branch of it). */
export interface Line {
  readonly routeId: string
  readonly color: string
  /** [lng, lat] pairs, ready for GeoJSON, in the order direction-0 trains travel. */
  readonly coordinates: readonly (readonly [number, number])[]
}

export interface Station {
  readonly id: string
  readonly position: LngLat
}

export interface Vehicle {
  readonly id: string
  readonly routeId: string
  readonly position: LngLat
  readonly bearing: number | null
  /** 0 or 1: which way along the route the train is heading (0 follows the line's coordinate order). */
  readonly directionId: number | null
}

/** Where a city's live transit comes from (MBTA in Boston; e.g. 511.org in the Bay Area). */
export interface TransitProvider {
  /** Rail lines to draw. Slow-changing, so providers should cache them. */
  readonly loadLines: () => Promise<Line[]>
  readonly loadStations: () => Promise<Station[]>
  /** Current train positions. Omitted for agencies that publish none (trains then aren't drawn). */
  readonly fetchVehicles?: () => Promise<Vehicle[]>
  /** How often to poll `fetchVehicles` (default 10 s). Trains glide along their tracks in between. */
  readonly pollIntervalMs?: number
  /** For combined transit: the agencies inside, so each can be polled at its own pace. */
  readonly parts?: readonly TransitProvider[]
}
