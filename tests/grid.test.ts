import { describe, it, expect } from 'vitest'
import { tileGrid, defaultColumns, type TileRect, type GridSpec } from '../src/core/grid'

// Pure, DOM-free layout math (lives in core/, like layout.ts). Given a tile
// count, the canvas size, a fixed tile size, and a column count, tileGrid places
// uniform tiles in a centred grid and returns their rects in row-major order.
// Tile *size* is an input — the shell decides how big tiles are; the grid only
// places them — which keeps this unit deterministic and canvas-free.

const base: Omit<GridSpec, 'count'> = {
  width: 1000,
  height: 1000,
  tileWidth: 100,
  tileHeight: 100,
  columns: 2,
  gap: 20,
}

describe('tileGrid — counts and validation', () => {
  it('returns an empty array for zero tiles', () => {
    expect(tileGrid({ ...base, count: 0 })).toEqual([])
  })

  it('returns exactly one rect per tile', () => {
    expect(tileGrid({ ...base, count: 5 })).toHaveLength(5)
  })

  it('throws on a negative count', () => {
    expect(() => tileGrid({ ...base, count: -1 })).toThrow()
  })

  it('throws on a non-positive column count', () => {
    expect(() => tileGrid({ ...base, count: 4, columns: 0 })).toThrow()
    expect(() => tileGrid({ ...base, count: 4, columns: -2 })).toThrow()
  })
})

describe('tileGrid — uniform sizing', () => {
  it('gives every tile the requested width and height', () => {
    const rects = tileGrid({ ...base, count: 7 })
    for (const r of rects) {
      expect(r.w).toBe(base.tileWidth)
      expect(r.h).toBe(base.tileHeight)
    }
  })
})

describe('tileGrid — row-major placement', () => {
  // count 4 in 2 columns → a clean 2×2 grid.
  const rects = tileGrid({ ...base, count: 4 })

  it('fills left-to-right then top-to-bottom', () => {
    const [a, b, c, d] = rects
    // Row 0: tiles 0,1 share a y; tile 1 sits to the right of tile 0.
    expect(a.y).toBe(b.y)
    expect(b.x).toBeGreaterThan(a.x)
    // Row 1: tiles 2,3 share a y below row 0.
    expect(c.y).toBe(d.y)
    expect(c.y).toBeGreaterThan(a.y)
    // Columns align: tile 2 under tile 0, tile 3 under tile 1.
    expect(c.x).toBe(a.x)
    expect(d.x).toBe(b.x)
  })

  it('separates adjacent tiles by exactly the gap', () => {
    const [a, b, c] = rects
    expect(b.x - (a.x + a.w)).toBe(base.gap) // horizontal gap, row 0
    expect(c.y - (a.y + a.h)).toBe(base.gap) // vertical gap, col 0
  })

  it('left-aligns a partial final row at the first column', () => {
    // count 3 in 2 columns → row 1 holds a single tile under column 0.
    const partial = tileGrid({ ...base, count: 3 })
    expect(partial).toHaveLength(3)
    expect(partial[2].x).toBe(partial[0].x)
    expect(partial[2].y).toBeGreaterThan(partial[0].y)
  })
})

describe('tileGrid — default column count', () => {
  it('defaults to a roughly-square grid (ceil(sqrt(count)))', () => {
    // 9 tiles, no columns specified → 3 columns → first row is tiles 0,1,2.
    const rects = tileGrid({ width: 1200, height: 1200, tileWidth: 100, tileHeight: 100, gap: 20, count: 9 })
    expect(rects[0].y).toBe(rects[1].y)
    expect(rects[1].y).toBe(rects[2].y)
    expect(rects[1].x).toBeGreaterThan(rects[0].x)
    expect(rects[2].x).toBeGreaterThan(rects[1].x)
    // Tile 3 wraps to the second row.
    expect(rects[3].y).toBeGreaterThan(rects[0].y)
    expect(rects[3].x).toBe(rects[0].x)
  })
})

describe('defaultColumns', () => {
  // The single source of truth for "how many columns does N tiles get", shared by
  // tileGrid's default and the selection cursor (story 7-4) so the rendered grid
  // and the navigation maths can never disagree on the column count.
  it('gives a roughly-square grid: ceil(sqrt(count))', () => {
    expect(defaultColumns(1)).toBe(1)
    expect(defaultColumns(2)).toBe(2)
    expect(defaultColumns(4)).toBe(2)
    expect(defaultColumns(5)).toBe(3)
    expect(defaultColumns(9)).toBe(3)
  })

  it('is the column count tileGrid falls back to when none is given', () => {
    // 5 tiles, no columns → 3 columns → the first row holds tiles 0,1,2.
    const rects = tileGrid({ width: 1200, height: 1200, tileWidth: 100, tileHeight: 100, gap: 20, count: 5 })
    expect(rects[0].y).toBe(rects[1].y)
    expect(rects[1].y).toBe(rects[2].y)
    expect(rects[3].y).toBeGreaterThan(rects[0].y) // tile 3 wraps to row 2
  })
})

describe('tileGrid — centring', () => {
  it('centres a single tile exactly within the canvas', () => {
    const [only] = tileGrid({ width: 100, height: 100, tileWidth: 40, tileHeight: 40, columns: 1, gap: 24, count: 1 })
    expect(only).toEqual<TileRect>({ x: 30, y: 30, w: 40, h: 40 })
  })

  it('splits leftover space into symmetric margins', () => {
    const rects = tileGrid({ ...base, count: 4 })
    const minX = Math.min(...rects.map((r) => r.x))
    const maxXEnd = Math.max(...rects.map((r) => r.x + r.w))
    const minY = Math.min(...rects.map((r) => r.y))
    const maxYEnd = Math.max(...rects.map((r) => r.y + r.h))
    // Left margin equals right margin; top equals bottom — the block is centred.
    expect(minX).toBeCloseTo(base.width - maxXEnd, 6)
    expect(minY).toBeCloseTo(base.height - maxYEnd, 6)
  })
})
