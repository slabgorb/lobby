// @vitest-environment jsdom
//
// lb2-8 — the rotating HIGH SCORES board.
//
// The design's centrepiece: a bordered panel that cycles ONE game at a time on a ~4.5s
// timer — the game's name in its own glow colour, a TOP FIVE ladder of name/score rows,
// and a row of pips (one per game, the active one lit in that game's colour).
//
// These tests drive the board component directly with fake timers and a stub row source,
// so rotation, the empty state and timer teardown are all deterministic. The pageshow
// re-read that ties it into lb2-3's refresh entry point is a separate integration test
// (highscore-board-integration.test.ts) that goes through the real bootstrap.
//
// DOM CONTRACT (the hooks the board must expose; Dev may rename with a logged deviation):
//   [data-pip="<gameId>"]      one pip per registry game
//   [data-pip].is-active       the single lit pip (the game currently on screen)
//   .hs-title                  the active game's name (glow colour on --glow)
//   .hs-ladder                 the ladder region (holds .hs-row rows, or the empty state)
//   .hs-row                    one ladder row, showing name + score
//   --glow                     the per-game colour, set inline (as tiles.ts does)

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GAMES, type Game } from '../src/core/registry'
import { mountHighScoreBoard } from '../src/shell/highscoreBoard'

/** The board reads rows through this shape — {name, score}, exactly the widened
 *  @arcade/shared summary. Declared locally so the test does not depend on a shared type
 *  that only lands once the library is republished. */
type Row = { name: string; score: number }

const INTERVAL = 4500

const PIP = '[data-pip]'
const ACTIVE_PIP = '[data-pip].is-active'
const TITLE = '.hs-title'
const ROW = '.hs-row'
const LADDER = '.hs-ladder'

let panel: HTMLElement
/** Mutable per-game row source: tests seed it, then read the board it produces. */
let rowsById: Map<string, Row[]>
const getRows = (id: string): Row[] => rowsById.get(id) ?? []

beforeEach(() => {
  vi.useFakeTimers()
  rowsById = new Map()
  document.body.innerHTML = ''
  panel = document.createElement('section')
  document.body.append(panel)
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
})

/** The game id the lit pip currently points at — the one "on screen". */
function activeGameId(): string | null {
  return panel.querySelector(ACTIVE_PIP)?.getAttribute('data-pip') ?? null
}

/** The ladder rows as `${name}|${score-text}` strings, top to bottom. */
function ladderRows(): string[] {
  return [...panel.querySelectorAll(ROW)].map((r) => r.textContent ?? '')
}

const en = (n: number) => n.toLocaleString('en-US')

// ---------------------------------------------------------------------------
// AC-2 — a real top-five ladder for the game currently on screen, per game
// ---------------------------------------------------------------------------

describe('the ladder shows the current game’s real top five', () => {
  it('renders one row per score, highest first, each with its name and score', () => {
    rowsById.set(GAMES[0].id, [
      { name: 'JPX', score: 149830 },
      { name: 'AAA', score: 98000 },
      { name: 'BBB', score: 42000 },
      { name: 'CCC', score: 12000 },
      { name: 'DDD', score: 900 },
    ])
    mountHighScoreBoard(panel, GAMES, getRows, { intervalMs: INTERVAL })

    const rows = ladderRows()
    expect(rows).toHaveLength(5)
    // Every row carries BOTH its name and its score, in strict descending-score order
    // top-to-bottom — the full sequence is pinned, not just the ends.
    expect(rows[0]).toContain('JPX')
    expect(rows[0]).toContain(en(149830))
    expect(rows[1]).toContain('AAA')
    expect(rows[2]).toContain('BBB')
    expect(rows[3]).toContain('CCC')
    expect(rows[4]).toContain('DDD')
    expect(rows[4]).toContain(en(900))
  })

  it('renders exactly the rows it is given — three rows show three, never padded to five', () => {
    // Fail-soft: a short ladder must not be back-filled with blank rows or zeros to look full.
    rowsById.set(GAMES[0].id, [
      { name: 'AAA', score: 5000 },
      { name: 'BBB', score: 3000 },
      { name: 'CCC', score: 1000 },
    ])
    mountHighScoreBoard(panel, GAMES, getRows, { intervalMs: INTERVAL })

    expect(panel.querySelectorAll(ROW)).toHaveLength(3)
    expect(panel.querySelector(LADDER)?.textContent ?? '').not.toContain('NO SCORE')
  })

  it('shows EACH game’s own ladder as it rotates — not one game’s data for all', () => {
    rowsById.set(GAMES[0].id, [{ name: 'ONE', score: 11111 }])
    rowsById.set(GAMES[1].id, [{ name: 'TWO', score: 22222 }])
    mountHighScoreBoard(panel, GAMES, getRows, { intervalMs: INTERVAL })

    expect(activeGameId()).toBe(GAMES[0].id)
    expect(ladderRows()[0]).toContain('ONE')

    vi.advanceTimersByTime(INTERVAL)

    expect(activeGameId()).toBe(GAMES[1].id)
    expect(ladderRows()[0]).toContain('TWO')
    expect(ladderRows()[0]).not.toContain('ONE')
  })
})

