// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GAMES } from '../src/core/registry'

// Wiring. Every other test in this story can pass while the page stays blank: a
// perfect tiles.ts that main.ts never calls, or a main.ts that renders into a
// container index.html no longer has. This drives the real bootstrap end to end —
// import main.ts against a DOM, and assert the tiles actually land, with the real
// registry and the real score reader behind them.

// A minimal in-memory localStorage, seeded the way a game writes its table.
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

const table = (...scores: number[]) =>
  JSON.stringify(scores.map((score, i) => ({ name: 'AAA', score, level: i + 1 })))

beforeEach(() => {
  vi.resetModules()
  document.body.innerHTML = '<nav id="games"></nav>'
})

afterEach(() => {
  vi.unstubAllGlobals()
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

  it('shows a real stored score on the game that has one, and NO SCORE on the rest', async () => {
    vi.stubGlobal('localStorage', fakeStorage({ 'tempest-high-scores': table(149830, 1200) }))
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
