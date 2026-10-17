/** Live scores, or a preview of one team's stadium. */
export type PreviewTeam = 'redsox' | 'celtics' | 'bruins'
export type SportsMode = 'live' | PreviewTeam

const MODES: readonly SportsMode[] = ['live', 'redsox', 'celtics', 'bruins']

/** Short name for the corner demo badge while previewing; null when live. */
export const DEMO_LABELS: Readonly<Record<SportsMode, string | null>> = {
  live: null,
  redsox: 'Red Sox preview',
  celtics: 'Celtics preview',
  bruins: 'Bruins preview',
}

/** `?sports=redsox` (or `celtics`, `bruins`) starts in that team's preview; anything else is live. */
export function sportsModeFromUrl(search: string): SportsMode {
  const requested = new URLSearchParams(search).get('sports')
  return MODES.find((mode) => mode === requested) ?? 'live'
}

export const nextSportsMode = (mode: SportsMode): SportsMode => MODES[(MODES.indexOf(mode) + 1) % MODES.length]
