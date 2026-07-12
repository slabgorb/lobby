// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GAMES } from '../src/core/registry'

// Wiring. Every other test in this story can pass while the page stays blank: a
// perfect tiles.ts that main.ts never calls, or a main.ts that renders into a
// container index.html no longer has. This drives the real bootstrap end to end —
// import main.ts against a DOM, and assert the tiles actually land, with the real
// registry and the real score reader behind them.

// A minimal in-memory localStorage. The lobby no longer reads a game's table out of it
// (lb2-2 / ADR-0004 — that store belongs to another origin and the lobby can never see it),
// but main.ts still boots against a page that has one, so the stub stays.
function fakeStorage(initial: Record<string, string> = {}): Storage {
  const store = new Map<string, string>(Object.entries(initial))
  return {
    getItem: (key) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key, value) => void store.set(key, String(value)),
    removeItem: (key) => void store.delete(key),
    clear: () => store.clear(),
    key: (i) => [...store.keys()][i] ?? null,
    get length() {
      return store.size
    },
  } as Storage
}

// lb2-2: a game publishes its top score to a cookie on the shared parent domain — that
// cookie is now the lobby's ONLY source for a tile's score. (No Domain attribute here:
// jsdom serves from localhost, which is exactly the dev cabinet's host-only case.)
function publishScore(gameId: string, score: number): void {
  document.cookie = `arcade-hi-${gameId}=${score}; Path=/`
}

function clearPublishedScores(): void {
  for (const pair of document.cookie.split(';')) {
    const name = pair.split('=')[0]?.trim()
    if (name) document.cookie = `${name}=; Path=/; Max-Age=0`
  }
}

beforeEach(() => {
  vi.resetModules()
  clearPublishedScores()
  document.body.innerHTML = '<nav id="games"></nav>'
})

afterEach(() => {
  vi.unstubAllGlobals()
  clearPublishedScores()
})

describe('lobby bootstrap', () => {
  it('fills the grid with one tile per registry game', async () => {
    vi.stubGlobal('localStorage', fakeStorage())
    await import('../src/main')

    const tiles = document.querySelectorAll('#games a')
    expect(tiles.length).toBe(GAMES.length)
  })

  it('wires each tile to its game real launch URL', async () => {
    vi.stubGlobal('localStorage', fakeStorage())
    await import('../src/main')

    const hrefs = [...document.querySelectorAll('#games a')].map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(GAMES.map((g) => g.launchUrl))
  })

  it('shows a real published score on the game that has one, and NO SCORE on the rest', async () => {
    // Re-seated for lb2-2. This used to seed the LOBBY's own localStorage with tempest's
    // table — the same fixture ADR-0004 condemns, because it models a store the lobby and
    // the games share, which is exactly what production does not have. The test's real
    // intent (the bootstrap renders a genuine score where one exists, NO SCORE elsewhere)
    // is transport-agnostic, so only the seeding changed: the score now arrives the way it
    // actually arrives — published by the game to a cookie the lobby can read.
    vi.stubGlobal('localStorage', fakeStorage())
    publishScore('tempest', 149830)
    await import('../src/main')

    const tempest = document.querySelector('#games a[href="https://tempest.slabgorb.com/"]')
    expect(tempest?.textContent).toContain('HI · 149,830')

    const asteroids = document.querySelector('#games a[href="https://asteroids.slabgorb.com/"]')
    expect(asteroids?.textContent).toContain('NO SCORE')
  })

  it('gives every tile the model slot lb2-9 will draw into', async () => {
    vi.stubGlobal('localStorage', fakeStorage())
    await import('../src/main')

    const slots = [...document.querySelectorAll('#games [data-model-slot]')].map(
      (el) => (el as HTMLElement).dataset.modelSlot,
    )
    expect(slots).toEqual(GAMES.map((g) => g.id))
  })

  // The page must come up even on a cabinet where storage is off limits (private
  // mode, sandboxed iframe). A lobby that throws here shows the player a black
  // screen instead of a list of games.
  it('still renders the full grid when storage is unavailable', async () => {
    vi.stubGlobal('localStorage', undefined)
    await import('../src/main')

    const tiles = document.querySelectorAll('#games a')
    expect(tiles.length).toBe(GAMES.length)
    expect(tiles[0]?.textContent).toContain('NO SCORE')
  })
})

// lb2-9. A perfect models.ts and a perfect modelBay.ts can both be green while the real
// cabinet shows five empty recesses — all it takes is a bootstrap that never mounts them.
// This drives the actual boot and asserts the bays are filled.
describe('lobby bootstrap — the model bays are filled at boot (lb2-9)', () => {
  // jsdom implements no canvas, so getContext('2d') answers null and the model bay
  // (correctly) declines to leave a dead canvas behind. Stub a context in so the wiring
  // is observable — the drawing itself goes through the REAL @arcade/shared/glow here.
  function stubCanvasContext(): void {
    const ctx = {
      clearRect: () => {},
      setTransform: () => {},
      scale: () => {},
      translate: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      save: () => {},
      restore: () => {},
      strokeStyle: '',
      lineWidth: 1,
      shadowColor: '',
      shadowBlur: 0,
    }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      () => ctx as unknown as CanvasRenderingContext2D,
    )
  }

  it('mounts a model canvas into every tile bay', async () => {
    stubCanvasContext()
    vi.stubGlobal('localStorage', fakeStorage())
    await import('../src/main')

    const canvases = document.querySelectorAll('#games [data-model-slot] canvas')
    expect(canvases.length).toBe(GAMES.length)
  })

  // The bays are decoration mounted at boot; a game the lobby cannot draw is not a reason
  // to show the visitor a black screen where the grid should be.
  it('still comes up when the browser hands back no 2D context', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null)
    vi.stubGlobal('localStorage', fakeStorage())
    await import('../src/main')

    expect(document.querySelectorAll('#games a').length).toBe(GAMES.length)
    expect(document.querySelector('#games canvas')).toBeNull()
  })
})
