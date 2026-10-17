import type { LngLat } from '../geo'

export interface Aircraft {
  /** ICAO 24-bit address (hex), stable for the airframe. */
  readonly id: string
  readonly callsign: string | null
  /** ICAO type designator, e.g. 'B738'. */
  readonly type: string | null
  readonly position: LngLat
  readonly isOnGround: boolean
  readonly altitudeFt: number
  readonly groundSpeedKt: number
  readonly trackDeg: number | null
  readonly verticalRateFpm: number | null
  /** How old the reported position already was when fetched. */
  readonly positionAgeSec: number
}

export type RunwayEventKind = 'takeoff' | 'landing'
