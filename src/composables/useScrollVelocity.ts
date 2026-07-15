import { createAnimatable, utils } from 'animejs'

const WHEEL_GAIN = 1
const MAX_SPEED = 3000
/** How long anime eases toward a new wheel target (ms). */
const SMOOTH_DURATION = 350
/** Idle time after the last wheel event before gliding back to rest (ms). */
const DECAY_DELAY = 150
/** How long the glide back to zero takes (ms). */
const DECAY_DURATION = 1200

export interface ScrollVelocity {
  /** Current smoothed scroll speed (positive = scrolling down). */
  readonly speed: number
  destroy(): void
}

/**
 * Accumulates wheel deltas into a target velocity and lets anime.js smooth
 * the actual value toward it; after a short idle it eases back to zero.
 * Framework-free so it can be unit-tested; the caller owns the lifecycle
 * (call destroy() on unmount).
 */
export function useScrollVelocity(target: EventTarget = window): ScrollVelocity {
  const state = { speed: 0 }
  const animatable = createAnimatable(state, {
    speed: SMOOTH_DURATION,
    ease: 'out(2)',
  })
  // AnimatableObject uses an index signature, so grab the property once and
  // assert it exists (createAnimatable always defines it for `speed` above).
  const animateSpeed = animatable.speed!
  let decayTimeout: ReturnType<typeof setTimeout> | undefined

  const onWheel = (event: Event) => {
    const delta = (event as WheelEvent).deltaY * WHEEL_GAIN
    animateSpeed(utils.clamp(state.speed + delta, -MAX_SPEED, MAX_SPEED))
    clearTimeout(decayTimeout)
    decayTimeout = setTimeout(() => animateSpeed(0, DECAY_DURATION), DECAY_DELAY)
  }
  target.addEventListener('wheel', onWheel, { passive: true })

  return {
    get speed() {
      return state.speed
    },
    destroy() {
      target.removeEventListener('wheel', onWheel)
      clearTimeout(decayTimeout)
      animatable.revert()
    },
  }
}
