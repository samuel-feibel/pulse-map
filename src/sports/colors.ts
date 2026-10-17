/** Below this relative luminance a color is too dark to read on the black wall. */
const MIN_LUMINANCE = 0.1
const FALLBACK = '#FFFFFF'
const HEX = /^#?([0-9a-f]{6})$/i

const channel = (value: number): number => {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string): number {
  const n = parseInt(hex, 16)
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}

/** The first of a team's colors that's bright enough to read on black, as '#RRGGBB'. */
export function readableColor(...candidates: readonly unknown[]): string {
  for (const candidate of candidates) {
    const match = typeof candidate === 'string' ? HEX.exec(candidate) : null
    if (match && luminance(match[1]) >= MIN_LUMINANCE) {
      return `#${match[1].toUpperCase()}`
    }
  }
  return FALLBACK
}
