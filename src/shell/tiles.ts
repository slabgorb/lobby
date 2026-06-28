// src/shell/tiles.ts
// Render a game as a glowing tile: a rectangle outline plus a centred label,
// both drawn through the story 7-2 glow primitives (render.ts). The lobby's
// visual language — bright vector lines on black — comes entirely from those
// primitives; tiles just compose them, never re-implementing the bloom.
import type { Game } from '../core/registry'
import type { TileRect } from '../core/grid'
import { glowRect, glowText } from './render'

// The selected tile reads "lit up" against the rest: a wider halo and a thicker
// outline than the plain tile glow (render.ts defaults: blur 8, width 2). Story
// 7-4's selection cursor toggles this per tile.
const SELECTED_BLUR = 24
const SELECTED_WIDTH = 4

/**
 * Draw one game tile: a glowing outline in the game's colour with its title
 * centred inside. When `selected`, the outline glows brighter and thicker so the
 * cursor's tile stands out. Sets centre alignment for the label and restores it
 * after, so the caller's text state doesn't leak.
 */
export function drawTile(
  ctx: CanvasRenderingContext2D,
  rect: Readonly<TileRect>,
  game: Readonly<Game>,
  selected = false,
): void {
  const outline = selected
    ? { color: game.color, blur: SELECTED_BLUR, width: SELECTED_WIDTH }
    : { color: game.color }
  glowRect(ctx, rect.x, rect.y, rect.w, rect.h, outline)

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  glowText(ctx, game.title, rect.x + rect.w / 2, rect.y + rect.h / 2, { color: game.color })
  ctx.restore()
}

/**
 * Draw one tile per game, pairing each game with the rect at the same index.
 * Stops at the shorter list, so a mismatch never reads past either array. The
 * tile at `selectedIndex` is drawn highlighted; pass `-1` (the default) for no
 * selection.
 */
export function drawTiles(
  ctx: CanvasRenderingContext2D,
  games: readonly Game[],
  rects: readonly TileRect[],
  selectedIndex = -1,
): void {
  const n = Math.min(games.length, rects.length)
  for (let i = 0; i < n; i++) {
    drawTile(ctx, rects[i], games[i], i === selectedIndex)
  }
}
