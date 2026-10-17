import type { LngLat } from '../geo'
import { politeFetch } from '../net/politeFetch'
import { classifyWeatherCode } from './classify'
import type { Weather } from './types'

const API_URL = 'https://api.open-meteo.com/v1/forecast'
const PERCENT = 100
/** Free tier allows 600/minute and 10,000/day; we need one every ten minutes. */
const MIN_INTERVAL_MS = 60_000

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const numberOr = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

export function parseCurrentWeather(body: unknown): Weather {
  const current = isRecord(body) ? body.current : undefined
  if (!isRecord(current) || typeof current.weather_code !== 'number') {
    throw new Error('Unexpected Open-Meteo response: missing current.weather_code')
  }
  return {
    ...classifyWeatherCode(current.weather_code),
    cloudCover: numberOr(current.cloud_cover, 0) / PERCENT,
    windSpeedKmh: numberOr(current.wind_speed_10m, 0),
    windFromDegrees: numberOr(current.wind_direction_10m, 0),
  }
}

/** Current conditions from Open-Meteo (free, no key). */
export async function fetchWeather(location: LngLat): Promise<Weather> {
  const url = new URL(API_URL)
  url.searchParams.set('latitude', String(location.lat))
  url.searchParams.set('longitude', String(location.lng))
  url.searchParams.set('current', 'weather_code,cloud_cover,wind_speed_10m,wind_direction_10m')

  const response = await politeFetch('open-meteo', url.toString(), MIN_INTERVAL_MS)
  return parseCurrentWeather(await response.json())
}
