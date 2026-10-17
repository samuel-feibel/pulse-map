import { describe, expect, test } from 'vitest'
import { demoBadgeText } from './demoBadge'

describe('demoBadgeText', () => {
  test('is empty when everything is live', () => {
    expect(demoBadgeText(new Map())).toBe('')
  })

  test('lists each simulated part after the DEMO marker, in a stable order', () => {
    const parts = new Map([
      ['weather', 'Weather: rain'],
      ['sports', 'Bruins preview'],
      ['planes', 'Planes'],
    ])
    expect(demoBadgeText(parts)).toBe('DEMO · Bruins preview · Planes · Weather: rain')
  })
})
