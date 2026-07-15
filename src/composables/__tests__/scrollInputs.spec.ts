import { describe, expect, it } from 'vitest'
import { touchInput, wheelInput } from '../scrollInputs'

function wheel(target: EventTarget, deltaY: number) {
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
  const event = new Event(type)
  Object.assign(event, { touches: type === 'touchend' ? [] : [{ clientY, identifier }] })
  target.dispatchEvent(event)
}

function collect(): { deltas: number[]; emit: (delta: number) => void } {
  const deltas: number[] = []
  return { deltas, emit: (delta) => deltas.push(delta) }
}

describe('wheelInput', () => {
  it('forwards deltaY scaled by the default gain', () => {
    const target = new EventTarget()
    const { deltas, emit } = collect()
    const detach = wheelInput()(target, emit)

    wheel(target, 120)
    wheel(target, -50)
    expect(deltas).toEqual([120, -50])
    detach()
  })

  it('applies a custom gain', () => {
    const target = new EventTarget()
    const { deltas, emit } = collect()
    const detach = wheelInput({ gain: 2 })(target, emit)

    wheel(target, 100)
    expect(deltas).toEqual([200])
    detach()
  })

  it('stops emitting after detach', () => {
    const target = new EventTarget()
    const { deltas, emit } = collect()
    const detach = wheelInput()(target, emit)

    detach()
    wheel(target, 100)
    expect(deltas).toEqual([])
  })
})

describe('touchInput', () => {
  it('emits positive deltas for an upward drag (scroll down)', () => {
    const target = new EventTarget()
    const { deltas, emit } = collect()
    const detach = touchInput({ gain: 1 })(target, emit)

    touch(target, 'touchstart', 500)
    touch(target, 'touchmove', 460)
    touch(target, 'touchmove', 430)
    expect(deltas).toEqual([40, 30])
    detach()
  })

  it('emits negative deltas for a downward drag (scroll up)', () => {
    const target = new EventTarget()
    const { deltas, emit } = collect()
    const detach = touchInput({ gain: 1 })(target, emit)

    touch(target, 'touchstart', 200)
    touch(target, 'touchmove', 260)
    expect(deltas).toEqual([-60])
    detach()
  })

  it('applies the gain to drag distances', () => {
    const target = new EventTarget()
    const { deltas, emit } = collect()
    const detach = touchInput({ gain: 1.5 })(target, emit)

    touch(target, 'touchstart', 100)
    touch(target, 'touchmove', 90)
    expect(deltas).toEqual([15])
    detach()
  })

  it('ignores touchmove without a preceding touchstart', () => {
    const target = new EventTarget()
    const { deltas, emit } = collect()
    const detach = touchInput()(target, emit)

    touch(target, 'touchmove', 300)
    expect(deltas).toEqual([])
    detach()
  })

  it('re-seeds instead of emitting when the tracked finger changes', () => {
    const target = new EventTarget()
    const { deltas, emit } = collect()
    const detach = touchInput({ gain: 1 })(target, emit)

    touch(target, 'touchstart', 500, 1)
    touch(target, 'touchmove', 490, 1) // legit: +10
    touch(target, 'touchmove', 50, 2) // finger switch: no delta
    touch(target, 'touchmove', 45, 2) // legit on new finger: +5
    expect(deltas).toEqual([10, 5])
    detach()
  })

  it('re-seeds on touchend so the next gesture starts clean', () => {
    const target = new EventTarget()
    const { deltas, emit } = collect()
    const detach = touchInput({ gain: 1 })(target, emit)

    touch(target, 'touchstart', 500)
    touch(target, 'touchmove', 480) // +20
    touch(target, 'touchend')
    touch(target, 'touchmove', 100) // stale state must not produce a delta
    expect(deltas).toEqual([20])
    detach()
  })

  it('stops emitting after detach', () => {
    const target = new EventTarget()
    const { deltas, emit } = collect()
    const detach = touchInput()(target, emit)

    touch(target, 'touchstart', 500)
    detach()
    touch(target, 'touchmove', 400)
    expect(deltas).toEqual([])
  })
})
