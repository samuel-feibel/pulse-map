import type { LngLat } from '../geo'
import type { Airport } from '../planes/airport'
import type { Team } from '../sports/teams'
import type { TransitProvider } from '../transit/types'

/** What part of the city the square wall shows. */
export interface CityFrame {
  /** The middle of the wall. */
  readonly center: LngLat
  /** Places that must fit on the wall; it's sized to the farthest one. */
  readonly mustShow: readonly LngLat[]
  /** Extra room beyond the farthest must-show place. */
  readonly marginMeters: number
}

/**
 * Everything specific to one city. Features are optional: leave one out and the wall simply
 * doesn't show it there (weather is always on, at the frame's center).
 */
export interface City {
  /** Used in the URL: `?city=<id>`. */
  readonly id: string
  readonly name: string
  readonly frame: CityFrame
  readonly transit?: TransitProvider
  readonly sportsTeams?: readonly Team[]
  readonly airport?: Airport
}
