import type { Weather } from './types'

/** Fake conditions for trying out the effects; `?weather=<name>` or the W key. */
export const WEATHER_PRESETS = {
  clear: { kind: 'clear', intensity: 0, cloudCover: 0, windSpeedKmh: 5, windFromDegrees: 270 },
  cloudy: { kind: 'cloudy', intensity: 0, cloudCover: 1, windSpeedKmh: 15, windFromDegrees: 270 },
  fog: { kind: 'fog', intensity: 1, cloudCover: 1, windSpeedKmh: 8, windFromDegrees: 90 },
  drizzle: { kind: 'drizzle', intensity: 0.65, cloudCover: 1, windSpeedKmh: 10, windFromDegrees: 270 },
  rain: { kind: 'rain', intensity: 0.65, cloudCover: 1, windSpeedKmh: 20, windFromDegrees: 270 },
  storm: { kind: 'storm', intensity: 1, cloudCover: 1, windSpeedKmh: 35, windFromDegrees: 240 },
  snow: { kind: 'snow', intensity: 0.65, cloudCover: 1, windSpeedKmh: 15, windFromDegrees: 315 },
} as const satisfies Record<string, Weather>

/** Sun altitudes (degrees) for trying out lighting; `?sky=<name>` or the S key. */
export const SKY_PRESETS = {
  day: 40,
  dusk: 0,
  night: -30,
  dawn: -4,
} as const satisfies Record<string, number>

export type WeatherPreset = keyof typeof WEATHER_PRESETS
export type SkyPreset = keyof typeof SKY_PRESETS

export interface Overrides {
  readonly weather: WeatherPreset | null
  readonly sky: SkyPreset | null
}

const pick = <K extends string>(value: string | null, options: Record<K, unknown>): K | null =>
  value !== null && Object.hasOwn(options, value) ? (value as K) : null

export function parseOverrides(search: string): Overrides {
  const params = new URLSearchParams(search)
  return {
    weather: pick(params.get('weather'), WEATHER_PRESETS),
    sky: pick(params.get('sky'), SKY_PRESETS),
  }
}

/** Cycles live → first preset → … → last preset → live. */
export function nextOption<K extends string>(current: K | null, names: readonly K[]): K | null {
  if (current === null) {
    return names[0] ?? null
  }
  const index = names.indexOf(current)
  return index >= 0 && index < names.length - 1 ? names[index + 1] : null
}
