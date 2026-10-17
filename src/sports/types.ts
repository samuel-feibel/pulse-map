export type GameState = 'pre' | 'live' | 'final'

/** One Boston team's game today, from Boston's point of view. */
export interface Game {
  readonly teamId: string
  readonly eventId: string
  readonly state: GameState
  readonly isHome: boolean
  readonly score: number
  readonly opponentScore: number
  /** null until the game is final (or if it ended without a result, e.g. postponed). */
  readonly won: boolean | null
  /** The opponent's short name, e.g. 'NYK'. */
  readonly opponent: string
  /** The opponent's color, already checked to be readable on the dark wall. */
  readonly opponentColor: string
}

export type GameEvent =
  | { readonly type: 'score'; readonly teamId: string; readonly points: number }
  | { readonly type: 'win'; readonly teamId: string }
  | { readonly type: 'loss'; readonly teamId: string }
