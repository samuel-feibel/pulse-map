import type { Airport } from '../../planes/airport'
import { runwayEnd as end } from '../../planes/runways'

/** Boston Logan. Runway threshold coordinates from OurAirports. */
export const LOGAN: Airport = {
  code: 'BOS',
  reference: { lng: -71.0096, lat: 42.3656 },
  runways: [
    { ends: [end('04L', 42.357997, -71.014344), end('22R', 42.378322, -71.004511)] },
    { ends: [end('04R', 42.351064, -71.011801), end('22L', 42.376923, -70.999288)] },
    { ends: [end('09', 42.355801, -71.012901), end('27', 42.360199, -70.987701)] },
    { ends: [end('14', 42.356602, -71.0233), end('32', 42.348598, -71.008202)] },
    { ends: [end('15L', 42.3736, -71.009102), end('33R', 42.368599, -71.002502)] },
    { ends: [end('15R', 42.374298, -71.017899), end('33L', 42.354599, -70.9916)] },
  ],
  demo: { arrivalRunway: '04R', departureRunway: '22R' },
}
