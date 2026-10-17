import { describe, expect, test } from 'vitest'
import { demoLabel, nextSportsMode, sportsModeFromUrl } from './modes'
import type { Team } from './teams'

const TEAM_IDS = ['redsox', 'celtics', 'bruins']

describe('sportsModeFromUrl', () => {
  test("reads one of the city's teams to preview, defaulting to live", () => {
    expect(sportsModeFromUrl('?sports=redsox', TEAM_IDS)).toBe('redsox')
    expect(sportsModeFromUrl('?sports=bruins', TEAM_IDS)).toBe('bruins')
    expect(sportsModeFromUrl('?sports=giants', TEAM_IDS)).toBe('live')
    expect(sportsModeFromUrl('', TEAM_IDS)).toBe('live')
  })
})

describe('nextSportsMode', () => {
  test("cycles live → each of the city's teams → live", () => {
    expect(nextSportsMode('live', TEAM_IDS)).toBe('redsox')
    expect(nextSportsMode('redsox', TEAM_IDS)).toBe('celtics')
    expect(nextSportsMode('celtics', TEAM_IDS)).toBe('bruins')
    expect(nextSportsMode('bruins', TEAM_IDS)).toBe('live')
  })

  test('stays live in a city without teams', () => {
    expect(nextSportsMode('live', [])).toBe('live')
  })
})

describe('demoLabel', () => {
  const teams = [{ id: 'redsox', name: 'Red Sox' }] as unknown as Team[]

  test('names the team being previewed, and nothing when live', () => {
    expect(demoLabel('redsox', teams)).toBe('Red Sox preview')
    expect(demoLabel('live', teams)).toBeNull()
  })
})
