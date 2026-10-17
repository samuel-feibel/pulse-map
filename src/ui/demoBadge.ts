/** Which part of the wall is simulated, e.g. 'sports' → 'Bruins preview'. */
export type DemoParts = ReadonlyMap<string, string>

/** Reports a part as simulated (with a short label) or back to live (null). */
export type ReportDemo = (part: string, label: string | null) => void

const ORDER = ['sports', 'planes', 'weather', 'sky']
const rank = (part: string): number => {
  const index = ORDER.indexOf(part)
  return index === -1 ? ORDER.length : index
}

export function demoBadgeText(parts: DemoParts): string {
  if (parts.size === 0) {
    return ''
  }
  const labels = [...parts.entries()].sort(([a], [b]) => rank(a) - rank(b)).map(([, label]) => label)
  return ['DEMO', ...labels].join(' · ')
}

/** A small corner badge that stays up whenever anything on the wall isn't live data. */
export function createDemoBadge(element: HTMLElement): ReportDemo {
  let parts: DemoParts = new Map()
  return (part, label) => {
    const next = new Map(parts)
    if (label === null) {
      next.delete(part)
    } else {
      next.set(part, label)
    }
    parts = next
    element.textContent = demoBadgeText(parts)
    element.hidden = parts.size === 0
  }
}
