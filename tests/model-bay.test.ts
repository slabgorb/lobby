// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { GlowStyle } from '@arcade/shared/glow'

// The model bay: the canvas half of lb2-9. tiles.ts (lb2-7) reserves an empty
// `[data-model-slot]` recess in every tile; `mountModels` fills it with the game's hero
// object, drawn as a glowing vector model.
//
// The build path stays structural. `buildTile` still leaves the bay empty — that is the
// contract tiles.test.ts pins, and it is why `refreshScores` can rewrite a score line
// without destroying the models sitting next to it. Mounting is a separate pass that runs
// once, after the grid is on the page.
//
// Two things are load-bearing and easy to destroy by accident:
//
// 1. **The glow is not ours to re-implement.** @arcade/shared/glow already owns the
//    set-strokeStyle/shadowColor/shadowBlur → draw → RESET-shadowBlur envelope, and owns
//    the reset that asteroids, star-wars and battlezone each forgot. We call it. The suite
//    below mocks that subpath and fails if the lobby hand-rolls the stack instead.
//
// 2. **This is the front door, not a game.** A visitor parks here with the tab in the
//    background. Five tiles × one requestAnimationFrame loop each is five game loops
//    running to render five things that barely move. The rAF tests below are the battery
//    budget, written down.

// The shared glow subpath, mocked at the specifier the shell imports. Asserting on these
// spies is how we prove the drawing went THROUGH @arcade/shared/glow — a hand-rolled
// stack would leave them untouched and set ctx.shadowBlur itself (which the recording
// context below catches).
const glow = vi.hoisted(() => ({
  glowPolyline: vi.fn(),
  withGlow: vi.fn(),
}))
vi.mock('@arcade/shared/glow', () => ({
  glowPolyline: glow.glowPolyline,
  withGlow: glow.withGlow,
}))

import { mountModels } from '../src/shell/modelBay'
import { refreshScores, renderTiles } from '../src/shell/tiles'
import { GAMES, type Game } from '../src/core/registry'

// A game the lobby lists but has no hero model for — the degrade path.
const SYNTHETIC: Game = {
  id: 'lunar-lander',
  title: 'LUNAR LANDER',
  launchUrl: 'https://lunar-lander.slabgorb.com/',
  color: '#7d3cff',
  controls: ['THRUST — Up'],
}

// ---------------------------------------------------------------------------
// A recording 2D context. jsdom ships no canvas implementation, so getContext('2d')
// answers null on a bare HTMLCanvasElement — we stand in a stub that records what was
// asked of it. `shadowBlur` is an ACCESSOR, not a plain field, so we can see a
// hand-rolled glow stack writing to it. (Do not also declare a `shadowBlur` property
// alongside it: TS2300, duplicate identifier — tsc catches it, vitest does not.)
// ---------------------------------------------------------------------------
interface RecordingContext {
  readonly shadowBlurWrites: number[]
  readonly strokeCalls: number
}

let ctxAvailable = true
let recording: RecordingContext

function installCanvasStub(): RecordingContext {
  const shadowBlurWrites: number[] = []
  let strokeCalls = 0
  let blur = 0

  const ctx = {
    clearRect: vi.fn(),
    setTransform: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    stroke: () => {
      strokeCalls++
    },
    strokeStyle: '' as string | CanvasGradient,
    lineWidth: 1,
    shadowColor: '',
    get shadowBlur(): number {
      return blur
    },
    set shadowBlur(value: number) {
      blur = value
      shadowBlurWrites.push(value)
    },
  }

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    // A recording stand-in for a real 2D context: it implements only what the model bay
    // is allowed to touch, so anything else throws rather than passing silently.
    () => (ctxAvailable ? (ctx as unknown as CanvasRenderingContext2D) : null),
  )

  return {
    shadowBlurWrites,
    get strokeCalls() {
      return strokeCalls
    },
  }
}

// ---------------------------------------------------------------------------
// A frame clock we drive by hand. Honours cancelAnimationFrame — an implementation that
// correctly cancels its loop on visibilitychange must not have its dead callback run
// anyway, or the test would be measuring the wrong thing.
// ---------------------------------------------------------------------------
let frames: Map<number, FrameRequestCallback>
let rafRequests: number
let nextFrameId: number

function installFrameClock(): void {
  frames = new Map()
  rafRequests = 0
  nextFrameId = 0

  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
    rafRequests++
    const id = ++nextFrameId
    frames.set(id, cb)
    return id
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number) => {
    frames.delete(id)
  })
}

