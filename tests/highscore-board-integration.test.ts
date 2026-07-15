// @vitest-environment jsdom
//
// lb2-8 / AC-5 — the board re-reads on return from a game, through lb2-3's ONE refresh
// entry point (the `pageshow` listener main.ts already owns for the tiles).
//
// This goes through the REAL bootstrap (`../src/main`) rather than calling the board's
// refresh by name: WHERE the re-read is wired is Dev's call; THAT it happens on return —
// and that the board picks up the new ladder without a manual reload — is the AC.
//
// Scores are published through the real `makeHighScoreStorage(...).save()` — the exact
// path a game uses — so this test is agnostic to Dev's cookie encoding: the same library
// that writes the summary reads it back. A cold hand-written cookie would couple this test
// to an encoding the story deliberately leaves to Dev.
//
// Like lb2-3's refresh.test.ts, the case that matters is the BFCache restore: on a back-
// navigation nothing at module scope runs again, so a load-time-only fix passes nothing
// here — every re-read is driven by a real `pageshow` with `persisted: true`.
//
// CONTRACT: main.ts mounts the board into `#high-scores` (the panel container lb2-8 adds
// to index.html) and refreshes it on the same `pageshow` as the tiles. The board's own
// hooks (.hs-row etc.) are documented in highscore-board.test.ts.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { makeHighScoreStorage, makeHighScoreRowGuard } from '@arcade/shared/highscore'

const guard = makeHighScoreRowGuard('level')

/** A game publishing its ladder across the origin boundary, exactly as it does in life:
 *  the shared factory derives and publishes the top-N summary from the table. */
function publishLadder(gameId: string, rows: Array<[name: string, score: number]>): void {
  const table = rows.map(([name, score], i) => ({ name, score, level: i + 1 }))
  makeHighScoreStorage(gameId, guard).save(table)
}

/** The ladder rows the board is currently showing, top to bottom. */
function ladderText(): string {
  return (
    document.querySelector('#high-scores')?.querySelector('.hs-ladder')?.textContent ?? ''
  )
}

/** A real `pageshow`; `persisted: true` is the BFCache restore a load-only fix can't reach. */
function firePageshow(persisted: boolean): void {
  const event = new Event('pageshow')
  Object.defineProperty(event, 'persisted', { value: persisted })
  window.dispatchEvent(event)
}

function clearCookies(): void {
  for (const pair of document.cookie.split(';')) {
    const name = pair.split('=')[0]?.trim()
    if (name) document.cookie = `${name}=; Path=/; Max-Age=0`
  }
}

async function bootLobby(): Promise<void> {
  vi.resetModules()
  await import('../src/main')
}

beforeEach(() => {
  vi.useFakeTimers() // freeze rotation so the board stays on the first game (tempest)
  clearCookies()
  // The two containers main.ts fills: the tile grid and the high-scores panel.
  // The board reads its rows from the shared-domain COOKIE (not localStorage), so the
  // cookie jar is the only state to reset — exactly as lb2-3's refresh.test.ts does.
  document.body.innerHTML = '<nav id="games"></nav><section id="high-scores"></section>'
})

afterEach(() => {
  vi.clearAllTimers()
  vi.useRealTimers()
  clearCookies()
})

describe('the high-scores board refreshes on return from a game', () => {
  it('shows a newly-beaten ladder after a BFCache back-navigation, with no manual reload', async () => {
    publishLadder('tempest', [
      ['JPX', 100000],
      ['AAA', 40000],
    ])
    await bootLobby()
    expect(ladderText(), 'precondition: opens on the old ladder').toContain('JPX')

    // The player launches tempest, beats their best, and hits Back. The game republished a
    // richer ladder. The lobby is restored from the BFCache, so the ONLY thing that runs is
    // the pageshow listener — if the board read its rows once at build time, it is still
    // showing the old ladder and this fails.
    publishLadder('tempest', [
      ['NEW', 250000],
      ['JPX', 100000],
    ])
    firePageshow(true)

    expect(ladderText()).toContain('NEW')
    expect(ladderText()).toContain((250000).toLocaleString('en-US'))
  })

  it('promotes a game from the empty state to a real ladder the first time it is played', async () => {
    await bootLobby()
    expect(ladderText(), 'precondition: nothing published for tempest yet').toMatch(/NO SCORES YET/i)

    publishLadder('tempest', [['WIN', 7000]])
    firePageshow(true)

    expect(ladderText()).toContain('WIN')
    expect(ladderText()).not.toMatch(/NO SCORES YET/i)
  })
})
