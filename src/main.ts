// src/main.ts
// Lobby bootstrap: wire a full-window Canvas 2D surface and paint the attract
// placeholder. Game-listing tiles, launch, attract-loop, and high scores arrive
// in later epic-7 stories; this scaffold only proves the render target is live.
import { canvasSize } from './core/layout'

const canvas = document.getElementById('lobby') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!

function resize(): void {
  const { width, height } = canvasSize(
    window.innerWidth,
    window.innerHeight,
    window.devicePixelRatio,
  )
  canvas.width = width
  canvas.height = height
  canvas.style.width = `${window.innerWidth}px`
  canvas.style.height = `${window.innerHeight}px`
  draw()
}

function draw(): void {
  const w = canvas.width
  const h = canvas.height
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)

  // Glowing vector title — the arcade visual language: bright lines on black.
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${Math.floor(h * 0.12)}px Orbitron, monospace`
  ctx.shadowColor = '#00eaff'
  ctx.shadowBlur = Math.floor(h * 0.03)
  ctx.fillStyle = '#00eaff'
  ctx.fillText('ARCADE', w / 2, h / 2)
  ctx.restore()
}

window.addEventListener('resize', resize)
resize()
