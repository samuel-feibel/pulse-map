import type { Condition } from './types'

const LIGHT = 0.35
const MODERATE = 0.65
const HEAVY = 1

/** WMO weather interpretation codes, as used by Open-Meteo. */
const CONDITIONS: Readonly<Record<number, Condition>> = {
  0: { kind: 'clear', intensity: 0 },
  1: { kind: 'clear', intensity: 0 },
  2: { kind: 'cloudy', intensity: 0 },
  3: { kind: 'cloudy', intensity: 0 },
  45: { kind: 'fog', intensity: MODERATE },
  48: { kind: 'fog', intensity: HEAVY },
  51: { kind: 'drizzle', intensity: LIGHT },
  53: { kind: 'drizzle', intensity: MODERATE },
  55: { kind: 'drizzle', intensity: HEAVY },
  56: { kind: 'drizzle', intensity: LIGHT },
  57: { kind: 'drizzle', intensity: HEAVY },
  61: { kind: 'rain', intensity: LIGHT },
  63: { kind: 'rain', intensity: MODERATE },
  65: { kind: 'rain', intensity: HEAVY },
  66: { kind: 'rain', intensity: LIGHT },
  67: { kind: 'rain', intensity: HEAVY },
  71: { kind: 'snow', intensity: LIGHT },
  73: { kind: 'snow', intensity: MODERATE },
  75: { kind: 'snow', intensity: HEAVY },
  77: { kind: 'snow', intensity: LIGHT },
  80: { kind: 'rain', intensity: LIGHT },
  81: { kind: 'rain', intensity: MODERATE },
  82: { kind: 'rain', intensity: HEAVY },
  85: { kind: 'snow', intensity: LIGHT },
  86: { kind: 'snow', intensity: HEAVY },
  95: { kind: 'storm', intensity: MODERATE },
  96: { kind: 'storm', intensity: HEAVY },
  99: { kind: 'storm', intensity: HEAVY },
}

const UNKNOWN: Condition = { kind: 'clear', intensity: 0 }

export const classifyWeatherCode = (code: number): Condition => CONDITIONS[code] ?? UNKNOWN