/** Run every frame callback currently queued, `count` times over. */
function flushFrames(count = 1): void {
  for (let i = 0; i < count; i++) {
    const queued = [...frames.values()]
    frames.clear()
    for (const cb of queued) cb(performance.now())
  }
}

let hidden = false

function setTabHidden(value: boolean): void {
  hidden = value
  document.dispatchEvent(new Event('visibilitychange'))
}

let container: HTMLElement

beforeEach(() => {
  document.body.innerHTML = '<nav id="games"></nav>'
  container = document.getElementById('games') as HTMLElement

  ctxAvailable = true
  recording = installCanvasStub()
  installFrameClock()

  hidden = false
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => (hidden ? 'hidden' : 'visible'),
  })

  // withGlow's contract is "apply the glow state, run `draw`, reset the blur". A mock that
  // never calls `draw` would hide a real drawing bug, so the stand-in runs it.
  glow.withGlow.mockImplementation((_ctx: unknown, _style: unknown, draw: () => void) => draw())
  glow.glowPolyline.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

/** Every GlowStyle the shell handed to the shared glow subpath. */
function glowStyles(): GlowStyle[] {
  return glow.glowPolyline.mock.calls.map((call) => call[2] as GlowStyle)
}

describe('mountModels — a real vector model in every bay', () => {
  it('draws a model into every tile bay on the row', () => {
    renderTiles(container, GAMES, () => null)
    mountModels(container)

    expect(container.querySelectorAll('[data-model-slot] canvas').length).toBe(GAMES.length)
  })

  it('actually strokes geometry — a mounted canvas that draws nothing is just an empty box', () => {
    renderTiles(container, GAMES, () => null)
    mountModels(container)

    // At least one polyline per cabinet. A model bay that mounts a blank canvas passes
    // every structural assertion above and still leaves the row looking like lb2-7.
    expect(glow.glowPolyline.mock.calls.length).toBeGreaterThanOrEqual(GAMES.length)
  })

  it('draws each game in its own registry glow colour', () => {
    for (const game of GAMES) {
      glow.glowPolyline.mockReset()
      document.body.innerHTML = '<nav id="games"></nav>'
      const solo = document.getElementById('games') as HTMLElement

      renderTiles(solo, [game], () => null)
      mountModels(solo)

      const strokes = glowStyles().map((style) => style.stroke)
      expect(strokes.length).toBeGreaterThan(0)
      // Every stroke in this tile is this game's colour and no other — the registry is
      // the source of truth for the glow, exactly as it is for the title and the href.
      expect([...new Set(strokes)]).toEqual([game.color])
    }
  })
})

describe('mountModels — the glow belongs to @arcade/shared, not to the lobby', () => {
  it('strokes through the shared glow subpath', () => {
    renderTiles(container, GAMES, () => null)
    mountModels(container)

    expect(glow.glowPolyline).toHaveBeenCalled()
  })

  // The tell of a hand-rolled glow stack: the lobby setting shadowBlur on the context
  // itself. Everything that reaches the canvas must go through withGlow/glowPolyline,
  // which own the set-draw-RESET envelope (and own remembering the reset).
  it('never hand-rolls the glow envelope on the context', () => {
    renderTiles(container, GAMES, () => null)
    mountModels(container)

    expect(recording.shadowBlurWrites).toEqual([])
    expect(recording.strokeCalls).toBe(0)
  })
})

describe('mountModels — degrades to an empty bay, never to a broken one', () => {
  it('leaves the bay empty for a listed game with no model', () => {
    renderTiles(container, [SYNTHETIC], () => null)

    expect(() => mountModels(container)).not.toThrow()

    const slot = container.querySelector('[data-model-slot]') as HTMLElement
    expect(slot.children.length).toBe(0)
    expect(glow.glowPolyline).not.toHaveBeenCalled()
  })

  it('draws the models it has even when a neighbour on the row has none', () => {
    renderTiles(container, [...GAMES, SYNTHETIC], () => null)
    mountModels(container)

    // One missing model must not cost the other five theirs.
    expect(container.querySelectorAll('[data-model-slot] canvas').length).toBe(GAMES.length)
    const orphan = container.querySelector('[data-model-slot="lunar-lander"]') as HTMLElement
    expect(orphan.children.length).toBe(0)
  })

  // The slot's id is a DOM string. It is data, not a key to trust (typescript rule #10).
  it('does not trust the slot dataset — an id the registry never issued draws nothing', () => {
    container.innerHTML =
      '<a class="tile"><span class="tile-model" data-model-slot="toString" aria-hidden="true"></span></a>'

    expect(() => mountModels(container)).not.toThrow()
    expect(container.querySelector('canvas')).toBeNull()
    expect(glow.glowPolyline).not.toHaveBeenCalled()
  })

  // getContext('2d') returns null on a cabinet that cannot give us one — an exhausted
  // context pool, a hardened browser. A blank canvas left behind in the bay is exactly
  // the "broken or blank canvas" the AC forbids: it draws the empty recess AND its own
  // borderless box on top. Leave the bay as lb2-7 built it instead.
  it('leaves no canvas behind when the browser gives us no 2D context', () => {
    ctxAvailable = false
    renderTiles(container, GAMES, () => null)

    expect(() => mountModels(container)).not.toThrow()
    expect(container.querySelector('canvas')).toBeNull()
  })
})

