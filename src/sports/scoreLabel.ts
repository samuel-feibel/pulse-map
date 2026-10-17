import type { Game } from './types'

export interface ScoreLine {
  readonly text: string
  readonly color: string
}

const BOSTON = 'BOS'

/** Two lines for the scoreboard: Boston first, then the opponent, each in its team color. */
export const scoreLines = (game: Game, bostonColor: string): readonly [ScoreLine, ScoreLine] => [
  { text: `${BOSTON} ${game.score}`, color: bostonColor },
  { text: `${game.opponent} ${game.opponentScore}`, color: game.opponentColor },
]
