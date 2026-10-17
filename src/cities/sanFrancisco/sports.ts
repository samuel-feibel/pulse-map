import { centered, fieldOutline, rectangle, type OutfieldWall } from '../../sports/shapes'
import type { Team } from '../../sports/teams'

/**
 * ─── San Francisco stadium settings: tweak these freely ─────────────────────────────────────────
 *
 * Save the file and the wall reloads by itself. Press D on the wall (with ?city=sf) to preview each team
 * while you adjust. Shared look settings (outline width, fill, score text size) are in src/sports/tuning.ts.
 */

const SECOND = 1000

/**
 * WHERE each stadium is drawn (its center), out in the bay where there's open water.
 *   lat + 0.001 ≈ 110 m up        lat - 0.001 ≈ 110 m down
 *   lng + 0.001 ≈  90 m right     lng - 0.001 ≈  90 m left
 * The wall is about 25.5 km across, so 0.01 lng (~900 m) moves a stadium ~3.5% of the wall's width.
 * The Warriors and Valkyries share Chase Center's spot (NBA and WNBA seasons barely overlap).
 */
export const ORACLE_PARK_POSITION = { lng: -122.368, lat: 37.779 }
export const CHASE_CENTER_POSITION = { lng: -122.362, lat: 37.754 }

/**
 * HOW BIG each stadium is (1000 m ≈ 3.9% of the wall's width). This wall is about twice as wide as
 * Boston's, so shapes are about twice as many meters to look the same size.
 * Real sizes for reference: NBA court 29 × 15 m, Oracle Park ~128 m to center field.
 */
export const COURT_SIZE = { width: 1640, height: 875 }
/** The ballpark is drawn at this many times its real size. */
export const BALLPARK_SCALE = 13

/** How far a score ping spreads, as a fraction of the wall's width (0.2 = a fifth of the wall). */
export const SCORE_PING_REACH = { giants: 0.18, warriors: 0.07, valkyries: 0.07 }

/**
 * Oracle Park's outfield: 339 ft down the left-field line, 391 ft to center, the deep "Triples Alley"
 * bulge in right-center, then the wall cuts in sharply to a short 309 ft right-field line by McCovey Cove.
 */
const ORACLE_PARK_WALL: OutfieldWall = [
  [0, 339],
  [12, 352],
  [25, 364],
  [37, 380],
  [45, 391],
  [55, 404],
  [63, 415],
  [70, 400],
  [77, 360],
  [84, 325],
  [90, 309],
]

const COURT = [rectangle(COURT_SIZE.width, COURT_SIZE.height, 0)]
/** Center field points straight up the wall so it reads at a glance as a ballpark. */
const BALLPARK = centered(fieldOutline(ORACLE_PARK_WALL, BALLPARK_SCALE, 0))

export const SAN_FRANCISCO_TEAMS: readonly Team[] = [
  {
    id: 'giants',
    name: 'Giants',
    league: 'baseball/mlb',
    abbreviation: 'SF',
    color: '#FD5A1E',
    marker: ORACLE_PARK_POSITION,
    outline: BALLPARK,
    rippleReach: SCORE_PING_REACH.giants,
    preview: { everyMs: 7 * SECOND, points: 1, opponent: 'LAD', opponentColor: '#5A8FDB' },
  },
  {
    id: 'warriors',
    name: 'Warriors',
    league: 'basketball/nba',
    abbreviation: 'GS',
    color: '#FDB927',
    marker: CHASE_CENTER_POSITION,
    outline: COURT,
    rippleReach: SCORE_PING_REACH.warriors,
    preview: { everyMs: 4 * SECOND, points: 2, opponent: 'LAL', opponentColor: '#A77FD8' },
  },
  {
    id: 'valkyries',
    name: 'Valkyries',
    league: 'basketball/wnba',
    abbreviation: 'GS',
    color: '#B38FCF',
    marker: CHASE_CENTER_POSITION,
    outline: COURT,
    rippleReach: SCORE_PING_REACH.valkyries,
    preview: { everyMs: 5 * SECOND, points: 2, opponent: 'LV', opponentColor: '#C4CED4' },
  },
]
