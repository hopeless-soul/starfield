import type { LayerConfig, SeedSet } from './types'

// Size and speed are drawn from independent PRNG streams with their own
// global seeds, so tweaking one distribution never reshuffles the other.
export const SEEDS: SeedSet = {
  position: 1337,
  size: 20260715,
  speed: 987654321,
}

/** Converts smoothed scroll speed into extra angular speed (rad/s per unit). */
export const SCROLL_TO_ANGULAR = 0.0006
/** Converts smoothed scroll speed into vertical drift (px per unit). */
export const SCROLL_TO_DRIFT = 0.35

/** Layer 1 — close stars: circular orbits, larger and brighter. */
export const CLOSE_LAYER: LayerConfig = {
  count: 70,
  sizeMin: 1.4,
  sizeMax: 2.8,
  speedMin: 0.02,
  speedMax: 0.07,
  yScale: 1,
  speedMult: 1,
  scrollMult: 1,
  color: 'rgba(255, 255, 255, 0.9)',
}

/** Layer 2 — far stars: oval orbits (y × 1.5), faster multipliers, dimmer. */
export const FAR_LAYER: LayerConfig = {
  count: 140,
  sizeMin: 0.5,
  sizeMax: 1.4,
  speedMin: 0.02,
  speedMax: 0.07,
  yScale: 1.5,
  speedMult: 1.1,
  scrollMult: 1.2,
  color: 'rgba(255, 255, 255, 0.45)',
}

/** Draw order: far layer first so close stars render on top. */
export const LAYERS: LayerConfig[] = [FAR_LAYER, CLOSE_LAYER]
