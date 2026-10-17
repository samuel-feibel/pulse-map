import type { LngLat } from '../geo'
import type { Ring } from './shapes'

/** A scripted never-ending home game used by the D-key preview. */
export interface PreviewScript {
  /** How often the home team scores, and how many points at a time. */
  readonly everyMs: number
  readonly points: number
  readonly opponent: string
  readonly opponentColor: string
}

/** A home team whose venue is on a city's wall. Cities list theirs in src/cities/<city>/sports.ts. */
export interface Team {
  readonly id: string
  /** Shown in the corner demo badge, e.g. 'Red Sox'. */
  readonly name: string
  /** ESPN sport/league path, e.g. 'hockey/nhl'. */
  readonly league: string
  /** The team's abbreviation on ESPN's scoreboard, also shown on the wall (e.g. 'BOS'). */
  readonly abbreviation: string
  readonly color: string
  /** Where the outline is drawn and score pings start: near the venue, nudged into open space. */
  readonly marker: LngLat
  /** The venue outline in meters around `marker`, drawn much larger than life so it reads on the wall. */
  readonly outline: readonly Ring[]
  /** How far a scoring ripple spreads, as a fraction of the wall width. Frequent scorers get smaller ripples. */
  readonly rippleReach: number
  readonly preview: PreviewScript
}
