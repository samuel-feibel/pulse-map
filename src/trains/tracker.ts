import { distanceMeters, type LngLat } from '../geo'
import type { Vehicle } from '../transit/types'
import { pointAlong, snapToRoute, type TrackShape } from './trackGeometry'

/** Track shapes for each route (several for branching routes like the Red and Green lines). */
export type Network = ReadonlyMap<string, readonly TrackShape[]>

/**
 * Anything farther than this between two updates isn't a train moving (subway trains cover a few hundred
 * meters in 10 seconds). It's a reassigned vehicle or a page waking from sleep, so the train jumps instead.
 */
const MAX_GLIDE_METERS = 1500

interface OnTrack {
  readonly trackIndex: number
  readonly fromAlong: number
  readonly toAlong: number
}

/** A train gliding from where it was drawn to its latest reported position, along its track when possible. */
export interface Track {
  readonly id: string
  readonly routeId: string
  readonly directionId: number | null
  readonly onTrack: OnTrack | null
  /** Straight-line fallback for trains that couldn't be snapped to a track. */
  readonly from: LngLat
  readonly to: LngLat
  readonly startedAt: number
  /** Last known heading, for trains off the track or standing still. */
  readonly bearing: number
}

export type Tracks = ReadonlyMap<string, Track>

export interface TrainFrame {
  readonly position: LngLat
  readonly bearing: number
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const progress = (track: Track, now: number, glideMs: number): number =>
  Math.min(Math.max((now - track.startedAt) / glideMs, 0), 1)

function headingOnTrack(trackBearing: number, track: Track, onTrack: OnTrack): number {
  // Track shapes run in direction 0's order, so direction 1 trains face the other way.
  const isReversed =
    track.directionId === null ? onTrack.toAlong < onTrack.fromAlong : track.directionId === 1
  return isReversed ? (trackBearing + 180) % 360 : trackBearing
}

/** Where to draw a train now, and which way it faces. */
export function trainAt(track: Track, now: number, glideMs: number, network: Network): TrainFrame {
  const t = progress(track, now, glideMs)
  const shape = track.onTrack ? network.get(track.routeId)?.[track.onTrack.trackIndex] : undefined
  if (track.onTrack && shape) {
    const point = pointAlong(shape, lerp(track.onTrack.fromAlong, track.onTrack.toAlong, t))
    return { position: point.position, bearing: headingOnTrack(point.bearing, track, track.onTrack) }
  }
  return { position: { lng: lerp(track.from.lng, track.to.lng, t), lat: lerp(track.from.lat, track.to.lat, t) }, bearing: track.bearing }
}

function nextTrack(existing: Track | undefined, vehicle: Vehicle, now: number, glideMs: number, network: Network): Track {
  const shapes = network.get(vehicle.routeId) ?? []
  const snap = snapToRoute(shapes, vehicle.position, existing?.onTrack?.trackIndex)
  const drawn = existing ? trainAt(existing, now, glideMs, network) : null
  const base = {
    id: vehicle.id,
    routeId: vehicle.routeId,
    directionId: vehicle.directionId,
    to: vehicle.position,
    startedAt: now,
    bearing: drawn?.bearing ?? vehicle.bearing ?? 0,
  }
  const sameTrack = existing?.onTrack && snap && existing.onTrack.trackIndex === snap.trackIndex
  if (existing?.onTrack && snap && sameTrack) {
    const currentAlong = lerp(existing.onTrack.fromAlong, existing.onTrack.toAlong, progress(existing, now, glideMs))
    const fromAlong = Math.abs(snap.along - currentAlong) <= MAX_GLIDE_METERS ? currentAlong : snap.along
    return { ...base, onTrack: { trackIndex: snap.trackIndex, fromAlong, toAlong: snap.along }, from: vehicle.position }
  }
  if (snap) {
    // New train, or it moved onto another branch: start it on the track where it is.
    return { ...base, onTrack: { trackIndex: snap.trackIndex, fromAlong: snap.along, toAlong: snap.along }, from: vehicle.position }
  }
  const canGlide = drawn !== null && distanceMeters(drawn.position, vehicle.position) <= MAX_GLIDE_METERS
  return { ...base, onTrack: null, from: canGlide ? drawn.position : vehicle.position }
}

/** New tracks from a fresh vehicle snapshot. Trains missing from the snapshot are dropped. */
export function updateTracks(
  previous: Tracks,
  vehicles: readonly Vehicle[],
  now: number,
  glideMs: number,
  network: Network,
): Tracks {
  return new Map(vehicles.map((v): [string, Track] => [v.id, nextTrack(previous.get(v.id), v, now, glideMs, network)]))
}
