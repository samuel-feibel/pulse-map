import type { Airport } from '../../planes/airport'
import { runwayEnd as end } from '../../planes/runways'

/** San Francisco International. Runway threshold coordinates from OurAirports. */
export const SFO: Airport = {
  code: 'SFO',
  reference: { lng: -122.375, lat: 37.6189 },
  runways: [
    { ends: [end('10L', 37.628742, -122.39341), end('28R', 37.613538, -122.35716)] },
    { ends: [end('10R', 37.626298, -122.393124), end('28L', 37.61172, -122.358367)] },
    { ends: [end('1L', 37.607898, -122.38295), end('19R', 37.626476, -122.37063)] },
    { ends: [end('1R', 37.606333, -122.381061), end('19L', 37.627346, -122.367124)] },
  ],
  // SFO's usual flow: arrivals land westbound on the 28s over the bay, departures climb north off the 1s.
  demo: { arrivalRunway: '28L', departureRunway: '1R' },
}
