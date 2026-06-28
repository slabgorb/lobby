// src/main.ts
// Lobby bootstrap: wire a full-window Canvas 2D surface and paint the lobby —
// the ARCADE title plus a centred grid of game tiles (story 7-3). Tile launch,
// attract-loop, and high scores arrive in later epic-7 stories.
import { canvasSize } from './core/layout'
import { glowText } from './shell/render'
import { GAMES } from './core/registry'
import { tileGrid } from './core/grid'
import { drawTiles } from './shell/tiles'

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

  // Glowing vector title near the top — the arcade visual language: bright lines
  // on black. Painted through the shared glow primitive (story 7-2) so the lobby
  // and its tiles share one neon-bloom implementation.
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${Math.floor(h * 0.12)}px Orbitron, monospace`
  glowText(ctx, 'ARCADE', w / 2, h * 0.16, { color: '#00eaff', blur: Math.floor(h * 0.03) })
  ctx.restore()

  // Game tiles, centred in the region below the title. The pure grid maths
  // (story 7-3) places fixed-size tiles; the shell picks that size from the
  // canvas and offsets the block beneath the title.
  const gridTop = h * 0.3
  const tileWidth = Math.floor(w * 0.28)
  const tileHeight = Math.floor(tileWidth * 0.6)
  const rects = tileGrid({
    count: GAMES.length,
    width: w,
    height: h - gridTop,
    tileWidth,
    tileHeight,
    gap: Math.floor(w * 0.04),
  }).map((r) => ({ ...r, y: r.y + gridTop }))

  ctx.save()
  ctx.font = `${Math.floor(tileHeight * 0.22)}px Orbitron, monospace`
  drawTiles(ctx, GAMES, rects)
  ctx.restore()
}

window.addEventListener('resize', resize)
resize()