describe('mountModels — courteous on the front door', () => {
  // Five tiles must not mean five game loops. A static model registers no frame at all; a
  // single shared loop driving every bay registers one. Five is a per-tile game loop, and
  // it is the visitor's battery that pays for it.
  it('does not start an animation loop per tile', () => {
    renderTiles(container, GAMES, () => null)
    mountModels(container)

    expect(rafRequests).toBeLessThanOrEqual(1)
  })

  // Whatever it does while the tab is in front, it does nothing behind it.
  it('schedules no frames while the tab is hidden', () => {
    renderTiles(container, GAMES, () => null)
    mountModels(container)
    flushFrames(2)

    setTabHidden(true)
    const scheduledBefore = rafRequests
    flushFrames(3)

    expect(rafRequests - scheduledBefore).toBe(0)
  })

  it('never mounts a bay it was not given — the grid container bounds the work', () => {
    document.body.insertAdjacentHTML(
      'beforeend',
      '<span class="tile-model" data-model-slot="tempest" aria-hidden="true"></span>',
    )
    renderTiles(container, GAMES, () => null)
    mountModels(container)

    const stray = document.body.querySelector(':scope > [data-model-slot]') as HTMLElement
    expect(stray.children.length).toBe(0)
  })
})

describe('mountModels — the bay is a recess, and filling it moves nothing', () => {
  // The bay is a fixed 5.75rem square (index.html .tile-model). A canvas carries an
  // intrinsic pixel size, and `<canvas width=256>` with no CSS sizing lays out at 256 CSS
  // pixels — blowing the recess wide open and ragging the whole row. The backing store and
  // the box on the page are two different numbers, and both have to be said out loud.
  it('sizes the canvas in CSS so its pixel buffer cannot blow the bay open', () => {
    renderTiles(container, GAMES, () => null)
    mountModels(container)

    for (const canvas of container.querySelectorAll('canvas')) {
      expect(canvas.style.width).not.toBe('')
      expect(canvas.style.height).not.toBe('')
      expect(canvas.width).toBeGreaterThan(0)
      expect(canvas.height).toBeGreaterThan(0)
    }
  })

  it('adds the canvas inside the bay, and changes nothing else about the tile', () => {
    renderTiles(container, GAMES, () => null)
    const before = [...container.querySelectorAll('.tile')].map((tile) =>
      [...tile.children].map((child) => child.className).join('|'),
    )

    mountModels(container)

    const after = [...container.querySelectorAll('.tile')].map((tile) =>
      [...tile.children].map((child) => child.className).join('|'),
    )
    expect(after).toEqual(before)
  })

  it('keeps the bay hidden from assistive tech — it is decoration, and the tile already speaks', () => {
    renderTiles(container, GAMES, () => null)
    mountModels(container)

    for (const slot of container.querySelectorAll('[data-model-slot]')) {
      expect(slot.getAttribute('aria-hidden')).toBe('true')
    }
  })

  // main.ts already fires `refreshScores` on every pageshow, and a second mount is one
  // careless line away. Stacking a second canvas in the bay would double the draw cost and
  // (if it animates) the loop with it.
  it('mounting twice does not stack a second canvas in the bay', () => {
    renderTiles(container, GAMES, () => null)
    mountModels(container)
    mountModels(container)

    expect(container.querySelectorAll('[data-model-slot] canvas').length).toBe(GAMES.length)
  })

  // The reason buildTile leaves the bay empty and the score line is rewritten in place:
  // refreshScores (lb2-3) must be able to update a score on return from a game without
  // throwing away the models. Rebuilding the grid there would wipe every bay.
  it('survives a score refresh with its models intact', () => {
    renderTiles(container, GAMES, () => null)
    mountModels(container)

    refreshScores(container, () => 149830)

    expect(container.querySelectorAll('[data-model-slot] canvas').length).toBe(GAMES.length)
    const tempest = container.querySelector('a[href="https://tempest.slabgorb.com/"]')
    expect(tempest?.textContent).toContain('HI · 149,830')
  })
})
