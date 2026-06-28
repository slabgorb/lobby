// src/shell/tiles.ts
// Render a game as a glowing tile: a rectangle outline plus a centred label,
// both drawn through the story 7-2 glow primitives (render.ts). The lobby's
// visual language — bright vector lines on black — comes entirely from those
// primitives; tiles just compose them, never re-implementing the bloom.
import type { Game } from '../core/registry'
import type { TileRect } from '../core/grid'
import { glowRect, glowText } from './render'

/**
 * Draw one game tile: a glowing outline in the game's colour with its title
 * centred inside. Sets centre alignment for the label and restores it after, so
 * the caller's text state doesn't leak.
 */
export function drawTile(
  ctx: CanvasRenderingContext2D,
  rect: Readonly<TileRect>,
  game: Readonly<Game>,
): void {
  glowRect(ctx, rect.x, rect.y, rect.w, rect.h, { color: game.color })

  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  glowText(ctx, game.title, rect.x + rect.w / 2, rect.y + rect.h / 2, { color: game.color })
  ctx.restore()
}

/**
 * Draw one tile per game, pairing each game with the rect at the same index.
 * Stops at the shorter list, so a mismatch never reads past either array.
 */
export function drawTiles(
  ctx: CanvasRenderingContext2D,
  games: readonly Game[],
  rects: readonly TileRect[],
): void {
  const n = Math.min(games.length, rects.length)
  for (let i = 0; i < n; i++) {
    drawTile(ctx, rects[i], games[i])
  }
}
