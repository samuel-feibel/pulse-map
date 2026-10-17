/** Line colors darker than this (relative luminance) get lightened so they read on the black wall. */
const MIN_LUMINANCE = 0.15
const LIGHTEN_STEP = 0.1
const HEX = /^#([0-9a-f]{6})$/i

const channel = (value: number): number => {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
const luminance = ([r, g, b]: readonly number[]): number => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
const toHex = (rgb: readonly number[]): string =>
  `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()}`

/** A line color as it should be drawn: unchanged if it shows up on black, otherwise mixed toward white. */
export function displayColor(color: string): string {
  const match = HEX.exec(color)
  if (!match) return color
  const n = parseInt(match[1], 16)
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  if (luminance(rgb) >= MIN_LUMINANCE) return color
  for (let mix = LIGHTEN_STEP; mix <= 1; mix += LIGHTEN_STEP) {
    const lighter = rgb.map((v) => v + (255 - v) * mix)
    if (luminance(lighter) >= MIN_LUMINANCE) return toHex(lighter)
  }
  return '#FFFFFF'
}
