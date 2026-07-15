<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef } from 'vue'
import { createTimer, type Timer } from 'animejs'
import { useScrollVelocity, type ScrollVelocity } from '@/composables/useScrollVelocity'
import { LAYERS, MAX_FRAME_TIME, SEEDS, SPEED_SLEW } from '@/starfield/config'
import { approach, createStars, drawStars, updateStars } from '@/starfield/engine'

const canvasRef = useTemplateRef('canvas')

let timer: Timer | undefined
let scroll: ScrollVelocity | undefined

function resizeCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const dpr = window.devicePixelRatio || 1
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
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
      const width = window.innerWidth
      const height = window.innerHeight
      renderSpeed = approach(renderSpeed, scroll!.speed, SPEED_SLEW * dt)
      const speed = renderSpeed
      ctx.clearRect(0, 0, width, height)
      for (const { layer, stars } of layers) {
        updateStars(stars, layer, speed, dt)
        drawStars(ctx, stars, layer, speed, width, height)
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
    class="pointer-events-none fixed inset-0 z-0 h-screen w-screen"
    aria-hidden="true"
  ></canvas>
</template>
