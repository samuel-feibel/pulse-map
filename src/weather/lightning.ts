const MIN_GAP_MS = 4_000
const MAX_GAP_MS = 14_000
/** Wall-wide flash opacities, one per flicker step. */
const FLICKERS = [0.35, 0, 0.25] as const
const FLICKER_MS = 70

export interface Lightning {
  readonly setActive: (isActive: boolean) => void
}

/** Random lightning: each strike flashes the whole wall and draws a bolt via `strike`. */
export function createLightning(flash: HTMLElement, strike: () => void): Lightning {
  let timer: number | undefined

  const flashOnce = (): void => {
    strike()
    FLICKERS.forEach((opacity, i) => {
      window.setTimeout(() => (flash.style.opacity = String(opacity)), i * FLICKER_MS)
    })
    window.setTimeout(() => (flash.style.opacity = '0'), FLICKERS.length * FLICKER_MS)
  }

  const schedule = (): void => {
    const gap = MIN_GAP_MS + Math.random() * (MAX_GAP_MS - MIN_GAP_MS)
    timer = window.setTimeout(() => {
      flashOnce()
      schedule()
    }, gap)
  }

  return {
    setActive(isActive: boolean): void {
      if (isActive && timer === undefined) {
        schedule()
      }
      if (!isActive && timer !== undefined) {
        window.clearTimeout(timer)
        timer = undefined
        flash.style.opacity = '0'
      }
    },
  }
}
