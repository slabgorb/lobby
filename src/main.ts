// src/main.ts
// Lobby bootstrap: wire a full-window Canvas 2D surface and paint the lobby —
// the ARCADE title plus a centred grid of game tiles (story 7-3) — then let the
// player move a selection cursor over the tiles and launch one (story 7-4).
// Attract-loop and high scores arrive in later epic-7 stories.
import { canvasSize } from './core/layout'
import { glowText } from './shell/render'
import { GAMES } from './core/registry'
import { tileGrid, defaultColumns } from './core/grid'
import { drawTiles } from './shell/tiles'
import { bindLobbyInput, launchGame } from './shell/input'
import { loadVectorFont } from './shell/font'

const canvas = document.getElementById('lobby') as HTMLCanvasElement
const ctx = canvas.getContext('2d')!

// The Vector Battle ROM face, with the 'Orbitron', monospace fallback chain the
// games use so the lobby reads even before the web font lands. Weights match the
// games: a heavy 900 marquee title, 700 tile labels.
const TITLE_FONT = (px: number) => `900 ${px}px 'Vector Battle', 'Orbitron', monospace`
const TILE_FONT = (px: number) => `700 ${px}px 'Vector Battle', 'Orbitron', monospace`

// Which tile the cursor sits on, and the column count the grid is laid out with.
// Selection navigation must use the SAME column count as the render, so both read
// it from defaultColumns (story 7-4).
let selectedIndex = 0
const columns = defaultColumns(GAMES.length)

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
  ctx.font = TITLE_FONT(Math.floor(h * 0.12))
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
    columns,
    gap: Math.floor(w * 0.04),
  }).map((r) => ({ ...r, y: r.y + gridTop }))

  ctx.save()
  ctx.font = TILE_FONT(Math.floor(tileHeight * 0.22))
  drawTiles(ctx, GAMES, rects, selectedIndex)
  ctx.restore()
}

// Arrow keys move the cursor between tiles; Enter launches the selected game by
// navigating the tab to its launchUrl. The grid-navigation maths and the
// key→action mapping live in core/selection.ts and shell/input.ts; main only
// holds the mutable selection and repaints.
bindLobbyInput(window, {
  getIndex: () => selectedIndex,
  getCount: () => GAMES.length,
  getColumns: () => columns,
  onMove: (next) => {
    selectedIndex = next
    draw()
  },
  onLaunch: (index) => launchGame(GAMES[index], (url) => { window.location.href = url }),
})

window.addEventListener('resize', resize)
resize()

// Kick off the Vector Battle font load. Best-effort and non-blocking: the lobby
// is already painted with the fallback font above; repaint once the real face
// lands so the title and labels pick it up. (The lobby draws on demand, not in a
// loop, so it must repaint explicitly — unlike the games' render loops.)
void loadVectorFont().then((loaded) => {
  if (loaded) draw()
})
