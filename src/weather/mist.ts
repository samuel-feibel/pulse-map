import type { Size } from './particles'
import type { Weather } from './types'

export interface MistSettings {
  readonly count: number
  /** Peak opacity at the center of each patch. */
  readonly alpha: number
  /** Horizontal stretch, so patches look like drifting banks rather than circles. */
  readonly stretch: number
  /** Patches always drift at least this fast, so they read as weather even on calm days. */
  readonly minDriftPxPerSec: number
  /** Patch radius range as a fraction of the wall's larger side. */
  readonly radius: readonly [number, number]
}

export interface MistPatch {
  readonly x: number
  readonly y: number
  readonly radius: number
}

const NONE: MistSettings = { count: 0, alpha: 0, stretch: 1, minDriftPxPerSec: 0, radius: [0, 0] }
const MAX_CLOUDS = 9
const MIST_COLOR = '220, 225, 235'

export function mistSettings(weather: Weather): MistSettings {
  if (weather.kind === 'fog') {
    return { count: 14, alpha: 0.28 * weather.intensity, stretch: 2.2, minDriftPxPerSec: 14, radius: [0.2, 0.4] }
  }
  if (weather.kind === 'clear' || weather.kind === 'cloudy') {
    const count = Math.round(weather.cloudCover * MAX_CLOUDS)
    return { count, alpha: 0.16, stretch: 1.6, minDriftPxPerSec: 10, radius: [0.15, 0.3] }
  }
  return NONE
}

export function createMist(settings: MistSettings, size: Size, random: () => number = Math.random): MistPatch[] {
  const span = Math.max(size.width, size.height)
  const [min, max] = settings.radius
  return Array.from({ length: settings.count }, () => ({
    x: random() * size.width,
    y: random() * size.height,
    radius: span * (min + random() * (max - min)),
  }))
}

/** Moves patches sideways, wrapping each fully off one edge before it re-enters at the other. */
export function moveMist(patches: readonly MistPatch[], dx: number, stretch: number, size: Size): MistPatch[] {
  return patches.map((p) => {
    const reach = p.radius * stretch
    const span = size.width + 2 * reach
    return { ...p, x: ((((p.x + dx + reach) % span) + span) % span) - reach }
  })
}

export function drawMist(ctx: CanvasRenderingContext2D, patches: readonly MistPatch[], settings: MistSettings): void {
  patches.forEach((p) => {
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.scale(settings.stretch, 1)
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.radius)
    gradient.addColorStop(0, `rgba(${MIST_COLOR}, ${settings.alpha})`)
    gradient.addColorStop(0.5, `rgba(${MIST_COLOR}, ${settings.alpha * 0.6})`)
    gradient.addColorStop(1, `rgba(${MIST_COLOR}, 0)`)
    ctx.fillStyle = gradient
    ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 2)
    ctx.restore()
  })
}
