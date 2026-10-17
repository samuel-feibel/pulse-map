export interface WindVector {
  /** km/h toward the east (negative = toward the west). */
  readonly east: number
  /** km/h toward the north (negative = toward the south). */
  readonly north: number
}

/** Converts "blowing from" direction and speed into the direction the air is moving. */
export function windVector(speedKmh: number, fromDegrees: number): WindVector {
  if (speedKmh === 0) {
    return { east: 0, north: 0 }
  }
  const towardRadians = ((fromDegrees + 180) * Math.PI) / 180
  return { east: speedKmh * Math.sin(towardRadians), north: speedKmh * Math.cos(towardRadians) }
}
