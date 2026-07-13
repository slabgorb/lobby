import { describe, it, expect } from 'vitest'
import { getTileModel, type TileModel } from '../src/core/models'
import { GAMES } from '../src/core/registry'

// The hero geometry, as pure data. No DOM here — core/ is where the lobby keeps the
// things that can be reasoned about without a browser, and a list of points is exactly
// that. The canvas lives in shell/modelBay.ts and is tested next door.
//
// These models are AUTHORED, not extracted (lb2-9 SM decision): tile-scale 2D
// silhouettes drawn from each cabinet's hero object. They are deliberately NOT the
// games' own ROM geometry — star-wars' models.ts is 743 lines of 3D vertex data and
// battlezone's is 278, none of it shaped for a 92px bay.
//
// Coordinates are normalised to a unit box: |x| <= 1, |y| <= 1, origin at the centre of
// the bay. The shell scales that box into the tile. Keeping the contract here means the
// shell can never be handed a model that draws outside its own recess.

/** Every model the registry expects, paired with the game it belongs to. */
const MODELS: ReadonlyArray<readonly [string, TileModel]> = GAMES.map((game) => {
  const model = getTileModel(game.id)
  if (model === undefined) throw new Error(`no tile model for registry game ${game.id}`)
  return [game.id, model] as const
})

function points(model: TileModel): ReadonlyArray<readonly [number, number]> {
  return model.paths.flatMap((path) => path.points)
}

describe('getTileModel — every cabinet on the row has a model', () => {
  // The grid is the registry (lb2-7). A game that ships a tile but no model is a hole in
  // the row, and this is the test that refuses to let a sixth game be added without one.
  it.each(GAMES.map((g) => g.id))('has a model for the registry game %s', (id) => {
    expect(getTileModel(id)).toBeDefined()
  })

  it('returns undefined for a game it has never heard of', () => {
    expect(getTileModel('lunar-lander')).toBeUndefined()
  })

  // The id this is called with comes off `data-model-slot` — a DOM string, which is data,
  // not a key we trust (typescript rule #10). A model table that is a bare object literal
  // answers `TILE_MODELS['toString']` with a *function* — truthy, not a model, and the
  // caller happily tries to draw it. A Map (or a null-prototype table) does not.
  it('answers undefined — not an inherited Object member — for prototype keys', () => {
    for (const hostile of ['__proto__', 'constructor', 'toString', 'valueOf', 'hasOwnProperty']) {
      expect(getTileModel(hostile)).toBeUndefined()
    }
  })

  it('answers undefined for the empty id rather than throwing', () => {
    expect(getTileModel('')).toBeUndefined()
  })
})

describe('tile model geometry — drawable, bounded, and each cabinet its own', () => {
  it.each(MODELS)('%s: has at least one path, and no path is a single stranded point', (_id, model) => {
    expect(model.paths.length).toBeGreaterThan(0)
    for (const path of model.paths) {
      // glowPolyline moveTo's the first point and lineTo's the rest — a one-point path
      // strokes nothing at all. It would look exactly like a model that failed to load.
      expect(path.points.length).toBeGreaterThanOrEqual(2)
    }
  })

  // The bay is a fixed 5.75rem square with a border (index.html .tile-model). The whole
  // point of lb2-7 reserving it was that filling it cannot move the layout — so a model
  // that runs outside the unit box would spill over the recess it is supposed to sit in.
  it.each(MODELS)('%s: stays inside the unit box, so it cannot spill out of the bay', (_id, model) => {
    for (const [x, y] of points(model)) {
      expect(Number.isFinite(x)).toBe(true)
      expect(Number.isFinite(y)).toBe(true)
      expect(Math.abs(x)).toBeLessThanOrEqual(1)
      expect(Math.abs(y)).toBeLessThanOrEqual(1)
    }
  })

  // ...and the other way round: a model that technically fits but occupies a corner of
  // the bay reads as a speck, not a hero object. It has to actually use the recess.
  it.each(MODELS)('%s: fills the bay rather than huddling in one corner of it', (_id, model) => {
    const xs = points(model).map(([x]) => x)
    const ys = points(model).map(([, y]) => y)
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.5)
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(0.3)
  })

  it.each(MODELS)('%s: is a shape, not a single line segment', (_id, model) => {
    expect(points(model).length).toBeGreaterThanOrEqual(6)
  })

  // The cheapest way to make every test above pass is to author ONE shape and return it
  // for all five games. The row would still read as five identical boxes — which is the
  // exact failure lb2-9 exists to end.
  it('gives every game its own shape, not one silhouette copy-pasted five times', () => {
    const shapes = MODELS.map(([, model]) => JSON.stringify(model.paths))
    expect(new Set(shapes).size).toBe(MODELS.length)
  })
})
