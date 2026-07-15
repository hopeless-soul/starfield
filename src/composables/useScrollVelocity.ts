import { createAnimatable, utils } from 'animejs'

const WHEEL_GAIN = 1
/** Touchmove deltas are a few px per event vs ~100 per wheel notch. */
const TOUCH_GAIN = 2
const MAX_SPEED = 3000
/** How long anime eases toward a new wheel target (ms). */
const SMOOTH_DURATION = 350
/** Idle time after the last wheel event before gliding back to rest (ms). */
export const DECAY_DELAY = 150
/** How long the glide back to zero takes (ms). */
export const DECAY_DURATION = 2400

export interface ScrollVelocity {
  /** Current smoothed scroll speed (positive = scrolling down). */
  readonly speed: number
  destroy(): void
}

/**
 * Accumulates wheel and touch-drag deltas into a target velocity and lets
 * anime.js smooth the actual value toward it; after a short idle it eases
 * back to zero. Framework-free so it can be unit-tested; the caller owns
 * the lifecycle (call destroy() on unmount).
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

  const applyDelta = (delta: number) => {
    animateSpeed(utils.clamp(state.speed + delta, -MAX_SPEED, MAX_SPEED))
    clearTimeout(decayTimeout)
    decayTimeout = setTimeout(() => animateSpeed(0, DECAY_DURATION), DECAY_DELAY)
  }

  const onWheel = (event: Event) => {
    applyDelta((event as WheelEvent).deltaY * WHEEL_GAIN)
  }

  let lastTouchY: number | undefined

  const onTouchStart = (event: Event) => {
    lastTouchY = (event as TouchEvent).touches[0]?.clientY
  }

  const onTouchMove = (event: Event) => {
    const touchY = (event as TouchEvent).touches[0]?.clientY
    if (touchY === undefined || lastTouchY === undefined) return
    // Finger up = scrolling down = positive, matching wheel deltaY semantics.
    applyDelta((lastTouchY - touchY) * TOUCH_GAIN)
    lastTouchY = touchY
  }

  const onTouchEnd = () => {
    lastTouchY = undefined
  }

  target.addEventListener('wheel', onWheel, { passive: true })
  target.addEventListener('touchstart', onTouchStart, { passive: true })
  target.addEventListener('touchmove', onTouchMove, { passive: true })
  target.addEventListener('touchend', onTouchEnd, { passive: true })
  target.addEventListener('touchcancel', onTouchEnd, { passive: true })

  return {
    get speed() {
      return state.speed
    },
    destroy() {
      target.removeEventListener('wheel', onWheel)
      target.removeEventListener('touchstart', onTouchStart)
      target.removeEventListener('touchmove', onTouchMove)
      target.removeEventListener('touchend', onTouchEnd)
      target.removeEventListener('touchcancel', onTouchEnd)
      clearTimeout(decayTimeout)
      animatable.revert()
    },
  }
}
