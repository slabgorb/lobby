// src/shell/storage.ts
//
// Shell-side READ of the per-game high-score table the games persist in
// localStorage, so the lobby can surface each game's best score on its tile.
// This is IO (shell), not data (core): main.ts calls it once per tile. Every
// failure mode (missing key, unavailable storage, corrupt JSON, malformed rows)
// degrades to null — a tile with no readable score just shows "NO SCORE", it
// never throws and never blocks the page.
//
// The key scheme ('{gameId}-high-scores') and the row shape are a deliberate,
// documented MIRROR of the games' own storage (tempest/star-wars
// src/shell/storage.ts), NOT a shared import: per the orchestrator CLAUDE.md the
// arcade shares a visual *language*, not a library, and the lobby has no
// build-time dependency on any game subrepo.

// Per-game localStorage key, e.g. 'tempest-high-scores'. Each game writes its own
// table under this key; tempest and star-wars both follow the convention.
function highScoreKey(gameId: string): string {
  return `${gameId}-high-scores`
}

// Access localStorage defensively: in private-browsing / sandboxed contexts even
// *reading* the global can throw, and in the node test env it is simply absent.
function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

// A stored row is usable only if it carries a finite numeric `score`. The lobby
// reads nothing else — name/level/wave belong to the games' own HUDs, not the
// tile — so we tolerate any extra/missing fields and reject only a bad score.
function scoreOf(value: unknown): number | null {
  if (typeof value !== 'object' || value === null) return null
  const score = (value as Record<string, unknown>).score
  return typeof score === 'number' && Number.isFinite(score) ? score : null
}

// The single best score a game has stored, or null when there is none to show.
// The games persist their tables sorted descending, but we take the max of the
// valid rows rather than trusting table[0]: corrupt or unsorted data still yields
// the true top score instead of a wrong one.
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

  const scores = parsed.map(scoreOf).filter((s): s is number => s !== null)
  if (scores.length === 0) return null
  return Math.max(...scores)
}
