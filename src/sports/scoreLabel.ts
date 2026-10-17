import type { Team } from './teams'
import type { Game } from './types'

export interface ScoreLine {
  readonly text: string
  readonly color: string
}

/** Two lines for the scoreboard: the home team first, then the opponent, each in its team color. */
export const scoreLines = (game: Game, team: Pick<Team, 'abbreviation' | 'color'>): readonly [ScoreLine, ScoreLine] => [
  { text: `${team.abbreviation} ${game.score}`, color: team.color },
  { text: `${game.opponent} ${game.opponentScore}`, color: game.opponentColor },
]
