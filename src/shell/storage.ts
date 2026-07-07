// src/shell/storage.ts
//
// Shell-side READ of the per-game high-score table the games persist in
// localStorage, so the lobby can surface each game's best score on its tile.
// This is IO (shell), not data (core): main.ts calls it once per tile. Every
// failure mode (missing key, unavailable storage, corrupt JSON, malformed rows)
// degrades to null — a tile with no readable score just shows "NO SCORE", it
// never throws and never blocks the page.
//
// SH-4: the key scheme (`${gameId}-high-scores`) and the row shape are no longer
// a hand-copied MIRROR of the games' storage — they are IMPORTED from
// @arcade/shared/highscore, the same module the games write with. `highScoreKey`
// and `isHighScoreRow` are now a compile-time contract shared with every game,
// so the tile can never silently drift from the key/shape the games persist.

import { highScoreKey, isHighScoreRow } from '@arcade/shared/highscore'

// Access localStorage defensively: in private-browsing / sandboxed contexts even
// *reading* the global can throw, and in the node test env it is simply absent.
function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

// The single best score a game has stored, or null when there is none to show.
// The games persist their tables sorted descending, but we take the max of the
// valid rows rather than trusting table[0]: corrupt or unsorted data still yields
// the true top score instead of a wrong one. A row counts only if it passes the
// shared `isHighScoreRow` guard (a string name + a finite numeric score) — the
// exact rows the games write.
export function getTopScore(gameId: string): number | null {
  const storage = getStorage()
  if (!storage) return null

  let raw: string | null
  try {
    raw = storage.getItem(highScoreKey(gameId))
  } catch {
    return null
  }
  if (raw === null) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!Array.isArray(parsed)) return null

  const scores = parsed.filter(isHighScoreRow).map((row) => row.score)
  if (scores.length === 0) return null
  return Math.max(...scores)
}
