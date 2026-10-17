import { combineTransit } from '../../transit/combine'
import { createServerTransit } from '../../transit/serverProvider'
import type { City } from '../types'
import { SFO } from './airport'
import { SAN_FRANCISCO_TEAMS } from './sports'

/** Alcatraz's north shore: the top edge of the wall. */
const ALCATRAZ = { lng: -122.4229, lat: 37.8282 }
/** The south end of SFO's runway 1R: the bottom edge. */
const SFO_SOUTH_END = { lng: -122.381061, lat: 37.606333 }
/** Seal Rocks off Lands End, the city's westernmost point: the left edge. */
const SEAL_ROCKS = { lng: -122.515, lat: 37.7786 }

/**
 * Muni rail: Metro light rail (J K L M N T), the F streetcar, and the three cable car lines. Live positions
 * come from 511.org (needs TRANSIT_511_API_KEY in .env.local); shapes and stations from Muni's schedule data.
 */
const MUNI = createServerTransit({
  agency: 'SF',
  routes: ['J', 'K', 'L', 'M', 'N', 'T', 'F', 'PH', 'PM', 'CA'],
  trains: { kind: 'live' },
})

const PACIFIC = 'America/Los_Angeles'

/** BART publishes no live train positions, so its trains run on BART's published timetable. */
const BART = createServerTransit({ agency: 'BA', trains: { kind: 'timetable', timeZone: PACIFIC } })

/** Caltrain, also on its timetable: live positions would push 511 use past its 60/hour limit. */
const CALTRAIN = createServerTransit({ agency: 'CT', trains: { kind: 'timetable', timeZone: PACIFIC } })

/**
 * San Francisco: Muni, BART and Caltrain, planes at SFO, and the Giants, Warriors and Valkyries.
 *
 * The square runs from Alcatraz (top) to SFO (bottom). Its center is shifted west so the whole city fits
 * with Seal Rocks at the left edge, which leaves the right edge in Oakland (just past Lake Merritt).
 */
export const SAN_FRANCISCO: City = {
  id: 'sf',
  name: 'San Francisco',
  frame: {
    // Halfway between Alcatraz and SFO, and as far west as keeps Seal Rocks on the wall.
    center: { lng: -122.3748, lat: 37.7173 },
    mustShow: [ALCATRAZ, SFO_SOUTH_END, SEAL_ROCKS],
    marginMeters: 400,
  },
  transit: combineTransit([MUNI, BART, CALTRAIN]),
  sportsTeams: SAN_FRANCISCO_TEAMS,
  airport: SFO,
}
