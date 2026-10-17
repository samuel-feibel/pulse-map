import { createBolt, type Bolt } from './bolt'
import { createMist, drawMist, mistSettings, moveMist, type MistPatch, type MistSettings } from './mist'
import { createParticles, isSnow, stepParticles, type Particle, type Size } from './particles'
import type { Weather } from './types'
import { windVector } from './wind'

/** Sideways drift in px/s per km/h of east-west wind. Snow falls slower, so it drifts less per km/h. */
const RAIN_DRIFT_PER_KMH = 6
const SNOW_DRIFT_PER_KMH = 2.5
const MIST_DRIFT_PER_KMH = 1.5
const RAIN_COLOR = '170, 200, 255'
const SNOW_COLOR = '255, 255, 255'
const ALPHA_STEPS = 10
/** Cap frame gaps (e.g. after a hidden tab) so particles don't teleport. */
const MAX_FRAME_SECONDS = 0.1

const BOLT_LIFETIME_MS = 500
const BOLT_COLOR = '235, 240, 255'
const BOLT_GLOW = 'rgba(170, 195, 255, 0.9)'
const BOLT_GLOW_BLUR = 18
const BOLT_MAIN_WIDTH = 2.5
const BOLT_BRANCH_WIDTH = 1.2
/** Bolts strike somewhere between these fractions of the wall height. */
const BOLT_GROUND_ZONE: readonly [number, number] = [0.45, 0.95]

interface Strike {
  readonly bolt: Bolt
  readonly startedAt: number
}

export interface WeatherCanvas {
  readonly setWeather: (weather: Weather) => void
  readonly strike: () => void
}

function drawRain(ctx: CanvasRenderingContext2D, particles: readonly Particle[], drift: number, size: Size): void {
  // Group by rounded alpha so each group is a single stroke call.
  const groups = Map.groupBy(particles, (p) => Math.round(p.alpha * ALPHA_STEPS) / ALPHA_STEPS)
  ctx.lineWidth = 1
  groups.forEach((group, alpha) => {
    ctx.strokeStyle = `rgba(${RAIN_COLOR}, ${alpha})`
    ctx.beginPath()
    group.forEach((p) => {
      const slant = (drift / (p.speed * size.height)) * p.size
      ctx.moveTo(p.x - slant, p.y - p.size)
      ctx.lineTo(p.x, p.y)
    })
    ctx.stroke()
  })
}

function drawSnow(ctx: CanvasRenderingContext2D, particles: readonly Particle[]): void {
  particles.forEach((p) => {
    ctx.fillStyle = `rgba(${SNOW_COLOR}, ${p.alpha})`
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
    ctx.fill()
  })
}

/** Bright, flickering, then fading — like a real return stroke. */
function boltAlpha(ageMs: number): number {
  if (ageMs < 70) return 1
  if (ageMs < 140) return 0.3
  if (ageMs < 210) return 0.9
  return Math.max(0, 1 - (ageMs - 210) / (BOLT_LIFETIME_MS - 210))
}

function drawStrikes(ctx: CanvasRenderingContext2D, strikes: readonly Strike[], now: number): void {
  ctx.save()
  ctx.shadowColor = BOLT_GLOW
  ctx.shadowBlur = BOLT_GLOW_BLUR
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  strikes.forEach(({ bolt, startedAt }) => {
    ctx.strokeStyle = `rgba(${BOLT_COLOR}, ${boltAlpha(now - startedAt)})`
    bolt.paths.forEach((path, i) => {
      ctx.lineWidth = i === 0 ? BOLT_MAIN_WIDTH : BOLT_BRANCH_WIDTH
      ctx.beginPath()
      path.forEach((p, j) => (j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
      ctx.stroke()
    })
  })
  ctx.restore()
}

function randomBolt(size: Size): Bolt {
  const [low, high] = BOLT_GROUND_ZONE
  const start = { x: Math.random() * size.width, y: 0 }
  const end = {
    x: start.x + (Math.random() - 0.5) * size.width * 0.4,
    y: size.height * (low + Math.random() * (high - low)),
  }
  return createBolt(start, end)
}

/** Draws precipitation, clouds, fog and lightning on a transparent canvas laid over the map. */
export function createWeatherCanvas(canvas: HTMLCanvasElement): WeatherCanvas {
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('2D canvas is not available for weather effects')
  }
  let size: Size = { width: canvas.clientWidth, height: canvas.clientHeight }
  let weather: Weather | null = null
  let particles: Particle[] = []
  let mist: MistSettings = mistSettings({ kind: 'clear', intensity: 0, cloudCover: 0, windSpeedKmh: 0, windFromDegrees: 0 })
  let patches: MistPatch[] = []
  let strikes: Strike[] = []
  let lastFrame = performance.now()

  const reset = (): void => {
    particles = weather ? createParticles(weather.kind, weather.intensity, size) : []
    patches = createMist(mist, size)
  }

  new ResizeObserver(() => {
    const dpr = window.devicePixelRatio || 1
    size = { width: canvas.clientWidth, height: canvas.clientHeight }
    canvas.width = Math.round(size.width * dpr)
    canvas.height = Math.round(size.height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    reset()
  }).observe(canvas)

  const frame = (now: number): void => {
    const dt = Math.min((now - lastFrame) / 1000, MAX_FRAME_SECONDS)
    lastFrame = now
    ctx.clearRect(0, 0, size.width, size.height)
    if (weather) {
      const east = windVector(weather.windSpeedKmh, weather.windFromDegrees).east
      const mistSpeed = Math.max(Math.abs(east * MIST_DRIFT_PER_KMH), mist.minDriftPxPerSec)
      patches = moveMist(patches, (east < 0 ? -mistSpeed : mistSpeed) * dt, mist.stretch, size)
      drawMist(ctx, patches, mist)

      const snow = isSnow(weather.kind)
      const drift = east * (snow ? SNOW_DRIFT_PER_KMH : RAIN_DRIFT_PER_KMH)
      particles = stepParticles(particles, weather.kind, dt, drift, size)
      if (snow) {
        drawSnow(ctx, particles)
      } else {
        drawRain(ctx, particles, drift, size)
      }
    }
    strikes = strikes.filter((s) => now - s.startedAt < BOLT_LIFETIME_MS)
    drawStrikes(ctx, strikes, now)
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)

  return {
    setWeather(next: Weather): void {
      const changed =
        next.kind !== weather?.kind || next.intensity !== weather?.intensity || next.cloudCover !== weather?.cloudCover
      weather = next
      mist = mistSettings(next)
      if (changed) {
        reset()
      }
    },
    strike(): void {
      strikes = [...strikes, { bolt: randomBolt(size), startedAt: performance.now() }]
    },
  }
}
