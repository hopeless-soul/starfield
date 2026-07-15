import { SCROLL_TO_ANGULAR, SCROLL_TO_DRIFT } from './config'
import { mulberry32, randRange } from './prng'
import type { LayerConfig, SeedSet, Star } from './types'

const TWO_PI = Math.PI * 2
const MIN_RADIUS = 0.05

/**
 * Builds a layer's stars from three independent seeded streams. The layer
 * index offsets each seed so layers get distinct but reproducible fields.
 */
export function createStars(layer: LayerConfig, seeds: SeedSet, layerIndex: number): Star[] {
  const positionRng = mulberry32(seeds.position + layerIndex)
  const sizeRng = mulberry32(seeds.size + layerIndex)
  const speedRng = mulberry32(seeds.speed + layerIndex)
  return Array.from({ length: layer.count }, () => ({
    angle: randRange(positionRng, 0, TWO_PI),
    radius: randRange(positionRng, MIN_RADIUS, 1),
    size: randRange(sizeRng, layer.sizeMin, layer.sizeMax),
    speed: randRange(speedRng, layer.speedMin, layer.speedMax),
  }))
}

/**
 * Moves current toward target by at most maxDelta. Used to slew-limit the
 * rendered scroll speed: after a frame stall the smoothed value may have
 * jumped far ahead, and the drift offset is a direct function of it, so an
 * unbounded step would teleport every star vertically.
 */
export function approach(current: number, target: number, maxDelta: number): number {
  return current + Math.min(Math.max(target - current, -maxDelta), maxDelta)
}

/** Advances orbit angles: base speed plus scroll contribution, scaled by dt (s). */
export function updateStars(
  stars: Star[],
  layer: LayerConfig,
  scrollSpeed: number,
  dt: number,
): void {
  const scrollAngular = scrollSpeed * layer.scrollMult * SCROLL_TO_ANGULAR
  for (const star of stars) {
    star.angle += (star.speed * layer.speedMult + scrollAngular) * dt
  }
}

/**
 * Projects a star's polar state to canvas coordinates: circular/oval orbit
 * around the center plus the additional (0, scroll drift) vector.
 */
export function projectStar(
  star: Star,
  layer: LayerConfig,
  scrollSpeed: number,
  cx: number,
  cy: number,
  maxRadius: number,
): { x: number; y: number } {
  const r = star.radius * maxRadius
  return {
    x: cx + Math.cos(star.angle) * r,
    y:
      cy +
      Math.sin(star.angle) * r * layer.yScale +
      scrollSpeed * layer.driftMult * SCROLL_TO_DRIFT,
  }
}

export function drawStars(
  ctx: CanvasRenderingContext2D,
  stars: Star[],
  layer: LayerConfig,
  scrollSpeed: number,
  width: number,
  height: number,
): void {
  const cx = width / 2
  const cy = height / 2
  // Half-diagonal, so max-radius orbits reach the corners.
  const maxRadius = Math.hypot(cx, cy)
  ctx.fillStyle = layer.color
  for (const star of stars) {
    const { x, y } = projectStar(star, layer, scrollSpeed, cx, cy, maxRadius)
    ctx.beginPath()
    ctx.arc(x, y, star.size, 0, TWO_PI)
    ctx.fill()
  }
}
