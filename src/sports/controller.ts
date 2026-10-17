import type { Map as MapLibreMap } from 'maplibre-gl'
import { gameEvents } from './events'
import { createGameFeed } from './feed'
import { addSportsLayers, setSportsFrame, type OutlineFeature, type RippleFeature } from './layers'
import { MODE_LABELS, nextSportsMode, type SportsMode } from './modes'
import { rippleAt, type Ripple } from './ripples'
import { createScoreboards } from './scoreboards'
import { TEAMS, type Team } from './teams'
import type { Game, GameEvent } from './types'

const HOME_OUTLINE = 1
/** Away games show a faint outline at the home venue so you still know a game is on. */
const AWAY_OUTLINE = 0.4
/** The outline gently breathes in brightness while a game is on. */
const OUTLINE_BREATH = 0.15
const OUTLINE_BREATH_MS = 900
/** How quickly the outline fades toward its target brightness (per second). */
const OUTLINE_EASE = 1.5

const RIPPLE_MS = 2_500
const RIPPLE_STAGGER_MS = 400
/** Big ripples (hockey goals, runs) repeat once per point; basketball just gets one small ring. */
const BIG_RIPPLE_REACH = 0.1
const MAX_RIPPLES_PER_SCORE = 4
const WIN_RIPPLES = 6
/** Win rings are the same size for every team, spreading across about a third of the wall. */
const WIN_RIPPLE_REACH = 0.32
const WIN_RIPPLE_MS = 3_500
const CELEBRATION_MS = 20_000

interface TeamRipple extends Ripple {
  readonly team: Team
}

/**
 * Boston games as venue outlines with scores and ripples. Press D to cycle live → Red Sox → Celtics →
 * Bruins previews, or start in one with `?sports=redsox` (or `celtics`, `bruins`).
 */
export function startSports(map: MapLibreMap, initialMode: SportsMode, notify: (text: string) => void): void {
  addSportsLayers(map)
  const scoreboards = createScoreboards(map)
  const games = new Map<string, Game | null>()
  const brightness = new Map<string, number>(TEAMS.map((t) => [t.id, 0]))
  const celebrateUntil = new Map<string, number>()
  let ripples: TeamRipple[] = []
  let lastFrame = performance.now()

  const addRipples = (team: Team, count: number, reach: number, durationMs: number): void => {
    const now = performance.now()
    const added = Array.from({ length: count }, (_, i) => ({
      team,
      startedAt: now + i * RIPPLE_STAGGER_MS,
      durationMs,
      maxRadius: reach * map.getContainer().clientWidth,
    }))
    ripples = [...ripples, ...added]
  }

  const handle = (team: Team, event: GameEvent): void => {
    if (event.type === 'score') {
      const count = team.rippleReach >= BIG_RIPPLE_REACH ? Math.min(event.points, MAX_RIPPLES_PER_SCORE) : 1
      addRipples(team, count, team.rippleReach, RIPPLE_MS)
    } else if (event.type === 'win') {
      addRipples(team, WIN_RIPPLES, WIN_RIPPLE_REACH, WIN_RIPPLE_MS)
      celebrateUntil.set(team.id, performance.now() + CELEBRATION_MS)
    }
    // A loss needs nothing extra: the outline simply fades out once the game is final.
  }

  const update = (team: Team, next: Game | null): void => {
    gameEvents(games.get(team.id) ?? null, next).forEach((event) => handle(team, event))
    games.set(team.id, next)
  }

  const targetBrightness = (team: Team, now: number): number => {
    if ((celebrateUntil.get(team.id) ?? 0) > now) return 1
    const game = games.get(team.id)
    if (game?.state !== 'live') return 0
    return game.isHome ? HOME_OUTLINE : AWAY_OUTLINE
  }

  const render = (now: number): void => {
    const dt = Math.min((now - lastFrame) / 1000, 0.1)
    lastFrame = now
    TEAMS.forEach((team) => {
      const current = brightness.get(team.id) ?? 0
      const target = targetBrightness(team, now)
      brightness.set(team.id, current + (target - current) * Math.min(1, OUTLINE_EASE * dt))
    })
    const breath = 1 - OUTLINE_BREATH * (0.5 + 0.5 * Math.sin(now / OUTLINE_BREATH_MS))
    const outlines: OutlineFeature[] = TEAMS.filter((t) => (brightness.get(t.id) ?? 0) > 0.01).map((t) => ({
      marker: t.marker,
      outline: t.outline,
      color: t.color,
      opacity: (brightness.get(t.id) ?? 0) * breath,
    }))
    ripples = ripples.filter((r) => now < r.startedAt + r.durationMs)
    const rings = ripples.flatMap((r): RippleFeature[] => {
      const frame = rippleAt(r, now)
      return frame ? [{ marker: r.team.marker, color: r.team.color, ...frame }] : []
    })
    setSportsFrame(map, outlines, rings)
    TEAMS.forEach((t) => scoreboards.render(t, games.get(t.id) ?? null, brightness.get(t.id) ?? 0))
    requestAnimationFrame(render)
  }

  let mode = initialMode
  const feed = createGameFeed(update)
  const switchTo = (next: SportsMode): void => {
    // Start each mode from a clean slate so nothing from the previous one celebrates or lingers.
    games.clear()
    celebrateUntil.clear()
    ripples = []
    mode = next
    feed.setMode(next)
  }
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'd') return
    switchTo(nextSportsMode(mode))
    notify(MODE_LABELS[mode])
  })
  switchTo(initialMode)
  requestAnimationFrame(render)
}
