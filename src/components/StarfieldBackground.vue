<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef } from 'vue'
import { createTimer, type Timer } from 'animejs'
import { useScrollVelocity, type ScrollVelocity } from '@/composables/useScrollVelocity'
import { LAYERS, SEEDS } from '@/starfield/config'
import { createStars, drawStars, updateStars } from '@/starfield/engine'

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

  timer = createTimer({
    onUpdate: (self) => {
      const dt = self.deltaTime / 1000
      const width = window.innerWidth
      const height = window.innerHeight
      const speed = scroll!.speed
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
