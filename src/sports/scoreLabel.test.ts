import { describe, expect, test } from 'vitest'
import { scoreLines } from './scoreLabel'
import type { Game } from './types'

const game: Game = {
  teamId: 'bruins',
  eventId: 'e1',
  state: 'live',
  isHome: false,
  score: 3,
  opponentScore: 2,
  won: null,
  opponent: 'ANA',
  opponentColor: '#FC4C02',
}

describe('scoreLines', () => {
  test('lists Boston first, then the opponent, each in its own color', () => {
    expect(scoreLines(game, '#FFB81C')).toEqual([
      { text: 'BOS 3', color: '#FFB81C' },
      { text: 'ANA 2', color: '#FC4C02' },
    ])
  })
})
