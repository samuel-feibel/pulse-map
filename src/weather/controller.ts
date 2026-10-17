import type { LngLat } from '../geo'
import { applyLighting, type AtmosphereElements } from './atmosphere'
import { createLightning } from './lightning'
import { fetchWeather } from './openMeteo'
import {
  nextOption,
  parseOverrides,
  SKY_PRESETS,
  WEATHER_PRESETS,
  type Overrides,
  type SkyPreset,
  type WeatherPreset,
} from './overrides'
import { lightingForSunAltitude } from './sky'
import type { Weather } from './types'
import type { ReportDemo } from '../ui/demoBadge'
import { createWeatherCanvas } from './weatherCanvas'

/** Open-Meteo refreshes current conditions every 15 minutes. */
const WEATHER_POLL_MS = 10 * 60_000
const WEATHER_RETRY_MS = 60_000

export interface WeatherElements extends AtmosphereElements {
  readonly canvas: HTMLCanvasElement
  readonly flash: HTMLElement
}

const WEATHER_NAMES = Object.keys(WEATHER_PRESETS) as WeatherPreset[]
const SKY_NAMES = Object.keys(SKY_PRESETS) as SkyPreset[]

/**
 * Live weather and daylight for the wall. For trying things out:
 * `?weather=rain&sky=dusk`, or press W / S to cycle weather and sky presets.
 */
export function startWeather(elements: WeatherElements, location: LngLat, reportDemo: ReportDemo): void {
  const canvas = createWeatherCanvas(elements.canvas)
  const lightning = createLightning(elements.flash, canvas.strike)
  let overrides: Overrides = parseOverrides(window.location.search)
  let live: Weather | null = null

  const refresh = (): void => {
    const weather = overrides.weather ? WEATHER_PRESETS[overrides.weather] : (live ?? WEATHER_PRESETS.clear)
    // Live mode stays in full daylight for now: real night dimming made the wall too dark.
    // `sunAltitudeDegrees` in sky.ts is ready for when night gets a brighter treatment.
    const altitude = SKY_PRESETS[overrides.sky ?? 'day']
    canvas.setWeather(weather)
    reportDemo('weather', overrides.weather ? `Weather: ${overrides.weather}` : null)
    reportDemo('sky', overrides.sky ? `Sky: ${overrides.sky}` : null)
    lightning.setActive(weather.kind === 'storm')
    applyLighting(elements, lightingForSunAltitude(altitude))
  }

  const poll = async (): Promise<void> => {
    let delay = WEATHER_POLL_MS
    try {
      live = await fetchWeather(location)
      refresh()
    } catch (error) {
      delay = WEATHER_RETRY_MS
      console.error('Weather update failed; keeping the last conditions.', error)
    }
    window.setTimeout(poll, delay)
  }

  window.addEventListener('keydown', (event) => {
    if (event.key === 'w') {
      overrides = { ...overrides, weather: nextOption(overrides.weather, WEATHER_NAMES) }
    } else if (event.key === 's') {
      overrides = { ...overrides, sky: nextOption(overrides.sky, SKY_NAMES) }
    } else {
      return
    }
    refresh()
  })

  refresh()
  void poll()
}
