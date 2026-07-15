import { afterEach, describe, expect, it } from 'vitest'
import {
  DECAY_DELAY,
  DECAY_DURATION,
  useScrollVelocity,
  type ScrollVelocity,
} from '../useScrollVelocity'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function wheel(target: EventTarget, deltaY: number) {
  // Node has no WheelEvent; a plain Event with deltaY attached matches
  // everything the composable reads.
  const event = new Event('wheel')
  Object.assign(event, { deltaY })
  target.dispatchEvent(event)
}

function touch(
  target: EventTarget,
  type: 'touchstart' | 'touchmove' | 'touchend',
  clientY = 0,
  identifier = 0,
) {
  // Same trick for TouchEvent: only touches[0].clientY/identifier are read.
  const event = new Event(type)
  Object.assign(event, { touches: type === 'touchend' ? [] : [{ clientY, identifier }] })
  target.dispatchEvent(event)
}

describe('useScrollVelocity', () => {
  let velocity: ScrollVelocity | undefined

  afterEach(() => {
    velocity?.destroy()
    velocity = undefined
  })

  it('ramps up gradually instead of jumping to the wheel delta', async () => {
    const target = new EventTarget()
    velocity = useScrollVelocity(target)

    wheel(target, 500)
    expect(Math.abs(velocity.speed)).toBeLessThan(50) // no instant jump

    await sleep(120)
    const mid = velocity.speed
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThanOrEqual(500)
  })

  it('preserves the scroll direction sign', async () => {
    const target = new EventTarget()
    velocity = useScrollVelocity(target)

    wheel(target, -300)
    await sleep(120)
    expect(velocity.speed).toBeLessThan(0)
  })

  it('ramps up positive on an upward finger drag (scroll down)', async () => {
    const target = new EventTarget()
    velocity = useScrollVelocity(target)

    touch(target, 'touchstart', 500)
    touch(target, 'touchmove', 460)
    touch(target, 'touchmove', 420)
    expect(Math.abs(velocity.speed)).toBeLessThan(50) // no instant jump
    touch(target, 'touchend')

    await sleep(120)
    expect(velocity.speed).toBeGreaterThan(0)
  })

  it('goes negative on a downward finger drag (scroll up)', async () => {
    const target = new EventTarget()
    velocity = useScrollVelocity(target)

    touch(target, 'touchstart', 200)
    touch(target, 'touchmove', 260)
    touch(target, 'touchend')

    await sleep(120)
    expect(velocity.speed).toBeLessThan(0)
  })

  it('ignores touchmove without a preceding touchstart', async () => {
    const target = new EventTarget()
    velocity = useScrollVelocity(target)

    touch(target, 'touchmove', 300)
    await sleep(120)
    expect(velocity.speed).toBe(0)
  })

  it('re-seeds instead of computing a delta when the tracked finger changes', async () => {
    const target = new EventTarget()
    velocity = useScrollVelocity(target)

    touch(target, 'touchstart', 500, 1)
    touch(target, 'touchmove', 490, 1) // small legit delta: +10
    // touches[0] becomes a different finger far away — must not read as a
    // 440px swipe.
    touch(target, 'touchmove', 50, 2)
    touch(target, 'touchmove', 45, 2) // small legit delta on the new finger

    await sleep(400)
    expect(velocity.speed).toBeGreaterThan(0)
    expect(velocity.speed).toBeLessThan(100) // only the two small deltas
  })

  it('does not let a small delta override a higher pending target', async () => {
    const target = new EventTarget()
    velocity = useScrollVelocity(target)

    wheel(target, 1000)
    await sleep(100) // smoothed value still well below the 1000 target
    const mid = velocity.speed
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(1000)

    // A gentle follow-up input must keep easing toward ~1005, not retarget
    // down to "current smoothed value + 5".
    wheel(target, 5)
    await sleep(400)
    expect(velocity.speed).toBeGreaterThan(mid + 50)
  })

  it('decays back toward zero after input stops', async () => {
    const target = new EventTarget()
    velocity = useScrollVelocity(target)

    wheel(target, 400)
    await sleep(300)
    const peak = Math.abs(velocity.speed)
    expect(peak).toBeGreaterThan(0)

    // idle delay + full glide back to zero + margin
    await sleep(DECAY_DELAY + DECAY_DURATION + 300)
    expect(Math.abs(velocity.speed)).toBeLessThan(peak * 0.05)
    expect(Math.abs(velocity.speed)).toBeLessThan(5)
  })
})
