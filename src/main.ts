// src/main.ts
// Lobby bootstrap: a plain DOM page (no canvas). The cabinet furniture — the vector
// grid floor and its mirrored ceiling, the bezel brackets, the marquee, the vignette
// — is static markup in index.html. All this does is fill the grid with one tile per
// registry game, and upgrade the typeface once the vector face lands.
import { GAMES } from './core/registry'
import { loadVectorFont } from './shell/font'
import { getTopScore } from './shell/storage'
import { renderTiles } from './shell/tiles'

const games = document.getElementById('games')
if (!games) throw new Error('lobby: #games container missing from index.html')

// The registry is the whole guest list: adding a game there puts it on the cabinet,
// and nothing else needs to know. Scores are read best-effort per game — an
// unreadable one shows NO SCORE rather than blocking the page.
renderTiles(games, GAMES, getTopScore)

// Best-effort web font; the page already reads in the Orbitron/monospace fallback,
// so this just upgrades the typography once the face lands.
void loadVectorFont()
