import { describe, expect, test } from 'vitest'
import { parseScoreboard } from './espn'

const competitor = (homeAway: string, abbreviation: string, score: string, winner?: boolean) => ({
  homeAway,
  score,
  team: { abbreviation, color: 'fc4c02', alternateColor: '000000' },
  ...(winner === undefined ? {} : { winner }),
})

const event = (id: string, state: string, competitors: unknown[]) => ({
  id,
  status: { type: { state } },
  competitions: [{ competitors }],
})

const scoreboard = (...events: unknown[]) => ({ events })

describe('parseScoreboard', () => {
  test('finds the Boston team and reads a live away game', () => {
    const body = scoreboard(
      event('1', 'in', [competitor('home', 'COL', '3'), competitor('away', 'PIT', '2')]),
      event('2', 'in', [competitor('home', 'ANA', '1'), competitor('away', 'BOS', '2')]),
    )
    expect(parseScoreboard(body, 'bruins', 'BOS')).toEqual({
      teamId: 'bruins',
      eventId: '2',
      state: 'live',
      isHome: false,
      score: 2,
      opponentScore: 1,
      won: null,
      opponent: 'ANA',
      opponentColor: '#FC4C02',
    })
  })

  test('reads a finished home win', () => {
    const body = scoreboard(event('9', 'post', [competitor('home', 'BOS', '110', true), competitor('away', 'NY', '99', false)]))
    expect(parseScoreboard(body, 'celtics', 'BOS')).toMatchObject({ state: 'final', isHome: true, won: true })
  })

  test('reads an upcoming game as not started', () => {
    const body = scoreboard(event('3', 'pre', [competitor('home', 'BOS', '0'), competitor('away', 'NYY', '0')]))
    expect(parseScoreboard(body, 'redsox', 'BOS')).toMatchObject({ state: 'pre', score: 0 })
  })

  test('returns null when Boston is not playing today', () => {
    const body = scoreboard(event('1', 'in', [competitor('home', 'COL', '3'), competitor('away', 'PIT', '2')]))
    expect(parseScoreboard(body, 'bruins', 'BOS')).toBeNull()
  })

  test('throws on a response without events', () => {
    expect(() => parseScoreboard({}, 'bruins', 'BOS')).toThrow()
  })
})
