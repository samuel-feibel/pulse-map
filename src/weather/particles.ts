import type { WeatherKind } from './types'

export interface Particle {
  readonly x: number
  readonly y: number
  /** Fall speed as a fraction of the wall height per second. */
  readonly speed: number
  /** Streak length (rain) or flake radius (snow), in CSS pixels. */
  readonly size: number
  readonly alpha: number
  /** Snowflake sway phase, in radians. */
  readonly phase: number
}

export interface Size {
  readonly width: number
  readonly height: number
}

type Random = () => number

interface Profile {
  /** Particles per million square pixels at full intensity. */
  readonly density: number
  readonly speed: readonly [number, number]
  readonly size: readonly [number, number]
  readonly alpha: readonly [number, number]
}

const MEGAPIXEL = 1_000_000
const SNOW_SWAY_PX_PER_SEC = 14
const SNOW_SWAY_RATE = 1.5

const PROFILES: Partial<Record<WeatherKind, Profile>> = {
  drizzle: { density: 900, speed: [0.7, 1.0], size: [7, 12], alpha: [0.3, 0.5] },
  rain: { density: 900, speed: [1.1, 1.6], size: [12, 24], alpha: [0.2, 0.45] },
  storm: { density: 1300, speed: [1.4, 1.9], size: [16, 30], alpha: [0.25, 0.5] },
  snow: { density: 380, speed: [0.04, 0.1], size: [1, 2.8], alpha: [0.5, 0.95] },
}

const between = (random: Random, [min, max]: readonly [number, number]): number => min + random() * (max - min)
const wrap = (value: number, max: number): number => ((value % max) + max) % max

export const isSnow = (kind: WeatherKind): boolean => kind === 'snow'

export function particleCount(kind: WeatherKind, intensity: number, areaPx: number): number {
  const profile = PROFILES[kind]
  return profile ? Math.round((profile.density * intensity * areaPx) / MEGAPIXEL) : 0
}

function spawn(profile: Profile, size: Size, random: Random, y: number): Particle {
  return {
    x: random() * size.width,
    y,
    speed: between(random, profile.speed),
    size: between(random, profile.size),
    alpha: between(random, profile.alpha),
    phase: random() * Math.PI * 2,
  }
}

export function createParticles(kind: WeatherKind, intensity: number, size: Size, random: Random = Math.random): Particle[] {
  const profile = PROFILES[kind]
  if (!profile) {
    return []
  }
  const count = particleCount(kind, intensity, size.width * size.height)
  return Array.from({ length: count }, () => spawn(profile, size, random, random() * size.height))
}

/** Advances particles by `dt` seconds; ones that fall off the bottom start again above the top. */
export function stepParticles(
  particles: readonly Particle[],
  kind: WeatherKind,
  dt: number,
  driftPxPerSec: number,
  size: Size,
  random: Random = Math.random,
): Particle[] {
  const profile = PROFILES[kind]
  if (!profile) {
    return []
  }
  const sways = isSnow(kind)
  return particles.map((p) => {
    const y = p.y + p.speed * size.height * dt
    if (y > size.height) {
      return spawn(profile, size, random, -p.size - random() * size.height * 0.1)
    }
    const phase = sways ? p.phase + SNOW_SWAY_RATE * dt : p.phase
    const sway = sways ? Math.sin(phase) * SNOW_SWAY_PX_PER_SEC * dt : 0
    return { ...p, x: wrap(p.x + driftPxPerSec * dt + sway, size.width), y, phase }
  })
}
