import { createAnimatable, utils } from 'animejs'
import { touchInput, wheelInput, type ScrollInput } from './scrollInputs'

const MAX_SPEED = 3000
/** How long anime eases toward a new input target (ms). */
const SMOOTH_DURATION = 350
/** Idle time after the last input before gliding back to rest (ms). */
export const DECAY_DELAY = 150
/** How long the glide back to zero takes (ms). */
export const DECAY_DURATION = 2400

export interface ScrollVelocity {
  /** Current smoothed scroll speed (positive = scrolling down). */
  readonly speed: number
  destroy(): void
}

/**
 * Accumulates deltas from the given input sources into a target velocity and
 * lets anime.js smooth the actual value toward it; after a short idle it
 * eases back to zero. The page decides which inputs feed it (defaults to
 * wheel + touch). Framework-free so it can be unit-tested; the caller owns
 * the lifecycle (call destroy() on unmount).
 *
 * There is no runtime device detection: every source in `sources` is
 * attached and stays active for the lifetime of this instance. With the
 * default, both wheel and touch listeners are registered on every device —
 * the source whose events never fire simply stays silent. To restrict or
 * tune inputs, pass an explicit array, e.g.
 * `useScrollVelocity(window, [touchInput({ gain: 2 })])`.
 */
export function useScrollVelocity(
  target: EventTarget = window,
  sources: ScrollInput[] = [wheelInput(), touchInput()],
): ScrollVelocity {
  const state = { speed: 0 }
  const animatable = createAnimatable(state, {
    speed: SMOOTH_DURATION,
    ease: 'out(2)',
  })
  // AnimatableObject uses an index signature, so grab the property once and
  // assert it exists (createAnimatable always defines it for `speed` above).
  const animateSpeed = animatable.speed!
  let decayTimeout: ReturnType<typeof setTimeout> | undefined
  // Accumulate on an explicit target rather than the smoothed state.speed:
  // the smoothed value lags behind, so "state.speed + small delta" would let
  // a gentle input override a higher target still being eased toward.
  let targetSpeed = 0
  let decaying = false

  const applyDelta = (delta: number) => {
    if (decaying) {
      // Resume from wherever the glide-to-zero has actually reached.
      targetSpeed = state.speed
      decaying = false
    }
    targetSpeed = utils.clamp(targetSpeed + delta, -MAX_SPEED, MAX_SPEED)
    animateSpeed(targetSpeed)
    clearTimeout(decayTimeout)
    decayTimeout = setTimeout(() => {
      decaying = true
      targetSpeed = 0
      animateSpeed(0, DECAY_DURATION)
    }, DECAY_DELAY)
  }

  // Attach every source unconditionally; all of them feed the same sink.
  const detachFns = sources.map((source) => source(target, applyDelta))

  return {
    get speed() {
      return state.speed
    },
    destroy() {
      for (const detach of detachFns) detach()
      clearTimeout(decayTimeout)
      animatable.revert()
    },
  }
}