// ---------------------------------------------------------------------------
// AC-3 — rotation through the registry, with a pip row that tracks it
// ---------------------------------------------------------------------------

describe('the board rotates through every game with a pip per game', () => {
  it('starts on the first game and advances to the next after the interval', () => {
    mountHighScoreBoard(panel, GAMES, getRows, { intervalMs: INTERVAL })

    expect(activeGameId()).toBe(GAMES[0].id)
    vi.advanceTimersByTime(INTERVAL)
    expect(activeGameId()).toBe(GAMES[1].id)
    vi.advanceTimersByTime(INTERVAL)
    expect(activeGameId()).toBe(GAMES[2].id)
  })

  it('wraps from the last game back to the first', () => {
    mountHighScoreBoard(panel, GAMES, getRows, { intervalMs: INTERVAL })

    vi.advanceTimersByTime(INTERVAL * (GAMES.length - 1))
    expect(activeGameId(), 'on the last game').toBe(GAMES[GAMES.length - 1].id)

    vi.advanceTimersByTime(INTERVAL)
    expect(activeGameId(), 'wrapped back to the first').toBe(GAMES[0].id)
  })

  it('renders exactly one pip per game, with exactly one lit at a time', () => {
    mountHighScoreBoard(panel, GAMES, getRows, { intervalMs: INTERVAL })

    expect(panel.querySelectorAll(PIP)).toHaveLength(GAMES.length)
    expect(panel.querySelectorAll(ACTIVE_PIP)).toHaveLength(1)

    vi.advanceTimersByTime(INTERVAL)
    expect(panel.querySelectorAll(ACTIVE_PIP), 'still exactly one after rotating').toHaveLength(1)
  })

  it('lights the active pip in that game’s own registry colour', () => {
    mountHighScoreBoard(panel, GAMES, getRows, { intervalMs: INTERVAL })

    const pip = panel.querySelector<HTMLElement>(ACTIVE_PIP)
    expect(pip?.style.getPropertyValue('--glow')).toBe(GAMES[0].color)

    vi.advanceTimersByTime(INTERVAL)
    const next = panel.querySelector<HTMLElement>(ACTIVE_PIP)
    expect(next?.style.getPropertyValue('--glow')).toBe(GAMES[1].color)
  })

  it('shows the active game’s name in its own glow colour', () => {
    mountHighScoreBoard(panel, GAMES, getRows, { intervalMs: INTERVAL })

    const title = panel.querySelector<HTMLElement>(TITLE)
    expect(title?.textContent).toBe(GAMES[0].title)
    expect(title?.style.getPropertyValue('--glow')).toBe(GAMES[0].color)
  })

  it('is driven by the registry it is handed, not a hardcoded game list', () => {
    // The design hardcodes all four games; the board must read the SAME registry the tiles
    // do. Handed a custom two-game list, it must show exactly those two and cycle between
    // just them — a baked-in list would still show five.
    const custom: Game[] = [
      { id: 'alpha', title: 'ALPHA', launchUrl: 'https://alpha/', color: '#abcdef', controls: [] },
      { id: 'beta', title: 'BETA', launchUrl: 'https://beta/', color: '#fedcba', controls: [] },
    ]
    mountHighScoreBoard(panel, custom, getRows, { intervalMs: INTERVAL })

    expect(panel.querySelectorAll(PIP)).toHaveLength(2)
    expect(activeGameId()).toBe('alpha')
    vi.advanceTimersByTime(INTERVAL)
    expect(activeGameId()).toBe('beta')
    vi.advanceTimersByTime(INTERVAL)
    expect(activeGameId(), 'wraps within the custom list only').toBe('alpha')
  })

  it('rotates on a ~4.5s default when no interval is given', () => {
    mountHighScoreBoard(panel, GAMES, getRows)
    expect(activeGameId()).toBe(GAMES[0].id)
    vi.advanceTimersByTime(4500)
    expect(activeGameId(), 'advanced by the ~4.5s design default').toBe(GAMES[1].id)
  })
})

