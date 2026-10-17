import type { LngLat } from '../geo'
import type { Runway } from './runways'

/** An airport whose takeoffs and landings get runway runs and call-outs. */
export interface Airport {
  /** IATA code, used to pick the right end of a looked-up route (e.g. 'BOS'). */
  readonly code: string
  /** Airport reference point; planes near here and low are treated as arriving or departing. */
  readonly reference: LngLat
  readonly runways: readonly Runway[]
  /** Runway ends the `?planes=demo` traffic uses: arrivals land on one, departures take off from the other. */
  readonly demo: { readonly arrivalRunway: string; readonly departureRunway: string }
}
