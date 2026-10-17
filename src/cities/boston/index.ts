import { createMbtaProvider } from '../../mbta/provider'
import type { City } from '../types'
import { LOGAN } from './airport'
import { BOSTON_TEAMS } from './sports'

/** All MBTA subway routes: Red, Mattapan, Orange, Green B–E, Blue. */
const SUBWAY_ROUTE_IDS = ['Red', 'Mattapan', 'Orange', 'Green-B', 'Green-C', 'Green-D', 'Green-E', 'Blue']

const TD_GARDEN = { lng: -71.0621, lat: 42.3662 }
const HARVARD_SQUARE = { lng: -71.1189, lat: 42.3734 }

export const BOSTON: City = {
  id: 'boston',
  name: 'Boston',
  frame: {
    // The Garden in the middle, wide enough for Harvard Square and every Logan runway end.
    center: TD_GARDEN,
    mustShow: [HARVARD_SQUARE, ...LOGAN.runways.flatMap((runway) => runway.ends.map((end) => end.position))],
    // Room for planes approaching Logan and their labels.
    marginMeters: 600,
  },
  transit: createMbtaProvider(SUBWAY_ROUTE_IDS),
  sportsTeams: BOSTON_TEAMS,
  airport: LOGAN,
}
