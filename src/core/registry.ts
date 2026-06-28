// src/core/registry.ts
// The lobby's source of truth for "what games live on the cabinet". Pure data,
// no DOM — lives in core/ alongside layout.ts. Story 7-3's tile grid renders
// this list; story 7-4's launch will dispatch on `launchUrl`.

/** A game on the arcade cabinet, as listed in the lobby. */
export interface Game {
  /** Unique slug — used in URLs and (later) per-game high-score keys. */
  id: string
  /** Display label shown on the tile. */
  title: string
  /** Root-relative path the tile launches to (e.g. '/tempest/'). */
  launchUrl: string
  /** Glow colour for the tile outline/label (hex). */
  color: string
}

/**
 * Every game the lobby lists. Tempest is the cabinet's first title (served under
 * /tempest/); more games join here as their subrepos become servable.
 */
export const GAMES: readonly Game[] = [
  { id: 'tempest', title: 'TEMPEST', launchUrl: '/tempest/', color: '#00eaff' },
]

/** Look up a game by id; `undefined` when no game matches. */
export function getGame(id: string): Game | undefined {
  return GAMES.find((g) => g.id === id)
}
