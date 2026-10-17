import { describe, expect, test } from 'vitest'
import { displayColor } from './colors'

describe('displayColor', () => {
  test('leaves colors that already show up on black alone', () => {
    expect(displayColor('#DA291C')).toBe('#DA291C')
    expect(displayColor('#ED8B00')).toBe('#ED8B00')
  })

  test('lightens dark colors (like navy or purple) toward white, keeping their hue', () => {
    const navy = displayColor('#005B95')
    expect(navy).not.toBe('#005B95')
    const [r, , b] = [1, 3, 5].map((i) => parseInt(navy.slice(i, i + 2), 16))
    expect(b).toBeGreaterThan(r)
    expect(b).toBeGreaterThan(0x95)
  })

  test('passes through anything that is not a 6-digit hex color', () => {
    expect(displayColor('red')).toBe('red')
  })
})
