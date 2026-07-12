// src/core/models.ts
//
// The hero object of each cabinet, as a tile-scale vector silhouette. Pure data — core/,
// not shell/: a list of points can be reasoned about without a browser, and the canvas
// that strokes them lives in shell/modelBay.ts.
//
// These are AUTHORED, not extracted (lb2-9). They are deliberately NOT the games' own ROM
// geometry: star-wars' models.ts is 743 lines of 3D vertex data and battlezone's is 278,
// none of it shaped for a 92px recess. A tile wants a silhouette you can read at a glance
// from across the room — the shape you'd recognise on the side of the cabinet — not a
// faithful mesh rendered too small to see. ADR-0001 extracts on PROVEN duplication; this
// is new geometry with exactly one consumer, so it lives here until a second one appears.
//
// **Coordinates are normalised to a unit box: |x| <= 1, |y| <= 1, origin at the centre.**
// y runs DOWN, as it does on a canvas. The shell scales this box into the bay, so a model
// that respected the box can never spill out of the recess lb2-7 reserved for it — the
// tile layout is safe from anything drawn here.

/** One stroke of a model: a run of points, optionally closed back into a ring. */
export interface ModelPath {
  /** Points in the unit box, in draw order. Two points minimum — a lone point strokes nothing. */
  readonly points: readonly (readonly [number, number])[]
  /** True to close the ring back to the first point (maps to `glowPolyline`'s `close`). */
  readonly closed: boolean
}

/** A cabinet's hero object, as the paths that draw it. */
export interface TileModel {
  readonly paths: readonly ModelPath[]
}

/**
 * The models, keyed by registry game id.
 *
 * A Map, not an object literal, and that is load-bearing: the id this is looked up with
 * comes off `data-model-slot` — a DOM string, which is data, not a key we trust. A bare
 * object literal answers `TILE_MODELS['toString']` with a *function* — truthy, not a
 * model, and the caller happily tries to draw it. A Map has no prototype to inherit from.
 */
const TILE_MODELS: ReadonlyMap<string, TileModel> = new Map<string, TileModel>([
  // TEMPEST — the blaster. The claw that rides the rim of the tube: two outer prongs, a
  // spike between them, and the shoulders swept back. Closed, so the back bar joins the
  // outer tips the way the real shooter's does.
  [
    'tempest',
    {
      paths: [
        {
          points: [
            [-0.95, -0.55],
            [-0.6, 0.35],
            [-0.25, -0.15],
            [0, 0.55],
            [0.25, -0.15],
            [0.6, 0.35],
            [0.95, -0.55],
          ],
          closed: true,
        },
      ],
    },
  ],

  // STAR WARS — a TIE fighter, head on. Two ion panels, the struts, and the cockpit ball
  // between them. The panels are what the eye reads first, so they carry the silhouette.
  [
    'star-wars',
    {
      paths: [
        {
          points: [
            [-0.85, -0.8],
            [-0.55, -0.5],
            [-0.55, 0.5],
            [-0.85, 0.8],
          ],
          closed: true,
        },
        {
          points: [
            [0.85, -0.8],
            [0.55, -0.5],
            [0.55, 0.5],
            [0.85, 0.8],
          ],
          closed: true,
        },
        {
          points: [
            [-0.55, 0],
            [-0.28, 0],
          ],
          closed: false,
        },
        {
          points: [
            [0.55, 0],
            [0.28, 0],
          ],
          closed: false,
        },
        {
          // The cockpit ball, as the octagon a vector monitor would actually draw.
          points: [
            [-0.28, -0.12],
            [-0.12, -0.28],
            [0.12, -0.28],
            [0.28, -0.12],
            [0.28, 0.12],
            [0.12, 0.28],
            [-0.12, 0.28],
            [-0.28, 0.12],
          ],
          closed: true,
        },
      ],
    },
  ],

  // ASTEROIDS — a rock. Irregular on every face, with two crags biting inward: a convex
  // ring reads as a coin, and the whole point of an asteroid is that it doesn't.
  [
    'asteroids',
    {
      paths: [
        {
          points: [
            [0, -0.9],
            [0.45, -0.75],
            [0.9, -0.35],
            [0.65, 0], // crag
            [0.9, 0.45],
            [0.4, 0.9],
            [0, 0.65], // crag
            [-0.45, 0.9],
            [-0.9, 0.4],
            [-0.7, -0.1], // crag
            [-0.9, -0.5],
            [-0.4, -0.8],
          ],
          closed: true,
        },
      ],
    },
  ],

  // BATTLEZONE — the enemy tank, in profile: a low hull, the turret sitting on it, and the
  // gun barrel out front. Side-on rather than head-on, because head-on it is a box, and a
  // box next to Tempest's box of a bay is nothing at all.
  [
    'battlezone',
    {
      paths: [
        {
          points: [
            [-0.9, 0.6],
            [-0.78, 0.15],
            [0.78, 0.15],
            [0.9, 0.6],
          ],
          closed: true,
        },
        {
          points: [
            [-0.35, 0.15],
            [-0.25, -0.2],
            [0.15, -0.2],
            [0.3, 0.15],
          ],
          closed: true,
        },
        {
          points: [
            [0.15, -0.1],
            [0.95, -0.1],
          ],
          closed: false,
        },
      ],
    },
  ],

  // RED BARON — the biplane, head on. Head-on is what makes it a BIPLANE at a glance: the
  // stacked pair of wings is the whole tell, and in profile they collapse into one line.
  //
  // The fuselage is deliberately SLIM. Drawn fat it becomes the widest thing in the bay,
  // the wings read as crossbars hanging off it, and the whole silhouette turns into a
  // diamond-shaped glyph — which is what the first cut of this model did. The wings have
  // to be the longest strokes on screen, and the landing gear is what stops the rest from
  // reading as an aircraft seen from any other angle.
  [
    'red-baron',
    {
      paths: [
        {
          points: [
            [-0.95, -0.35],
            [0.95, -0.35],
          ],
          closed: false,
        },
        {
          points: [
            [-0.8, 0.25],
            [0.8, 0.25],
          ],
          closed: false,
        },
        {
          points: [
            [-0.6, -0.35],
            [-0.58, 0.25],
          ],
          closed: false,
        },
        {
          points: [
            [0.6, -0.35],
            [0.58, 0.25],
          ],
          closed: false,
        },
        {
          // Fuselage: cowl at the nose, tapering back past the wings to the tail.
          points: [
            [-0.15, -0.35],
            [0, -0.62],
            [0.15, -0.35],
            [0.15, 0.25],
            [0, 0.42],
            [-0.15, 0.25],
          ],
          closed: true,
        },
        {
          // Landing gear: two legs and the axle between them (the closing stroke).
          points: [
            [-0.4, 0.78],
            [-0.15, 0.3],
            [0.15, 0.3],
            [0.4, 0.78],
          ],
          closed: true,
        },
      ],
    },
  ],
])

/** The hero model for a game id; `undefined` when the lobby has no model for it. */
export function getTileModel(id: string): TileModel | undefined {
  return TILE_MODELS.get(id)
}
