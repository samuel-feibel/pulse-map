import { BOSTON } from './boston'
import { SAN_FRANCISCO } from './sanFrancisco'
import type { City } from './types'

export type { City } from './types'

/** Every city the wall knows. Add a folder under src/cities/ and list it here. */
export const CITIES: readonly City[] = [BOSTON, SAN_FRANCISCO]

const DEFAULT_CITY = BOSTON

/** `?city=sf` picks San Francisco; no (or an unknown) city means Boston. */
export function cityFromUrl(search: string): City {
  const requested = new URLSearchParams(search).get('city')
  return CITIES.find((city) => city.id === requested) ?? DEFAULT_CITY
}
