import { fetchGame } from './espn'
import { LIVE, type SportsMode } from './modes'
import { previewGame } from './preview'
import type { Team } from './teams'
import type { Game } from './types'

const LIVE_POLL_MS = 30_000
const IDLE_POLL_MS = 5 * 60_000
const RETRY_MS = 2 * 60_000
const PREVIEW_TICK_MS = 1_000

export interface GameFeed {
  /** Switches where games come from; live polling stops entirely while previewing. */
  readonly setMode: (mode: SportsMode) => void
}

/** In a team's preview, only that team has a game; everyone else is off. */
const previewFor = (mode: SportsMode, team: Team, elapsedMs: number): Game | null =>
  team.id === mode ? previewGame(team, elapsedMs) : null

/** Feeds each team's game to `onGame`: real ESPN scores, or a preview game for one team. */
export function createGameFeed(teams: readonly Team[], onGame: (team: Team, game: Game | null) => void): GameFeed {
  let mode: SportsMode = LIVE
  let startedAt = performance.now()
  /** Bumped on every switch so in-flight live requests from an old mode are ignored. */
  let generation = 0
  const timers = new Set<number>()

  const startLive = (): void => {
    const current = generation
    teams.forEach((team) => {
      const poll = async (): Promise<void> => {
        let delay = RETRY_MS
        try {
          const game = await fetchGame(team)
          if (current !== generation) return
          onGame(team, game)
          delay = game?.state === 'live' ? LIVE_POLL_MS : IDLE_POLL_MS
        } catch (error) {
          console.error(`Score update for ${team.id} failed; retrying in ${RETRY_MS / 1000}s.`, error)
        }
        if (current === generation) timers.add(window.setTimeout(poll, delay))
      }
      void poll()
    })
  }

  const tickPreview = (): void => {
    if (mode === LIVE) return
    const elapsed = performance.now() - startedAt
    teams.forEach((team) => onGame(team, previewFor(mode, team, elapsed)))
  }
  window.setInterval(tickPreview, PREVIEW_TICK_MS)

  return {
    setMode(next: SportsMode): void {
      generation += 1
      timers.forEach((id) => window.clearTimeout(id))
      timers.clear()
      mode = next
      startedAt = performance.now()
      if (mode === LIVE) {
        startLive()
      } else {
        tickPreview()
      }
    },
  }
}
