import type { Game, GameEvent } from './types'

/** What happened between two looks at the same team's game. */
export function gameEvents(previous: Game | null, next: Game | null): GameEvent[] {
  if (!previous || !next || previous.eventId !== next.eventId) {
    return []
  }
  const events: GameEvent[] = []
  if (next.score > previous.score) {
    events.push({ type: 'score', teamId: next.teamId, points: next.score - previous.score })
  }
  if (previous.state !== 'final' && next.state === 'final' && next.won !== null) {
    events.push({ type: next.won ? 'win' : 'loss', teamId: next.teamId })
  }
  return events
}
