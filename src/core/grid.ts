// src/core/grid.ts
// Pure, DOM-free tile-grid layout maths (mirrors layout.ts's core/ placement).
// Given a tile count, the canvas size, a fixed tile size, and a column count,
// tileGrid positions uniform tiles in a centred grid and returns their rects in
// row-major order. Tile *size* is an input — the shell decides how big tiles
// are; the grid only places them — which keeps this unit canvas-free.

/** An axis-aligned rectangle in canvas (device-pixel) space. */
export interface TileRect {
  x: number
  y: number
  w: number
  h: number
}

/** Inputs to {@link tileGrid}. `columns` and `gap` have sensible defaults. */
export interface GridSpec {
  /** Number of tiles to place (>= 0). */
  count: number
  /** Canvas width the grid is centred within. */
  width: number
  /** Canvas height the grid is centred within. */
  height: number
  /** Width of each tile. */
  tileWidth: number
  /** Height of each tile. */
  tileHeight: number
  /** Columns in the grid; defaults to a roughly-square `ceil(sqrt(count))`. */
  columns?: number
  /** Space between adjacent tiles; defaults to 24. */
  gap?: number
}

const DEFAULT_GAP = 24

/**
 * The column count a grid of `count` tiles gets when the caller doesn't pick one:
 * a roughly-square `ceil(sqrt(count))`. Exported as the single source of truth so
 * the rendered grid ({@link tileGrid}) and the selection cursor
 * ({@link import('./selection').moveSelection}) always agree on the column count.
 */
export function defaultColumns(count: number): number {
  return Math.ceil(Math.sqrt(count))
}

/**
 * Place `count` uniform tiles in a centred grid, row-major. The grid block is
 * centred within `width` × `height`, so leftover space splits into symmetric
 * margins. Returns `[]` for a zero count; throws on a negative count or a
 * non-positive column count.
 */
export function tileGrid(spec: Readonly<GridSpec>): TileRect[] {
  const { count, width, height, tileWidth, tileHeight } = spec
  if (count < 0) throw new RangeError(`tileGrid: count must be >= 0, got ${count}`)
  if (count === 0) return []

  const columns = spec.columns ?? defaultColumns(count)
  if (columns <= 0) throw new RangeError(`tileGrid: columns must be > 0, got ${columns}`)
  const gap = spec.gap ?? DEFAULT_GAP

  const rows = Math.ceil(count / columns)
  const blockW = columns * tileWidth + (columns - 1) * gap
  const blockH = rows * tileHeight + (rows - 1) * gap
  const originX = (width - blockW) / 2
  const originY = (height - blockH) / 2

  const rects: TileRect[] = []
  for (let i = 0; i < count; i++) {
    const col = i % columns
    const row = Math.floor(i / columns)
    rects.push({
      x: originX + col * (tileWidth + gap),
      y: originY + row * (tileHeight + gap),
      w: tileWidth,
      h: tileHeight,
    })
  }
  return rects
}
