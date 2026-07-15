import { afterEach, describe, expect, it } from 'vitest'
import { useScrollVelocity, type ScrollVelocity } from '../useScrollVelocity'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function wheel(target: EventTarget, deltaY: number) {
  // Node has no WheelEvent; a plain Event with deltaY attached matches
  // everything the composable reads.
  const event = new Event('wheel')
  Object.assign(event, { deltaY })
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

  it('decays back toward zero after input stops', async () => {
    const target = new EventTarget()
    velocity = useScrollVelocity(target)

    wheel(target, 400)
    await sleep(300)
    const peak = Math.abs(velocity.speed)
    expect(peak).toBeGreaterThan(0)

    // decay delay (150ms) + decay duration (1200ms) + margin
    await sleep(1800)
    expect(Math.abs(velocity.speed)).toBeLessThan(peak * 0.05)
    expect(Math.abs(velocity.speed)).toBeLessThan(5)
  })
})
