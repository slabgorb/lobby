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
  /** Short keybinding hints shown on the tile, one line per control. */
  controls: readonly string[]
}

/**
 * Every game the lobby lists. Tempest is the cabinet's first title (served under
 * /tempest/); Star Wars joins it under /star-wars/; Asteroids under /asteroids/;
 * Battlezone under /battlezone/. More games join here as their subrepos become
 * servable. Entries are ordered by pinned port (5273, 5274, 5275, 5276).
 */
export const GAMES: readonly Game[] = [
  {
    id: 'tempest',
    title: 'TEMPEST',
    launchUrl: '/tempest/',
    color: '#00eaff',
    controls: ['ROTATE — Wheel / ←→', 'FIRE — Click / Space'],
  },
  {
    id: 'star-wars',
    title: 'STAR WARS',
    launchUrl: '/star-wars/',
    color: '#ffe81f',
    controls: ['AIM — Mouse', 'FIRE — Click / Space'],
  },
  {
    id: 'asteroids',
    title: 'ASTEROIDS',
    launchUrl: '/asteroids/',
    color: '#ff6a00',
    controls: ['ROTATE/THRUST — ←→↑ / WASD', 'FIRE — Space / K'],
  },
  {
    id: 'battlezone',
    title: 'BATTLEZONE',
    launchUrl: '/battlezone/',
    color: '#00ff41',
    controls: ['DRIVE — Arrows / E D I K', 'FIRE — Space / F'],
  },
]

/** Look up a game by id; `undefined` when no game matches. */
export function getGame(id: string): Game | undefined {
  return GAMES.find((g) => g.id === id)
}
