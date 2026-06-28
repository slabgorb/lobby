import { describe, it, expect } from 'vitest'
import { moveSelection, type Direction } from '../src/core/selection'

// Pure, DOM-free cursor navigation over the row-major tile grid (lives in core/,
// like grid.ts). moveSelection takes the current index, the tile count, the grid
// column count, and a direction, and returns the next index. Left/right wrap
// within a row; up/down wrap within a column. Partial final rows are honoured so
// the cursor never lands on an empty cell.

describe('moveSelection — single tile', () => {
  const dirs: Direction[] = ['up', 'down', 'left', 'right']
  it('stays on the only tile in every direction', () => {
    for (const d of dirs) {
      expect(moveSelection(0, 1, 1, d)).toBe(0)
    }
  })
})

describe('moveSelection — full 2x2 grid (count 4, columns 2)', () => {
  // indices:  0 1
  //           2 3
  it('moves right within a row', () => {
    expect(moveSelection(0, 4, 2, 'right')).toBe(1)
    expect(moveSelection(2, 4, 2, 'right')).toBe(3)
  })

  it('wraps right at the end of a row back to its start', () => {
    expect(moveSelection(1, 4, 2, 'right')).toBe(0)
    expect(moveSelection(3, 4, 2, 'right')).toBe(2)
  })

  it('moves and wraps left within a row', () => {
    expect(moveSelection(1, 4, 2, 'left')).toBe(0)
    expect(moveSelection(0, 4, 2, 'left')).toBe(1) // wrap
  })

  it('moves down within a column', () => {
    expect(moveSelection(0, 4, 2, 'down')).toBe(2)
    expect(moveSelection(1, 4, 2, 'down')).toBe(3)
  })

  it('wraps down at the bottom of a column back to its top', () => {
    expect(moveSelection(2, 4, 2, 'down')).toBe(0)
    expect(moveSelection(3, 4, 2, 'down')).toBe(1)
  })

  it('moves and wraps up within a column', () => {
    expect(moveSelection(2, 4, 2, 'up')).toBe(0)
    expect(moveSelection(0, 4, 2, 'up')).toBe(2) // wrap
  })
})

describe('moveSelection — partial final row (count 5, columns 3)', () => {
  // indices:  0 1 2
  //           3 4
  it('wraps right within the short bottom row only', () => {
    expect(moveSelection(3, 5, 3, 'right')).toBe(4)
    expect(moveSelection(4, 5, 3, 'right')).toBe(3) // wrap inside [3,4]
  })

  it('keeps a column with no bottom cell on itself when moving down', () => {
    // Column 2 only exists in row 0 (index 2); there is no index 5.
    expect(moveSelection(2, 5, 3, 'down')).toBe(2)
    expect(moveSelection(2, 5, 3, 'up')).toBe(2)
  })

  it('moves down into the partial row where the column has a cell', () => {
    expect(moveSelection(0, 5, 3, 'down')).toBe(3)
    expect(moveSelection(1, 5, 3, 'down')).toBe(4)
  })

  it('wraps down from the partial row back to the top of the column', () => {
    expect(moveSelection(3, 5, 3, 'down')).toBe(0)
    expect(moveSelection(4, 5, 3, 'down')).toBe(1)
  })

  it('wraps left within the short bottom row only', () => {
    // The `rowLen = min(cols, count - rowStart)` guard keeps left from landing on
    // the empty cell where index 5 would be; the row [3,4] wraps onto itself.
    expect(moveSelection(4, 5, 3, 'left')).toBe(3)
    expect(moveSelection(3, 5, 3, 'left')).toBe(4) // wrap: leftmost → rightmost
  })

  it('moves up from the partial row into the row above', () => {
    expect(moveSelection(3, 5, 3, 'up')).toBe(0)
    expect(moveSelection(4, 5, 3, 'up')).toBe(1)
  })

  it('wraps up from the top row down into the partial row', () => {
    // colHeight for columns 0 and 1 is 2 (rows 0 and the partial row), so up from
    // the top row wraps to the bottom-most populated cell in that column.
    expect(moveSelection(0, 5, 3, 'up')).toBe(3)
    expect(moveSelection(1, 5, 3, 'up')).toBe(4)
  })
})

describe('moveSelection — defensive inputs', () => {
  it('clamps an out-of-range index into the valid set before moving', () => {
    expect(moveSelection(99, 4, 2, 'right')).toBe(2) // clamps to 3, then wraps to 2
    expect(moveSelection(-5, 4, 2, 'right')).toBe(1) // clamps to 0, then right
  })

  it('returns 0 when there are no tiles', () => {
    expect(moveSelection(0, 0, 2, 'down')).toBe(0)
  })

  it('treats a non-positive column count as a single column', () => {
    // 3 tiles in 1 effective column → a vertical strip; down walks 0→1→2→wrap.
    expect(moveSelection(0, 3, 0, 'down')).toBe(1)
    expect(moveSelection(2, 3, 0, 'down')).toBe(0)
  })
})
