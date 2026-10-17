import type { Team } from './teams'

/** 'live' for real scores, or a team's id to preview just that team's stadium. */
export type SportsMode = string

export const LIVE: SportsMode = 'live'

const cycle = (teamIds: readonly string[]): readonly SportsMode[] => [LIVE, ...teamIds]

/** `?sports=<team id>` (e.g. `redsox`) starts in that team's preview; anything else is live. */
export function sportsModeFromUrl(search: string, teamIds: readonly string[]): SportsMode {
  const requested = new URLSearchParams(search).get('sports')
  return requested !== null && teamIds.includes(requested) ? requested : LIVE
}

/** Live → each team in turn → live. */
export function nextSportsMode(mode: SportsMode, teamIds: readonly string[]): SportsMode {
  const modes = cycle(teamIds)
  return modes[(modes.indexOf(mode) + 1) % modes.length]
}

/** Short name for the corner demo badge while previewing; null when live. */
export function demoLabel(mode: SportsMode, teams: readonly Team[]): string | null {
  const team = teams.find((t) => t.id === mode)
  return team ? `${team.name} preview` : null
}
