import { describe, expect, test } from 'vitest'
import { gameEvents } from './events'
import type { Game } from './types'

const game = (overrides: Partial<Game> = {}): Game => ({
  teamId: 'celtics',
  eventId: 'g1',
  state: 'live',
  isHome: true,
  score: 10,
  opponentScore: 8,
  won: null,
  opponent: 'NYK',
  opponentColor: '#F58426',
  ...overrides,
})

describe('gameEvents', () => {
  test('reports a Boston score with the points scored', () => {
    expect(gameEvents(game(), game({ score: 13 }))).toEqual([{ type: 'score', teamId: 'celtics', points: 3 }])
  })

  test('ignores opponent scoring', () => {
    expect(gameEvents(game(), game({ opponentScore: 12 }))).toEqual([])
  })

  test('reports a win when the game goes final', () => {
    expect(gameEvents(game(), game({ state: 'final', won: true }))).toEqual([{ type: 'win', teamId: 'celtics' }])
  })

  test('reports a loss when the game goes final', () => {
    expect(gameEvents(game(), game({ state: 'final', won: false }))).toEqual([{ type: 'loss', teamId: 'celtics' }])
  })

  test('reports the last score and the win together', () => {
    const events = gameEvents(game(), game({ score: 12, state: 'final', won: true }))
    expect(events.map((e) => e.type)).toEqual(['score', 'win'])
  })

  test('stays quiet the first time a game is seen, so reloading never replays a celebration', () => {
    expect(gameEvents(null, game({ state: 'final', won: true, score: 120 }))).toEqual([])
  })

  test('stays quiet when a new game replaces the old one', () => {
    expect(gameEvents(game({ state: 'final', won: true }), game({ eventId: 'g2', score: 0 }))).toEqual([])
  })

  test('does not repeat the result once a game is already final', () => {
    const final = game({ state: 'final', won: true })
    expect(gameEvents(final, final)).toEqual([])
  })
})
