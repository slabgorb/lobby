// src/shell/tiles.ts
//
// Builds the tile grid from the registry. Shell, not core: it touches the DOM.
//
// Two things here are load-bearing and easy to destroy by accident:
//
// 1. **The registry is the source of truth.** Every game's title, launch URL, glow
//    colour and control hints come from `GAMES` (src/core/registry.ts) and nowhere
//    else. The design file hardcodes all four into its markup — it has no registry
//    to read — and copying that markup across would fork the source of truth so that
//    adding a game meant editing two places and forgetting one.
//
// 2. **A tile is a real link.** `<a href>` is why clicking, Tab+Enter, middle-click,
//    ⌘-click and "open in new tab" all work without a line of JavaScript. A <div>
//    with a click handler looks identical on screen and silently loses four of those
//    five. So: an anchor, with an href, and nothing clever.

import type { Game } from '../core/registry'
import { formatScoreLine } from '../core/score'

// A labelled child span. Text is set via textContent, never innerHTML — registry
// strings are data, and data never becomes markup.
function line(className: string, text: string): HTMLSpanElement {
  const el = document.createElement('span')
  el.className = className
  el.textContent = text
  return el
}

/**
 * One tile for one game. The per-game glow colour rides on the `--glow` custom
 * property, so every glowing part of the tile (border, title, score, controls)
 * inherits it from CSS rather than being coloured here.
 */
export function buildTile(game: Game, topScore: number | null): HTMLAnchorElement {
  const tile = document.createElement('a')
  tile.className = 'tile'
  tile.href = game.launchUrl
  tile.style.setProperty('--glow', game.color)

  // The model bay: a recess in the cabinet, sized and positioned now but drawn into
  // later. lb2-9 renders the game's hero object (blaster, TIE fighter, asteroid,
  // tank, biplane) in here. It is deliberately EMPTY — the space is reserved so that
  // filling it cannot move the tile's layout. Decorative, so it is hidden from
  // assistive tech: the tile already announces itself by title and score.
  const slot = document.createElement('span')
  slot.className = 'tile-model'
  slot.dataset.modelSlot = game.id
  slot.setAttribute('aria-hidden', 'true')
  tile.append(slot)

  tile.append(line('tile-title', game.title))
  tile.append(line('tile-score', formatScoreLine(topScore)))

  const controls = document.createElement('span')
  controls.className = 'tile-controls'
  for (const hint of game.controls) {
    controls.append(line('tile-control', hint))
  }
  tile.append(controls)

  return tile
}

/**
 * Fill `container` with one tile per game, in registry order, asking `getScore` for
 * each game's best score by id.
 *
 * Replaces the grid rather than appending to it, so calling this twice — which
 * lb2-3 will, on returning from a game — refreshes the tiles instead of doubling
 * them.
 */
export function renderTiles(
  container: HTMLElement,
  games: readonly Game[],
  getScore: (id: string) => number | null,
): void {
  container.replaceChildren(...games.map((game) => buildTile(game, getScore(game.id))))
}
