import { Marker, type Map as MapLibreMap } from 'maplibre-gl'
import { scoreLines } from './scoreLabel'
import type { Team } from './teams'
import { SCORE_TEXT_SIZE } from './tuning'
import type { Game } from './types'

export interface Scoreboards {
  /** Shows (or hides, at opacity 0) one team's score on its venue outline. */
  readonly render: (team: Team, game: Game | null, opacity: number) => void
}

const HIDDEN = 0.01

function createElement(): HTMLElement {
  const element = document.createElement('div')
  element.className = 'scoreboard'
  element.style.fontSize = `calc(min(100vw, 100vh) * ${SCORE_TEXT_SIZE})`
  return element
}

/** Score labels as HTML markers: the map style has no fonts, and HTML gives per-team colors for free. */
export function createScoreboards(map: MapLibreMap): Scoreboards {
  interface Entry {
    readonly marker: Marker
    /** What the label currently shows, so the DOM is only rebuilt when the score changes. */
    readonly text: string
    readonly isShown: boolean
  }
  const entries = new Map<string, Entry>()

  const entryFor = (team: Team): Entry => {
    const existing = entries.get(team.id)
    if (existing) {
      return existing
    }
    const marker = new Marker({ element: createElement(), anchor: 'center' }).setLngLat(team.marker)
    const created = { marker, text: '', isShown: false }
    entries.set(team.id, created)
    return created
  }

  return {
    render(team: Team, game: Game | null, opacity: number): void {
      const entry = entryFor(team)
      if (!game || opacity < HIDDEN) {
        if (entry.isShown) {
          entry.marker.remove()
          entries.set(team.id, { ...entry, isShown: false })
        }
        return
      }
      const element = entry.marker.getElement()
      const lines = scoreLines(game, team.color)
      const text = JSON.stringify(lines)
      if (text !== entry.text) {
        element.replaceChildren(
          ...lines.map((line) => {
            const row = document.createElement('div')
            row.textContent = line.text
            row.style.color = line.color
            return row
          }),
        )
      }
      element.style.opacity = opacity.toFixed(2)
      if (!entry.isShown) {
        entry.marker.addTo(map)
      }
      entries.set(team.id, { ...entry, text, isShown: true })
    },
  }
}
