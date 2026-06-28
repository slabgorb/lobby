// src/main.ts
// Lobby bootstrap: a plain DOM page (no canvas). Build one clickable tile per
// game from the registry — each tile is a real <a href> so clicking, the
// keyboard (Tab + Enter), middle-click, and "open in new tab" all work for free.
// The vector/glow look is pure CSS (see index.html); the Vector Battle face is
// loaded best-effort and picked up by CSS once it lands.
import { GAMES } from './core/registry'
import { loadVectorFont } from './shell/font'

const games = document.getElementById('games')
if (!games) throw new Error('lobby: #games container missing from index.html')

// One tile per game, in registry order. The per-game glow colour drives the
// CSS via the --glow custom property.
for (const game of GAMES) {
  const tile = document.createElement('a')
  tile.className = 'tile'
  tile.href = game.launchUrl
  tile.textContent = game.title
  tile.style.setProperty('--glow', game.color)
  games.append(tile)
}

// Best-effort web font; the page already reads in the Orbitron/monospace
// fallback, so this just upgrades the typography once the face lands.
void loadVectorFont()
