export interface ServiceClock {
  /** The agency's local date, YYYYMMDD. */
  readonly today: string
  readonly yesterday: string
  /** Seconds since the agency's local midnight. */
  readonly seconds: number
}

const pad = (n: number): string => String(n).padStart(2, '0')
const ymd = (y: number, m: number, d: number): string => `${y}${pad(m)}${pad(d)}`

/** Local date and time in an agency's timezone, for reading its timetable. */
export function serviceClock(now: Date, timeZone: string): ServiceClock {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, Number(p.value)]),
  )
  const before = new Date(Date.UTC(parts.year, parts.month - 1, parts.day - 1))
  return {
    today: ymd(parts.year, parts.month, parts.day),
    yesterday: ymd(before.getUTCFullYear(), before.getUTCMonth() + 1, before.getUTCDate()),
    seconds: parts.hour * 3600 + parts.minute * 60 + parts.second,
  }
}
