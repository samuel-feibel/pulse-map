/** Live scores, or a preview of one team's stadium. */
export type PreviewTeam = 'redsox' | 'celtics' | 'bruins'
export type SportsMode = 'live' | PreviewTeam

const MODES: readonly SportsMode[] = ['live', 'redsox', 'celtics', 'bruins']

export const MODE_LABELS: Readonly<Record<SportsMode, string>> = {
  live: 'Sports: live',
  redsox: 'Sports preview: Red Sox',
  celtics: 'Sports preview: Celtics',
  bruins: 'Sports preview: Bruins',
}

/** `?sports=redsox` (or `celtics`, `bruins`) starts in that team's preview; anything else is live. */
export function sportsModeFromUrl(search: string): SportsMode {
  const requested = new URLSearchParams(search).get('sports')
  return MODES.find((mode) => mode === requested) ?? 'live'
}

export const nextSportsMode = (mode: SportsMode): SportsMode => MODES[(MODES.indexOf(mode) + 1) % MODES.length]
