import { describe, expect, test } from 'vitest'
import { readableColor } from './colors'

describe('readableColor', () => {
  test('uses the primary color when it shows up on a dark wall', () => {
    expect(readableColor('fc4c02', '000000')).toBe('#FC4C02')
  })

  test('falls back to the alternate color when the primary is too dark', () => {
    expect(readableColor('231f20', 'fdb71a')).toBe('#FDB71A')
  })

  test('falls back to white when both are too dark', () => {
    expect(readableColor('000000', '0c2340')).toBe('#FFFFFF')
  })

  test('ignores missing or malformed colors', () => {
    expect(readableColor(undefined, 'nonsense')).toBe('#FFFFFF')
  })
})
