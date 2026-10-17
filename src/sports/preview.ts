import type { Team } from './teams'
import type { Game } from './types'

/** Opponents score at a third of the home team's pace, so the home team stays ahead. */
const OPPONENT_PACE = 3

/** A never-ending live home game for one team, scoring every few seconds: for seeing how its stadium looks. */
export function previewGame(team: Pick<Team, 'id' | 'preview'>, elapsedMs: number): Game {
  const { everyMs, points, opponent, opponentColor } = team.preview
  const scores = Math.floor(elapsedMs / everyMs)
  return {
    teamId: team.id,
    eventId: `preview-${team.id}`,
    state: 'live',
    isHome: true,
    score: scores * points,
    opponentScore: Math.floor(scores / OPPONENT_PACE) * points,
    won: null,
    opponent,
    opponentColor,
  }
}
