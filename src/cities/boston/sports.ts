import { centered, fieldOutline, rectangle, type OutfieldWall } from '../../sports/shapes'
import type { Team } from '../../sports/teams'

/**
 * ─── Boston stadium settings: tweak these freely ────────────────────────────────────────────────
 *
 * Save the file and the wall reloads by itself. Press D on the wall to preview each team
 * (live → Red Sox → Celtics → Bruins) while you adjust. Shared look settings (outline width,
 * fill, score text size) are in src/sports/tuning.ts.
 */

const SECOND = 1000

/**
 * WHERE each stadium is drawn (its center). `lat` moves it up/down, `lng` moves it left/right.
 *   lat + 0.001 ≈ 110 m up        lat - 0.001 ≈ 110 m down
 *   lng + 0.001 ≈  80 m right     lng - 0.001 ≈  80 m left
 * The wall is about 13.4 km across, so 0.01 lng (~800 m) moves a stadium ~6% of the wall's width.
 * The Celtics and Bruins share one spot (they never play the same night).
 */
export const GARDEN_POSITION = { lng: -71.0445, lat: 42.37 }
export const FENWAY_POSITION = { lng: -71.091, lat: 42.3428 }

/**
 * HOW BIG each stadium is, in meters on the ground (1000 m ≈ 7.5% of the wall's width).
 * Real sizes for reference: NBA court 29 × 15 m, NHL rink 61 × 26 m, Fenway 128 m to center field.
 */
export const COURT_SIZE = { width: 860, height: 460 }
export const RINK_SIZE = { width: 915, height: 390, cornerRadius: 130 }
/** Fenway is drawn at this many times its real size. */
export const FENWAY_SCALE = 7

/** How far a score ping spreads, as a fraction of the wall's width (0.2 = a fifth of the wall). */
export const SCORE_PING_REACH = { redsox: 0.18, celtics: 0.07, bruins: 0.22 }

/** Fenway's outfield: the short Green Monster in left, the deep triangle in center, Pesky's Pole in right. */
const FENWAY_WALL: OutfieldWall = [
  [0, 310],
  [15, 335],
  [30, 379],
  [37, 390],
  [42, 420],
  [50, 400],
  [62, 380],
  [75, 380],
  [85, 330],
  [90, 302],
]

const COURT = [rectangle(COURT_SIZE.width, COURT_SIZE.height, 0)]
const RINK = [rectangle(RINK_SIZE.width, RINK_SIZE.height, RINK_SIZE.cornerRadius)]
/**
 * Center field points straight up the wall (the real park faces north-east) so it reads at a glance
 * as a baseball field: home plate at the bottom, the outfield fanning out above.
 */
const FENWAY = centered(fieldOutline(FENWAY_WALL, FENWAY_SCALE, 0))

export const BOSTON_TEAMS: readonly Team[] = [
  {
    id: 'redsox',
    name: 'Red Sox',
    league: 'baseball/mlb',
    abbreviation: 'BOS',
    color: '#E0293F',
    marker: FENWAY_POSITION,
    outline: FENWAY,
    rippleReach: SCORE_PING_REACH.redsox,
    preview: { everyMs: 7 * SECOND, points: 1, opponent: 'NYY', opponentColor: '#C4CED4' },
  },
  {
    id: 'celtics',
    name: 'Celtics',
    league: 'basketball/nba',
    abbreviation: 'BOS',
    color: '#00A651',
    marker: GARDEN_POSITION,
    outline: COURT,
    rippleReach: SCORE_PING_REACH.celtics,
    preview: { everyMs: 4 * SECOND, points: 2, opponent: 'NYK', opponentColor: '#F58426' },
  },
  {
    id: 'bruins',
    name: 'Bruins',
    league: 'hockey/nhl',
    abbreviation: 'BOS',
    color: '#FFB81C',
    marker: GARDEN_POSITION,
    outline: RINK,
    rippleReach: SCORE_PING_REACH.bruins,
    preview: { everyMs: 9 * SECOND, points: 1, opponent: 'MTL', opponentColor: '#AF1E2D' },
  },
]
