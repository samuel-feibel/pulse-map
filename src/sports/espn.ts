import { politeFetch } from '../net/politeFetch'
import { readableColor } from './colors'
import type { Team } from './teams'
import type { Game, GameState } from './types'

/** ESPN's public scoreboard: free and keyless, but unofficial and may change without notice. */
const API_BASE = 'https://site.api.espn.com/apis/site/v2/sports'

/** ESPN publishes no limit; stay gentle, sharing one budget across all three leagues. */
const MIN_INTERVAL_MS = 5_000

const STATES: Readonly<Record<string, GameState>> = { pre: 'pre', in: 'live', post: 'final' }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [])
const toScore = (value: unknown): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

interface Competitor {
  readonly homeAway: unknown
  readonly score: unknown
  readonly winner: unknown
  readonly abbreviation: unknown
  readonly color: unknown
  readonly alternateColor: unknown
}

function competitors(event: Record<string, unknown>): Competitor[] {
  const competition = asArray(event.competitions)[0]
  return asArray(isRecord(competition) ? competition.competitors : undefined)
    .filter(isRecord)
    .map((c) => {
      const team = isRecord(c.team) ? c.team : {}
      return {
        homeAway: c.homeAway,
        score: c.score,
        winner: c.winner,
        abbreviation: team.abbreviation,
        color: team.color,
        alternateColor: team.alternateColor,
      }
    })
}

function eventState(event: Record<string, unknown>): GameState | null {
  const type = isRecord(event.status) && isRecord(event.status.type) ? event.status.type : undefined
  return typeof type?.state === 'string' ? (STATES[type.state] ?? null) : null
}

/** Today's game for one Boston team from an ESPN league scoreboard, or null if they aren't playing. */
export function parseScoreboard(body: unknown, teamId: string, abbreviation: string): Game | null {
  if (!isRecord(body) || !Array.isArray(body.events)) {
    throw new Error('Unexpected ESPN response: missing "events" array')
  }
  for (const event of body.events.filter(isRecord)) {
    const sides = competitors(event)
    const boston = sides.find((c) => c.abbreviation === abbreviation)
    const opponent = sides.find((c) => c !== boston)
    const state = eventState(event)
    if (!boston || !opponent || !state || typeof event.id !== 'string') {
      continue
    }
    return {
      teamId,
      eventId: event.id,
      state,
      isHome: boston.homeAway === 'home',
      score: toScore(boston.score),
      opponentScore: toScore(opponent.score),
      won: state === 'final' && typeof boston.winner === 'boolean' ? boston.winner : null,
      opponent: typeof opponent.abbreviation === 'string' ? opponent.abbreviation : '???',
      opponentColor: readableColor(opponent.color, opponent.alternateColor),
    }
  }
  return null
}

export async function fetchGame(team: Team): Promise<Game | null> {
  const response = await politeFetch('espn', `${API_BASE}/${team.league}/scoreboard`, MIN_INTERVAL_MS)
  return parseScoreboard(await response.json(), team.id, team.abbreviation)
}
