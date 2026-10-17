import type { LngLat } from '../geo'
import { pointAlong, projectOnto, type TrackShape } from '../trains/trackGeometry'
import type { Vehicle } from './types'

/** One day's scheduled trips for an agency that publishes no live positions (e.g. BART, Caltrain). */
export interface Timetable {
  /** Station id → [lng, lat]. */
  readonly stops: Readonly<Record<string, readonly [number, number]>>
  readonly trips: readonly {
    readonly id: string
    /** The drawn line this trip runs along. */
    readonly lineId: string
    /** [station id, arrive, depart], in seconds after the service day's midnight. */
    readonly stops: readonly (readonly [string, number, number])[]
  }[]
}

type Stop = Timetable['trips'][number]['stops'][number]

const toLngLat = ([lng, lat]: readonly [number, number]): LngLat => ({ lng, lat })

/** Where along the line the train is at `seconds`: waiting at a station, or between two by elapsed time. */
function alongAt(stops: readonly Stop[], alongs: readonly number[], seconds: number): number | null {
  for (let i = 0; i < stops.length; i++) {
    const [, arrive, depart] = stops[i]
    if (seconds >= arrive && seconds <= depart) return alongs[i]
    const next = stops[i + 1]
    if (next && seconds > depart && seconds < next[1]) {
      const t = (seconds - depart) / (next[1] - depart)
      return alongs[i] + (alongs[i + 1] - alongs[i]) * t
    }
  }
  return null
}

/** Trains running at `seconds` (after the service day's midnight), placed on their lines by timetable. */
export function scheduledVehicles(
  timetable: Timetable,
  shapes: ReadonlyMap<string, TrackShape>,
  seconds: number,
): Vehicle[] {
  return timetable.trips.flatMap((trip): Vehicle[] => {
    const shape = shapes.get(trip.lineId)
    const first = trip.stops[0]
    const last = trip.stops.at(-1)
    if (!shape || !first || !last || seconds < first[1] || seconds > last[2]) return []
    const alongs = trip.stops.map(([id]) => {
      const position = timetable.stops[id]
      return position ? projectOnto(shape, toLngLat(position)).along : 0
    })
    const along = alongAt(trip.stops, alongs, seconds)
    if (along === null) return []
    const runsForward = (alongs.at(-1) ?? 0) >= alongs[0]
    return [
      {
        id: trip.id,
        routeId: trip.lineId,
        position: pointAlong(shape, along).position,
        bearing: null,
        directionId: runsForward ? 0 : 1,
      },
    ]
  })
}
