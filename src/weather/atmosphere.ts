import type { Lighting } from './types'

const WARM_TINT_MAX_OPACITY = 0.45

export interface AtmosphereElements {
  readonly map: HTMLElement
  readonly effects: HTMLElement
  readonly tint: HTMLElement
}

/**
 * Daylight mood for the wall: overall brightness and the sunset tint.
 * Weather never dims the map; it is drawn as visible effects on top instead.
 */
export function applyLighting(elements: AtmosphereElements, lighting: Lighting): void {
  const brightness = lighting.brightness.toFixed(3)
  elements.map.style.filter = `brightness(${brightness})`
  elements.effects.style.opacity = brightness
  elements.tint.style.opacity = (lighting.warmth * WARM_TINT_MAX_OPACITY).toFixed(3)
}
