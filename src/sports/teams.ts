import type { LngLat } from '../geo'
import { centered, fieldOutline, rectangle, type Ring } from './shapes'
import {
  COURT_SIZE,
  FENWAY_POSITION,
  FENWAY_SCALE,
  GARDEN_POSITION,
  RINK_SIZE,
  SCORE_PING_REACH,
} from './tuning'

export interface Team {
  readonly id: string
  /** ESPN sport/league path, e.g. 'hockey/nhl'. */
  readonly league: string
  /** The team's abbreviation on ESPN's scoreboard. */
  readonly abbreviation: string
  readonly color: string
  /** Where the outline is drawn and score pings start: near the venue, nudged into open space. */
  readonly marker: LngLat
  /** The venue outline in meters around `marker`, drawn much larger than life so it reads on the wall. */
  readonly outline: readonly Ring[]
  /** How far a scoring ripple spreads, as a fraction of the wall width. Frequent scorers get smaller ripples. */
  readonly rippleReach: number
}

// Positions and sizes live in tuning.ts so they're easy to adjust in one place.
const COURT = [rectangle(COURT_SIZE.width, COURT_SIZE.height, 0)]
const RINK = [rectangle(RINK_SIZE.width, RINK_SIZE.height, RINK_SIZE.cornerRadius)]
/**
 * Center field points straight up the wall (the real park faces north-east) so it reads at a glance
 * as a baseball field: home plate at the bottom, the outfield fanning out above.
 */
const FENWAY = centered(fieldOutline(FENWAY_SCALE, 0))

/** Boston teams whose home venue is on the wall. Add a team here to put it on the map. */
export const TEAMS: readonly Team[] = [
  { id: 'celtics', league: 'basketball/nba', abbreviation: 'BOS', color: '#00A651', marker: GARDEN_POSITION, outline: COURT, rippleReach: SCORE_PING_REACH.celtics },
  { id: 'bruins', league: 'hockey/nhl', abbreviation: 'BOS', color: '#FFB81C', marker: GARDEN_POSITION, outline: RINK, rippleReach: SCORE_PING_REACH.bruins },
  { id: 'redsox', league: 'baseball/mlb', abbreviation: 'BOS', color: '#E0293F', marker: FENWAY_POSITION, outline: FENWAY, rippleReach: SCORE_PING_REACH.redsox },
]
