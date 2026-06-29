// src/main.ts
// Lobby bootstrap: a plain DOM page (no canvas). Build one clickable tile per
// game from the registry — each tile is a real <a href> so clicking, the
// keyboard (Tab + Enter), middle-click, and "open in new tab" all work for free.
// The vector/glow look is pure CSS (see index.html); the Vector Battle face is
// loaded best-effort and picked up by CSS once it lands.
import { GAMES } from './core/registry'
import { loadVectorFont } from './shell/font'
import { getTopScore } from './shell/storage'

const games = document.getElementById('games')
if (!games) throw new Error('lobby: #games container missing from index.html')

// One tile per game, in registry order. The per-game glow colour drives the
// CSS via the --glow custom property; the title and best score stack as two
// inheriting spans so both pick up the tile's colour and glow shadow.
for (const game of GAMES) {
  const tile = document.createElement('a')
  tile.className = 'tile'
  tile.href = game.launchUrl
  tile.style.setProperty('--glow', game.color)

  const title = document.createElement('span')
  title.className = 'tile-title'
  title.textContent = game.title
  tile.append(title)

  // Per-game best score, read best-effort from the game's own localStorage
  // table. No stored (or readable) score shows "NO SCORE" rather than nothing,
  // so a fresh cabinet still invites the first run.
  const top = getTopScore(game.id)
  const score = document.createElement('span')
  score.className = 'tile-score'
  score.textContent = top === null ? 'NO SCORE' : `HI SCORE ${top}`
  tile.append(score)

  games.append(tile)
}

// Best-effort web font; the page already reads in the Orbitron/monospace
// fallback, so this just upgrades the typography once the face lands.
void loadVectorFont()
