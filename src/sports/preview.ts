import type { Game } from './types'

const SECOND = 1000

interface PreviewScript {
  /** How often Boston scores, and how many points at a time. */
  readonly everyMs: number
  readonly points: number
  readonly opponent: string
  readonly opponentColor: string
}

const SCRIPTS: Readonly<Record<string, PreviewScript>> = {
  redsox: { everyMs: 7 * SECOND, points: 1, opponent: 'NYY', opponentColor: '#C4CED4' },
  celtics: { everyMs: 4 * SECOND, points: 2, opponent: 'NYK', opponentColor: '#F58426' },
  bruins: { everyMs: 9 * SECOND, points: 1, opponent: 'MTL', opponentColor: '#AF1E2D' },
}
const DEFAULT_SCRIPT: PreviewScript = { everyMs: 8 * SECOND, points: 1, opponent: 'OPP', opponentColor: '#FFFFFF' }
/** Opponents score at a third of Boston's pace, so Boston stays ahead. */
const OPPONENT_PACE = 3

/** A never-ending live home game for one team, scoring every few seconds: for seeing how its stadium looks. */
export function previewGame(teamId: string, elapsedMs: number): Game {
  const script = SCRIPTS[teamId] ?? DEFAULT_SCRIPT
  const scores = Math.floor(elapsedMs / script.everyMs)
  return {
    teamId,
    eventId: `preview-${teamId}`,
    state: 'live',
    isHome: true,
    score: scores * script.points,
    opponentScore: Math.floor(scores / OPPONENT_PACE) * script.points,
    won: null,
    opponent: script.opponent,
    opponentColor: script.opponentColor,
  }
}
