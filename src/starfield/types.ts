export interface Star {
  /** Orbit angle around the canvas center, in radians. */
  angle: number
  /** Orbit radius as a fraction of the canvas half-diagonal, in (0, 1]. */
  radius: number
  /** Base angular speed, in radians per second. */
  speed: number
  /** Draw radius in CSS pixels. */
  size: number
}

export interface LayerConfig {
  count: number
  sizeMin: number
  sizeMax: number
  speedMin: number
  speedMax: number
  /** Vertical stretch of the orbit: 1 = circle, >1 = oval. */
  yScale: number
  /** Multiplier applied to each star's base angular speed. */
  speedMult: number
  /** Multiplier applied to the smoothed scroll speed for this layer. */
  scrollMult: number
  color: string
}

export interface SeedSet {
  position: number
  size: number
  speed: number
}
