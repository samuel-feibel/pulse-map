import { getPosition } from 'suncalc'
import type { LngLat } from '../geo'
import type { Lighting } from './types'

/** Sun altitude (degrees) above which it is full daylight. */
const DAY_ALTITUDE = 6
/** Sun altitude below which it is full night (end of nautical twilight). */
const NIGHT_ALTITUDE = -12
const NIGHT_BRIGHTNESS = 0.55
/** How far (degrees) either side of the horizon the warm tint reaches. */
const GOLDEN_SPAN = 8

const clamp01 = (value: number): number => Math.min(Math.max(value, 0), 1)

export function lightingForSunAltitude(altitudeDegrees: number): Lighting {
  const daylight = clamp01((altitudeDegrees - NIGHT_ALTITUDE) / (DAY_ALTITUDE - NIGHT_ALTITUDE))
  return {
    brightness: NIGHT_BRIGHTNESS + (1 - NIGHT_BRIGHTNESS) * daylight,
    warmth: clamp01(1 - Math.abs(altitudeDegrees) / GOLDEN_SPAN),
  }
}

export function sunAltitudeDegrees(date: Date, location: LngLat): number {
  const { altitude } = getPosition(date, location.lat, location.lng)
  return (altitude * 180) / Math.PI
}
