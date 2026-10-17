import { describe, expect, test } from 'vitest'
import { serviceClock } from './serviceClock'

describe('serviceClock', () => {
  test("gives the agency's local date and seconds since its midnight", () => {
    // 2026-10-17 23:30:15 UTC is 16:30:15 in San Francisco (PDT, UTC-7).
    const clock = serviceClock(new Date(Date.UTC(2026, 9, 17, 23, 30, 15)), 'America/Los_Angeles')
    expect(clock).toEqual({ today: '20261017', yesterday: '20261016', seconds: 16 * 3600 + 30 * 60 + 15 })
  })

  test('rolls the date over at local midnight, not UTC midnight', () => {
    // 2026-10-18 06:10 UTC is still 23:10 on the 17th in San Francisco.
    expect(serviceClock(new Date(Date.UTC(2026, 9, 18, 6, 10)), 'America/Los_Angeles').today).toBe('20261017')
  })

  test('handles month and year boundaries for yesterday', () => {
    expect(serviceClock(new Date(Date.UTC(2027, 0, 1, 20)), 'America/Los_Angeles').yesterday).toBe('20261231')
  })
})
