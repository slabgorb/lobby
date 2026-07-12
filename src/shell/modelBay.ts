// src/shell/modelBay.ts
//
// Fills the model bay lb2-7 reserved in every tile. Shell, not core: it touches the DOM.
//
// This is a SEPARATE pass from building the tiles, and that split is load-bearing. The
// build path (tiles.ts) only ever lays out structure; `refreshScores` rewrites a score
// line in place on return from a game. If the model were drawn inside `buildTile`, the
// only way to refresh a score would be to rebuild the tile — which would throw away every
// model on the row. So: build the grid, then mount the models into it, once.
//
// The glow is not ours to re-implement. @arcade/shared/glow owns the
// set-strokeStyle/shadowColor/shadowBlur → draw → RESET-shadowBlur envelope, including
// the reset that asteroids, star-wars and battlezone each hand-wrote and each forgot.
// Everything here goes through it.

import { glowPolyline } from '@arcade/shared/glow'
import { MAX_DPR } from '@arcade/shared/view'
import { getTileModel, type TileModel } from '../core/models'
import { getGame } from '../core/registry'

/** The bay is 5.75rem square (index.html `.tile-model`) — 92px at the default root size. */
const BAY_PX = 92

/** Fraction of the bay the model spans, leaving the recess's border room to breathe. */
const FILL = 0.82

/** Thin, like a vector monitor's beam. The glow does the rest of the work. */
const LINE_WIDTH = 1.4
const BLUR = 8

/**
 * Draw one model into a 2D context, mapping the unit box (|x|,|y| <= 1, origin centre)
 * onto a `size`-square canvas. Every stroke is the game's own glow colour — the registry
 * is the source of truth for it, exactly as it is for the tile's title and href.
 */
function drawModel(
  ctx: CanvasRenderingContext2D,
  model: TileModel,
  color: string,
  size: number,
): void {
  const half = size / 2
  const scale = half * FILL

  for (const path of model.paths) {
    const points = path.points.map(
      ([x, y]) => [half + x * scale, half + y * scale] as readonly [number, number],
    )
    glowPolyline(ctx, points, { stroke: color, width: LINE_WIDTH, blur: BLUR }, path.closed)
  }
}

/**
 * Mount every game's hero model into its tile's bay, for the tiles inside `container`.
 *
 * Static. No animation, no frame loop — this is the front door, not a game, and a visitor
 * who parks the tab in the background should not be paying for five render loops to spin
 * five things that barely move. (The story permits "static or slowly rotating"; static is
 * the one that costs nothing.)
 *
 * Degrades to the empty bay, never to a broken one. A game the lobby has no model for, an
 * id the registry never issued, or a browser that hands back no 2D context all leave the
 * recess exactly as lb2-7 built it — an empty box reads as part of the cabinet, while a
 * dead canvas reads as something that failed to load.
 *
 * Safe to call twice: a bay that already holds a canvas is left alone.
 */
export function mountModels(container: HTMLElement): void {
  for (const slot of container.querySelectorAll<HTMLElement>('[data-model-slot]')) {
    const id = slot.dataset.modelSlot
    if (id === undefined) continue

    // Already mounted — don't stack a second canvas on top of the first.
    if (slot.querySelector('canvas') !== null) continue

    // The slot's id is a DOM string: data, not a key to trust. Both lookups must answer,
    // or there is nothing to draw and nothing to draw it in.
    const game = getGame(id)
    const model = getTileModel(id)
    if (game === undefined || model === undefined) continue

    const canvas = document.createElement('canvas')

    // Two different numbers, and both have to be said out loud. The backing store is
    // resolution (scaled for the display, so the vectors stay crisp); the CSS size is the
    // box on the page. A canvas with only the former lays out at its pixel width — 184 CSS
    // pixels on a retina panel — and rips the 5.75rem recess wide open, ragging the row.
    const dpr = Math.min(MAX_DPR, window.devicePixelRatio > 0 ? window.devicePixelRatio : 1)
    canvas.width = BAY_PX * dpr
    canvas.height = BAY_PX * dpr
    canvas.style.width = '100%'
    canvas.style.height = '100%'

    // Null on a cabinet that cannot give us one: an exhausted context pool, a hardened
    // privacy mode. Leave the bay empty rather than an empty canvas — this canvas has not
    // been appended yet, so bailing here leaves no trace of it.
    const ctx = canvas.getContext('2d')
    if (ctx === null) continue

    ctx.scale(dpr, dpr)
    drawModel(ctx, model, game.color, BAY_PX)

    slot.append(canvas)
  }
}
