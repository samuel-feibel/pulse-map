import { describe, expect, test } from 'vitest'
import { previewGame } from './preview'

describe('previewGame', () => {
  test.each(['redsox', 'celtics', 'bruins'])('shows %s as a live home game', (teamId) => {
    expect(previewGame(teamId, 0)).toMatchObject({ teamId, state: 'live', isHome: true })
  })

  test('keeps scoring as time passes, within one ongoing game', () => {
    const early = previewGame('bruins', 1_000)
    const later = previewGame('bruins', 60_000)
    expect(later.score).toBeGreaterThan(early.score)
    expect(later.eventId).toBe(early.eventId)
  })

  test('keeps Boston ahead of a real-looking opponent', () => {
    const game = previewGame('celtics', 60_000)
    expect(game.opponent).toBe('NYK')
    expect(game.score).toBeGreaterThan(game.opponentScore)
  })
})
