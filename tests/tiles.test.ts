import { describe, it, expect, vi, beforeEach } from 'vitest'

// Tile rendering (shell): composes the story 7-2 glow primitives into a game
// tile — a glowing rectangle outline plus a centred glowing label. We mock
// render.ts so these tests assert *composition* (which primitives, with what
// args) rather than re-testing the bloom maths already covered by render.test.ts.
vi.mock('../src/shell/render', () => ({
  glowRect: vi.fn(),
  glowText: vi.fn(),
}))

import { glowRect, glowText } from '../src/shell/render'
import { drawTile, drawTiles } from '../src/shell/tiles'
import type { Game } from '../src/core/registry'
import type { TileRect } from '../src/core/grid'

const game: Game = {
  id: 'tempest',
  title: 'TEMPEST',
  launchUrl: '/tempest/',
  color: '#00eaff',
}

// A throwaway canvas context: render.ts is mocked, so drawTile only touches the
// ctx for text alignment/font state. Settable props + spied save/restore suffice.
function makeCtx(): CanvasRenderingContext2D {
  return {
    textAlign: 'left',
    textBaseline: 'alphabetic',
    font: '',
    save: vi.fn(),
    restore: vi.fn(),
  } as unknown as CanvasRenderingContext2D
}

beforeEach(() => {
  vi.mocked(glowRect).mockClear()
  vi.mocked(glowText).mockClear()
})

describe('drawTile', () => {
  const rect: TileRect = { x: 10, y: 20, w: 200, h: 120 }

  it('outlines the tile rect once in the game colour', () => {
    drawTile(makeCtx(), rect, game)
    expect(glowRect).toHaveBeenCalledTimes(1)
    expect(glowRect).toHaveBeenCalledWith(
      expect.anything(),
      10,
      20,
      200,
      120,
      expect.objectContaining({ color: '#00eaff' }),
    )
  })

  it('draws the title once, centred in the tile, with a glow', () => {
    drawTile(makeCtx(), rect, game)
    expect(glowText).toHaveBeenCalledTimes(1)
    expect(glowText).toHaveBeenCalledWith(
      expect.anything(),
      'TEMPEST',
      rect.x + rect.w / 2, // 110
      rect.y + rect.h / 2, // 80
      expect.objectContaining({ color: expect.any(String) }),
    )
  })
})

describe('drawTiles', () => {
  const games: Game[] = [
    { id: 'tempest', title: 'TEMPEST', launchUrl: '/tempest/', color: '#00eaff' },
    { id: 'star-wars', title: 'STAR WARS', launchUrl: '/star-wars/', color: '#ffe000' },
    { id: 'lunar', title: 'LUNAR', launchUrl: '/lunar/', color: '#ff0066' },
  ]
  const rects: TileRect[] = [
    { x: 0, y: 0, w: 100, h: 60 },
    { x: 120, y: 0, w: 100, h: 60 },
    { x: 240, y: 0, w: 100, h: 60 },
  ]

  it('draws one tile per game when counts match', () => {
    drawTiles(makeCtx(), games, rects)
    expect(glowRect).toHaveBeenCalledTimes(3)
    expect(glowText).toHaveBeenCalledTimes(3)
    const titles = vi.mocked(glowText).mock.calls.map((c) => c[1])
    expect(titles).toEqual(['TEMPEST', 'STAR WARS', 'LUNAR'])
  })

  it('draws only as many tiles as there are rects (no overflow)', () => {
    drawTiles(makeCtx(), games, rects.slice(0, 2))
    expect(glowRect).toHaveBeenCalledTimes(2)
    expect(glowText).toHaveBeenCalledTimes(2)
  })

  it('draws nothing for an empty registry', () => {
    drawTiles(makeCtx(), [], [])
    expect(glowRect).not.toHaveBeenCalled()
    expect(glowText).not.toHaveBeenCalled()
  })
})
