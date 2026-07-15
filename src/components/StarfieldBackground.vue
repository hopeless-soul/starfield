<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef } from 'vue'
import { createTimer, type Timer } from 'animejs'
import { useScrollVelocity, type ScrollVelocity } from '@/composables/useScrollVelocity'
import { LAYERS, MAX_DPR, MAX_FRAME_TIME, SEEDS, SPEED_SLEW } from '@/starfield/config'
import { approach, createStars, drawStars, updateStars } from '@/starfield/engine'

const canvasRef = useTemplateRef('canvas')

let timer: Timer | undefined
let scroll: ScrollVelocity | undefined

// Cached CSS-pixel size of the canvas so the render loop never reads layout.
let viewWidth = 0
let viewHeight = 0

function resizeCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
  const width = canvas.clientWidth
  const height = canvas.clientHeight
  const backingWidth = Math.round(width * dpr)
  // Reallocating the backing store is expensive and blanks the canvas for a
  // frame — skip when nothing actually changed (mobile fires spurious
  // resizes while the URL bar shows/hides during scrolling).
  if (width === viewWidth && height === viewHeight && canvas.width === backingWidth) return
  viewWidth = width
  viewHeight = height
  canvas.width = backingWidth
  canvas.height = Math.round(height * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

let onResize: (() => void) | undefined

onMounted(() => {
  const canvas = canvasRef.value
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) return

  resizeCanvas(canvas, ctx)
  onResize = () => resizeCanvas(canvas, ctx)
  window.addEventListener('resize', onResize)

  const layers = LAYERS.map((layer, index) => ({
    layer,
    stars: createStars(layer, SEEDS, index),
  }))
  // Default sources: wheel + touch, both always attached (no device
  // detection); pass a ScrollInput[] here to restrict or tune inputs.
  scroll = useScrollVelocity()

  // Speed value actually used for rendering: follows scroll.speed but with a
  // bounded rate of change, so a frame stall (common during touch scrolling)
  // can't make the drift offset — a direct function of speed — jump.
  let renderSpeed = 0

  timer = createTimer({
    onUpdate: (self) => {
      // Clamp both sides: anime can report garbage (even hugely negative)
      // deltaTime on the first ticks, and unlike the periodic angles, the
      // slew-limited renderSpeed would be permanently poisoned by it.
      const dt = Math.min(Math.max(self.deltaTime, 0), MAX_FRAME_TIME * 1000) / 1000
      renderSpeed = approach(renderSpeed, scroll!.speed, SPEED_SLEW * dt)
      const speed = renderSpeed
      ctx.clearRect(0, 0, viewWidth, viewHeight)
      for (const { layer, stars } of layers) {
        updateStars(stars, layer, speed, dt)
        drawStars(ctx, stars, layer, speed, viewWidth, viewHeight)
      }
    },
  })
})

onUnmounted(() => {
  timer?.cancel()
  scroll?.destroy()
  if (onResize) window.removeEventListener('resize', onResize)
})
</script>

<template>
  <canvas
    ref="canvas"
    class="pointer-events-none fixed inset-0 z-0 h-lvh w-screen"
    aria-hidden="true"
  ></canvas>
</template>
