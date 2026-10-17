export type WeatherKind = 'clear' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm'

export interface Condition {
  readonly kind: WeatherKind
  /** 0 (none) to 1 (heaviest). */
  readonly intensity: number
}

export interface Weather extends Condition {
  /** 0 (clear sky) to 1 (overcast). */
  readonly cloudCover: number
  readonly windSpeedKmh: number
  /** Meteorological convention: the direction the wind blows from. */
  readonly windFromDegrees: number
}

export interface Lighting {
  /** Multiplier for the whole wall, 1 = full brightness. */
  readonly brightness: number
  /** 0–1 strength of the warm sunrise/sunset tint. */
  readonly warmth: number
}
