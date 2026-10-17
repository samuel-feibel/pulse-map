import { describe, expect, test } from 'vitest'
import { moveAlong } from './motion'
import { LOGAN } from '../cities/boston/airport'
import { matchRunway as matchOn } from './runways'

const LOGAN_RUNWAYS = LOGAN.runways
const matchRunway = (position: { lng: number; lat: number }, track: number) => matchOn(position, track, LOGAN_RUNWAYS)

const runway04R = LOGAN_RUNWAYS.find((r) => r.ends[0].name === '04R')!
const [threshold04R] = runway04R.ends

describe('matchRunway', () => {
  test('finds the runway a plane is lined up with, oriented in its direction of travel', () => {
    const onFinal = moveAlong(threshold04R.position, 200, 2000)
    const match = matchRunway(onFinal, 20)
    expect(match?.from.name).toBe('04R')
    expect(match?.to.name).toBe('22L')
  })

  test('orients the same runway the other way for traffic heading south-west', () => {
    const departing = moveAlong(threshold04R.position, 200, 1000)
    const match = matchRunway(departing, 200)
    expect(match?.from.name).toBe('22L')
  })

  test('finds nothing for a plane crossing at an angle or far away', () => {
    expect(matchRunway(moveAlong(threshold04R.position, 200, 2000), 110)).toBeNull()
    expect(matchRunway({ lng: -71.3, lat: 42.5 }, 20)).toBeNull()
  })
})
