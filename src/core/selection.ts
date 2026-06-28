// src/core/selection.ts
// Pure, DOM-free cursor navigation over the row-major tile grid (lives in core/,
// like grid.ts). The shell owns the mutable "which tile is selected" index and
// the keyboard; this unit only answers "given the cursor is on tile N, which tile
// does pressing a direction land on?" so the wrapping maths stays testable.

/** A cardinal cursor move over the tile grid. */
export type Direction = 'up' | 'down' | 'left' | 'right'

/**
 * The next selected tile index after moving `direction` from `index`, over a
 * row-major grid of `count` tiles in `columns` columns (the same column count
 * {@link import('./grid').tileGrid} laid the tiles out with). Left/right wrap
 * within a row; up/down wrap within a column. Partial final rows are honoured —
 * a column with no cell in the bottom row simply has a shorter wrap cycle — so
 * the cursor never lands on an empty cell. Out-of-range indices clamp into the
 * grid first; a non-positive `columns` is treated as one column; `count <= 0`
 * (no tiles) yields 0.
 */
export function moveSelection(
  index: number,
  count: number,
  columns: number,
  direction: Direction,
): number {
  if (count <= 0) return 0
  const cols = Math.max(1, Math.floor(columns))
  const i = Math.min(Math.max(0, Math.floor(index)), count - 1)

  const row = Math.floor(i / cols)
  const col = i % cols

  if (direction === 'left' || direction === 'right') {
    const rowStart = row * cols
    const rowLen = Math.min(cols, count - rowStart) // tiles present in this row
    const delta = direction === 'right' ? 1 : -1
    return rowStart + ((col + delta + rowLen) % rowLen)
  }

  // up / down: walk the column, wrapping over only the rows that actually hold a
  // cell in this column. The last row with column `col` is at row index
  // floor((count - 1 - col) / cols), so the column is that many rows + 1 tall.
  const colHeight = Math.floor((count - 1 - col) / cols) + 1
  const delta = direction === 'down' ? 1 : -1
  const newRow = (row + delta + colHeight) % colHeight
  return newRow * cols + col
}
