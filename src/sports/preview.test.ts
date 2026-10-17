import { describe, expect, test } from 'vitest'
import { previewGame } from './preview'

const team = { id: 'celtics', preview: { everyMs: 4000, points: 2, opponent: 'NYK', opponentColor: '#F58426' } }

describe('previewGame', () => {
  test('is a live home game for the team', () => {
    expect(previewGame(team, 0)).toMatchObject({ teamId: 'celtics', state: 'live', isHome: true })
  })

  test('keeps scoring as time passes, within one ongoing game', () => {
    const early = previewGame(team, 1_000)
    const later = previewGame(team, 60_000)
    expect(later.score).toBeGreaterThan(early.score)
    expect(later.eventId).toBe(early.eventId)
  })

  test("keeps the home team ahead of the team's scripted opponent", () => {
    const game = previewGame(team, 60_000)
    expect(game.opponent).toBe('NYK')
    expect(game.score).toBeGreaterThan(game.opponentScore)
  })
})
