import { describe, expect, test } from 'vitest'
import { nextSportsMode, sportsModeFromUrl } from './modes'

describe('sportsModeFromUrl', () => {
  test('reads a team to preview, defaulting to live', () => {
    expect(sportsModeFromUrl('?sports=redsox')).toBe('redsox')
    expect(sportsModeFromUrl('?sports=bruins')).toBe('bruins')
    expect(sportsModeFromUrl('?sports=nope')).toBe('live')
    expect(sportsModeFromUrl('')).toBe('live')
  })
})

describe('nextSportsMode', () => {
  test('cycles live → Red Sox → Celtics → Bruins → live', () => {
    expect(nextSportsMode('live')).toBe('redsox')
    expect(nextSportsMode('redsox')).toBe('celtics')
    expect(nextSportsMode('celtics')).toBe('bruins')
    expect(nextSportsMode('bruins')).toBe('live')
  })
})
