/**
 * A scroll input source: attaches listeners to the target, converts events
 * into signed velocity deltas (positive = scrolling down), reports them via
 * emit, and returns a detach function. All source-private state lives inside.
 */
export type ScrollInput = (target: EventTarget, emit: (delta: number) => void) => () => void

export interface ScrollInputOptions {
  /** Scales the device's native delta units into velocity units. */
  gain?: number
}

const WHEEL_GAIN = 1
/** Touchmove deltas are a few px per event vs ~100 per wheel notch. */
const TOUCH_GAIN = 1.5

/** Mouse wheel / trackpad: forwards deltaY scaled by gain. */
export function wheelInput(options?: ScrollInputOptions): ScrollInput {
  const gain = options?.gain ?? WHEEL_GAIN
  return (target, emit) => {
    const onWheel = (event: Event) => {
      emit((event as WheelEvent).deltaY * gain)
    }
    target.addEventListener('wheel', onWheel, { passive: true })
    return () => target.removeEventListener('wheel', onWheel)
  }
}

/** Touch drag: finger up = scrolling down = positive, matching wheel. */
export function touchInput(options?: ScrollInputOptions): ScrollInput {
  const gain = options?.gain ?? TOUCH_GAIN
  return (target, emit) => {
    let lastTouchY: number | undefined
    let touchId: number | undefined

    const seedTouch = (event: Event) => {
      const touch = (event as TouchEvent).touches[0]
      touchId = touch?.identifier
      lastTouchY = touch?.clientY
    }

    const onTouchMove = (event: Event) => {
      const touch = (event as TouchEvent).touches[0]
      if (!touch) return
      // If touches[0] is suddenly a different finger (second finger down, or
      // one of two lifted), a delta across the two positions would be garbage
      // and lurch the stars — re-seed and wait for the next move instead.
      if (touch.identifier !== touchId || lastTouchY === undefined) {
        touchId = touch.identifier
        lastTouchY = touch.clientY
        return
      }
      emit((lastTouchY - touch.clientY) * gain)
      lastTouchY = touch.clientY
    }

    target.addEventListener('touchstart', seedTouch, { passive: true })
    target.addEventListener('touchmove', onTouchMove, { passive: true })
    // On (partial) release, re-seed from whichever touch remains, if any.
    target.addEventListener('touchend', seedTouch, { passive: true })
    target.addEventListener('touchcancel', seedTouch, { passive: true })
    return () => {
      target.removeEventListener('touchstart', seedTouch)
      target.removeEventListener('touchmove', onTouchMove)
      target.removeEventListener('touchend', seedTouch)
      target.removeEventListener('touchcancel', seedTouch)
    }
  }
}
