import { describe, expect, test } from 'vitest'
import { parseStations } from './stations'

const stop = (id: string, latitude: unknown, longitude: unknown) => ({
  type: 'stop',
  id,
  attributes: { name: id, latitude, longitude },
})

describe('parseStations', () => {
  test('maps stops to id and position', () => {
    expect(parseStations({ data: [stop('place-north', 42.3656, -71.0613)] })).toEqual([
      { id: 'place-north', position: { lng: -71.0613, lat: 42.3656 } },
    ])
  })

  test('skips stops without a position', () => {
    expect(parseStations({ data: [stop('place-x', null, -71)] })).toEqual([])
  })

  test('throws on a response that is not JSON:API', () => {
    expect(() => parseStations(null)).toThrow()
  })
})
