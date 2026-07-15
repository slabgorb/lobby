// src/shell/highscoreBoard.ts
//
// lb2-8 — the rotating HIGH SCORES board. Shell, not core: it owns DOM and a timer.
//
// The design's centrepiece panel cycles ONE game at a time on a ~4.5s timer — the game's
// name in its own glow colour, a TOP FIVE ladder of name/score rows, and a row of pips (one
// per game, the active one lit in that game's colour). Everything it draws comes from the
// registry it is HANDED and the rows source it is GIVEN: it hardcodes no game, colour, or
// score. (The design's markup hardcodes all four games; the tiles read the registry instead,
// and so does this — one place to add a game, `src/core/registry.ts`.)
//
// Two invariants, the same ones tiles.ts holds:
//   1. The registry is the source of truth — games, titles and colours arrive as arguments.
//   2. Text is set via textContent, never innerHTML — a player's name is data, and data
//      never becomes markup.
//
// The empty state and any score-line wording live in core/score.ts (the one place allowed to
// word what the cabinet says about a record); this module imports them.

import type { Game } from '../core/registry'
import { NO_SCORES_YET } from '../core/score'

/** One published ladder row — the widened @arcade/shared summary shape: initials + score. */
export interface HighScoreRow {
  name: string
  score: number
}

/** A mounted board: re-read the on-screen game, or tear the rotation down. */
export interface HighScoreBoardHandle {
  /** Re-read the game CURRENTLY on screen and redraw its ladder in place — lb2-3's single
   *  re-read entry point, called when the player returns from beating a score. Does not
   *  disturb the rotation cursor. */
  refresh(): void
  /** Stop rotating and release the timer. Idempotent, and safe to call after the panel has
   *  been detached — a stopped board never fires against a dead DOM (AC-6). */
  stop(): void
}

// The design's ~4.5s dwell per game. One source of truth for the default cadence.
const DEFAULT_INTERVAL_MS = 4500

// Pinned to en-US for the same reason core/score.ts pins its own: an un-locale'd
// toLocaleString renders `149.830` in Berlin — right on a US CI runner, wrong in the wild.
const SCORE_LOCALE = 'en-US'

/**
 * Mount the rotating board into `panel`, cycling through `games` (in registry order) and
 * reading each game's ladder from `getRows`. Rotates every `intervalMs` (default ~4.5s),
 * wrapping from the last game back to the first. Returns a handle to refresh or tear it down.
 */
export function mountHighScoreBoard(
  panel: HTMLElement,
  games: readonly Game[],
  getRows: (gameId: string) => readonly HighScoreRow[],
  options: { intervalMs?: number } = {},
): HighScoreBoardHandle {
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS

  // --- skeleton, built once ---------------------------------------------------
  const title = document.createElement('div')
  title.className = 'hs-title'

  const ladder = document.createElement('div')
  ladder.className = 'hs-ladder'

  // One pip per game, each carrying its own glow colour so the active pip lights in the
  // game's colour; a two-game cabinet shows exactly two pips.
  const pipRow = document.createElement('div')
  pipRow.className = 'hs-pips'
  const pips = games.map((game) => {
    const pip = document.createElement('span')
    pip.className = 'hs-pip'
    pip.setAttribute('data-pip', game.id)
    pip.style.setProperty('--glow', game.color)
    return pip
  })
  pipRow.append(...pips)

  panel.replaceChildren(title, ladder, pipRow)

  // The game currently on screen. Advances on the timer; `refresh()` reads it, never moves it.
  let index = 0

  // Redraw only the ladder region for one game — the top-five rows, or the honest empty state.
  // replaceChildren every time, so no row from the previous game can bleed across a rotation.
  function drawLadder(gameId: string): void {
    const rows = getRows(gameId)
    if (rows.length === 0) {
      // AC-4: an explicit empty state — no rows, no digits, no fabricated initials.
      const empty = document.createElement('div')
      empty.className = 'hs-empty'
      empty.textContent = NO_SCORES_YET
      ladder.replaceChildren(empty)
      return
    }
    // Render exactly the rows handed over, in order — never padded to five with blanks.
    ladder.replaceChildren(
      ...rows.map((row) => {
        const rowEl = document.createElement('div')
        rowEl.className = 'hs-row'

        const name = document.createElement('span')
        name.className = 'hs-name'
        name.textContent = row.name

        const score = document.createElement('span')
        score.className = 'hs-score'
        score.textContent = row.score.toLocaleString(SCORE_LOCALE)

        rowEl.append(name, score)
        return rowEl
      }),
    )
  }

  // Draw the whole board for the current game: name (in its glow colour), lit pip, ladder.
  function render(): void {
    const game = games[index]
    title.textContent = game.title
    title.style.setProperty('--glow', game.color)
    pips.forEach((pip, i) => pip.classList.toggle('is-active', i === index))
    drawLadder(game.id)
  }

  render()

  const timer = setInterval(() => {
    index = (index + 1) % games.length
    render()
  }, intervalMs)

  return {
    refresh(): void {
      drawLadder(games[index].id)
    },
    stop(): void {
      clearInterval(timer)
    },
  }
}
