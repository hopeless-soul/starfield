import { describe, expect, it } from 'vitest'
import { mulberry32, randRange } from '../prng'

describe('mulberry32', () => {
  it('is deterministic for the same seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    const seqA = Array.from({ length: 10 }, () => a())
    const seqB = Array.from({ length: 10 }, () => b())
    expect(seqA).toEqual(seqB)
  })

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    const seqA = Array.from({ length: 10 }, () => a())
    const seqB = Array.from({ length: 10 }, () => b())
    expect(seqA).not.toEqual(seqB)
  })

  it('yields floats in [0, 1)', () => {
    const rng = mulberry32(123)
    for (let i = 0; i < 1000; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('randRange', () => {
  it('stays within [min, max)', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 1000; i++) {
      const v = randRange(rng, -5, 12)
      expect(v).toBeGreaterThanOrEqual(-5)
      expect(v).toBeLessThan(12)
    }
  })
})
