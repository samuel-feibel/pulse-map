export interface Ripple {
  readonly startedAt: number
  readonly durationMs: number
  /** Final radius in pixels. */
  readonly maxRadius: number
}

export interface RippleFrame {
  readonly radius: number
  readonly opacity: number
}

/** A ring that spreads quickly, then slows as it fades out. */
export function rippleAt(ripple: Ripple, now: number): RippleFrame | null {
  const t = (now - ripple.startedAt) / ripple.durationMs
  if (t < 0 || t >= 1) {
    return null
  }
  const easedOut = 1 - (1 - t) ** 2
  return { radius: ripple.maxRadius * easedOut, opacity: 1 - t }
}
