import { describe, expect, it } from 'vitest'
import { CLOSE_LAYER, FAR_LAYER, SCROLL_TO_ANGULAR, SCROLL_TO_DRIFT, SEEDS } from '../config'
import { approach, createStars, projectStar, updateStars } from '../engine'
import type { Star } from '../types'

const makeStar = (overrides: Partial<Star> = {}): Star => ({
  angle: 0,
  radius: 0.5,
  speed: 0.05,
  size: 2,
  ...overrides,
})

describe('createStars', () => {
  it('creates the configured number of stars', () => {
    expect(createStars(CLOSE_LAYER, SEEDS, 0)).toHaveLength(CLOSE_LAYER.count)
    expect(createStars(FAR_LAYER, SEEDS, 1)).toHaveLength(FAR_LAYER.count)
  })

  it('keeps sizes and speeds within the layer ranges', () => {
    for (const star of createStars(CLOSE_LAYER, SEEDS, 0)) {
      expect(star.size).toBeGreaterThanOrEqual(CLOSE_LAYER.sizeMin)
      expect(star.size).toBeLessThanOrEqual(CLOSE_LAYER.sizeMax)
      expect(star.speed).toBeGreaterThanOrEqual(CLOSE_LAYER.speedMin)
      expect(star.speed).toBeLessThanOrEqual(CLOSE_LAYER.speedMax)
      expect(star.radius).toBeGreaterThan(0)
      expect(star.radius).toBeLessThanOrEqual(1)
    }
  })

  it('is deterministic for fixed seeds', () => {
    expect(createStars(CLOSE_LAYER, SEEDS, 0)).toEqual(createStars(CLOSE_LAYER, SEEDS, 0))
  })

  it('draws size and speed from independent seed streams', () => {
    const base = createStars(CLOSE_LAYER, SEEDS, 0)
    const differentSizeSeed = createStars(CLOSE_LAYER, { ...SEEDS, size: SEEDS.size + 1 }, 0)
    expect(differentSizeSeed.map((s) => s.size)).not.toEqual(base.map((s) => s.size))
    expect(differentSizeSeed.map((s) => s.speed)).toEqual(base.map((s) => s.speed))
    expect(differentSizeSeed.map((s) => s.angle)).toEqual(base.map((s) => s.angle))
  })
})

describe('updateStars', () => {
  it('advances angle by speed * speedMult * dt when scroll is zero', () => {
    const star = makeStar({ speed: 0.05 })
    updateStars([star], CLOSE_LAYER, 0, 2)
    expect(star.angle).toBeCloseTo(0.05 * CLOSE_LAYER.speedMult * 2, 10)
  })

  it('applies each layer’s speed and scroll multipliers', () => {
    const scroll = 500
    const dt = 1
    for (const layer of [CLOSE_LAYER, FAR_LAYER]) {
      const star = makeStar({ speed: 0.05 })
      updateStars([star], layer, scroll, dt)
      expect(star.angle).toBeCloseTo(
        (0.05 * layer.speedMult + scroll * layer.scrollMult * SCROLL_TO_ANGULAR) * dt,
        10,
      )
    }
  })

  it('reverses the scroll contribution for negative scroll speed', () => {
    const star = makeStar({ speed: 0 })
    updateStars([star], CLOSE_LAYER, -500, 1)
    expect(star.angle).toBeCloseTo(-500 * CLOSE_LAYER.scrollMult * SCROLL_TO_ANGULAR, 10)
  })
})

describe('approach', () => {
  it('returns the target when within maxDelta', () => {
    expect(approach(10, 12, 5)).toBe(12)
    expect(approach(10, 7, 5)).toBe(7)
  })

  it('limits the step to maxDelta in either direction', () => {
    expect(approach(0, 1000, 30)).toBe(30)
    expect(approach(0, -1000, 30)).toBe(-30)
  })

  it('is stable at the target', () => {
    expect(approach(42, 42, 5)).toBe(42)
  })

  it('does not move for zero or negative maxDelta (garbage frame times)', () => {
    expect(approach(10, 500, 0)).toBe(10)
    expect(approach(10, 500, -1e12)).toBe(10)
    expect(approach(10, 10, -1e12)).toBe(10)
  })
})

describe('projectStar', () => {
  const cx = 400
  const cy = 300
  const maxRadius = 500

  it('places close-layer stars on a circle around the center', () => {
    const star = makeStar({ angle: Math.PI / 3, radius: 0.8 })
    const { x, y } = projectStar(star, CLOSE_LAYER, 0, cx, cy, maxRadius)
    const dist = Math.hypot(x - cx, y - cy)
    expect(dist).toBeCloseTo(0.8 * maxRadius, 8)
  })

  it('stretches the far layer y-offset by 1.5 (oval orbit)', () => {
    expect(FAR_LAYER.yScale).toBe(1.5)
    const star = makeStar({ angle: Math.PI / 4, radius: 0.6 })
    const close = projectStar(star, CLOSE_LAYER, 0, cx, cy, maxRadius)
    const far = projectStar(star, FAR_LAYER, 0, cx, cy, maxRadius)
    expect(far.x).toBeCloseTo(close.x, 8)
    expect(far.y - cy).toBeCloseTo((close.y - cy) * 1.5, 8)
  })

  it('adds a pure vertical drift scaled by the layer driftMult', () => {
    const star = makeStar({ angle: 1.1, radius: 0.4 })
    const rest = projectStar(star, CLOSE_LAYER, 0, cx, cy, maxRadius)
    const scrolled = projectStar(star, CLOSE_LAYER, 200, cx, cy, maxRadius)
    expect(scrolled.x).toBe(rest.x)
    expect(scrolled.y - rest.y).toBeCloseTo(200 * CLOSE_LAYER.driftMult * SCROLL_TO_DRIFT, 8)
  })

  it('drift is independent of scrollMult and differs per layer via driftMult', () => {
    const star = makeStar({ angle: 0, radius: 0.4 })
    const layer = { ...CLOSE_LAYER, scrollMult: 99, driftMult: 2 }
    const rest = projectStar(star, layer, 0, cx, cy, maxRadius)
    const scrolled = projectStar(star, layer, 100, cx, cy, maxRadius)
    expect(scrolled.y - rest.y).toBeCloseTo(100 * 2 * SCROLL_TO_DRIFT, 8)
  })
})