// ---------------------------------------------------------------------------
// AC-4 — a game with no readable scores shows an honest empty state
// ---------------------------------------------------------------------------

describe('a game with nothing readable shows an explicit empty state', () => {
  it('renders NO SCORES YET — never a fabricated name, a zero, or a placeholder ladder', () => {
    // GAMES[0] has no rows seeded, so getRows returns [].
    mountHighScoreBoard(panel, GAMES, getRows, { intervalMs: INTERVAL })

    const ladder = panel.querySelector(LADDER)?.textContent ?? ''
    expect(ladder).toMatch(/NO SCORES YET/i)
    expect(panel.querySelectorAll(ROW), 'no ladder rows for an empty game').toHaveLength(0)
    expect(ladder, 'no fabricated score').not.toMatch(/\d/)
    expect(ladder, 'no fabricated initials row').not.toMatch(/AAA|---/)
  })

  it('drops the empty state when rotating onto a populated game, and re-shows it after', () => {
    // No stale rows may bleed across a rotation, and the empty state must return cleanly.
    rowsById.set(GAMES[1].id, [{ name: 'WIN', score: 7000 }])
    mountHighScoreBoard(panel, GAMES, getRows, { intervalMs: INTERVAL })

    expect(panel.querySelector(LADDER)?.textContent ?? '').toMatch(/NO SCORES YET/i)

    vi.advanceTimersByTime(INTERVAL) // -> GAMES[1], populated
    expect(ladderRows()[0]).toContain('WIN')
    expect(panel.querySelector(LADDER)?.textContent ?? '').not.toMatch(/NO SCORES YET/i)

    vi.advanceTimersByTime(INTERVAL) // -> GAMES[2], empty again
    expect(panel.querySelector(LADDER)?.textContent ?? '', 'empty state returns, no stale WIN').toMatch(
      /NO SCORES YET/i,
    )
    expect(panel.querySelector(LADDER)?.textContent ?? '').not.toContain('WIN')
  })
})

// ---------------------------------------------------------------------------
// AC-6 — the rotation timer is cleaned up and never fires at a detached DOM
// ---------------------------------------------------------------------------

describe('the rotation timer is torn down on stop()', () => {
  it('stops rotating after stop() — the active game freezes', () => {
    const handle = mountHighScoreBoard(panel, GAMES, getRows, { intervalMs: INTERVAL })
    vi.advanceTimersByTime(INTERVAL) // -> GAMES[1]
    expect(activeGameId()).toBe(GAMES[1].id)

    handle.stop()
    vi.advanceTimersByTime(INTERVAL * 5)
    expect(activeGameId(), 'no rotation after stop()').toBe(GAMES[1].id)
  })

  it('does not fire against a detached DOM after stop()', () => {
    const handle = mountHighScoreBoard(panel, GAMES, getRows, { intervalMs: INTERVAL })
    handle.stop()
    panel.remove() // the panel is gone; a live timer would touch a detached node

    expect(() => vi.advanceTimersByTime(INTERVAL * 3)).not.toThrow()
  })

  it('stop() is idempotent', () => {
    const handle = mountHighScoreBoard(panel, GAMES, getRows, { intervalMs: INTERVAL })
    handle.stop()
    expect(() => handle.stop()).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// AC-5 (mechanism) — refresh() re-reads the current game's rows in place
// ---------------------------------------------------------------------------

describe('refresh() re-reads the on-screen game without rebuilding', () => {
  it('picks up a newly-beaten score for the current game', () => {
    rowsById.set(GAMES[0].id, [{ name: 'OLD', score: 1000 }])
    const handle = mountHighScoreBoard(panel, GAMES, getRows, { intervalMs: INTERVAL })
    expect(ladderRows()[0]).toContain('OLD')

    // The player beat their best; the published summary now leads with a new row.
    rowsById.set(GAMES[0].id, [
      { name: 'NEW', score: 250000 },
      { name: 'OLD', score: 1000 },
    ])
    handle.refresh()

    expect(activeGameId(), 'still on the same game').toBe(GAMES[0].id)
    expect(ladderRows()[0]).toContain('NEW')
    expect(ladderRows()[0]).toContain(en(250000))
  })
})
