import { describe, it, expect, afterEach, vi } from 'vitest'
import { getTopScore } from '../src/shell/storage'

// getTopScore reads each game's high-score table straight from localStorage under
// the '{gameId}-high-scores' key the games write. The test env is node (no DOM),
// so we stub a minimal in-memory localStorage and drive getTopScore through every
// path it must survive: real data, unsorted data, an empty board, a missing key,
// corrupt/non-array JSON, malformed rows, a throwing store, and no storage at all.

// A tiny Storage-shaped stub. Only getItem is exercised by getTopScore; the rest
// exist so the value reads as a plausible localStorage to anything that pokes it.
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

// Serialise a table the way a game would: an array of high-score rows.
const table = (...scores: number[]) =>
  JSON.stringify(scores.map((score, i) => ({ name: 'AAA', score, level: i + 1 })))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getTopScore', () => {
  it('returns the highest score from a stored (descending) table', () => {
    vi.stubGlobal('localStorage', fakeStorage({ 'tempest-high-scores': table(9000, 3000, 100) }))
    expect(getTopScore('tempest')).toBe(9000)
  })

  it('returns the max even when the stored rows are not sorted', () => {
    // Defensive: we take Math.max of valid rows rather than trusting table[0].
    vi.stubGlobal('localStorage', fakeStorage({ 'tempest-high-scores': table(100, 9000, 3000) }))
    expect(getTopScore('tempest')).toBe(9000)
  })

  it('reads the per-game key, isolating one game from another', () => {
    vi.stubGlobal(
      'localStorage',
      fakeStorage({
        'tempest-high-scores': table(5000),
        'star-wars-high-scores': table(8000),
      }),
    )
    expect(getTopScore('tempest')).toBe(5000)
    expect(getTopScore('star-wars')).toBe(8000)
  })

  it('returns null for an empty board (no scores yet)', () => {
    vi.stubGlobal('localStorage', fakeStorage({ 'tempest-high-scores': '[]' }))
    expect(getTopScore('tempest')).toBeNull()
  })

  it('returns null when the game has no stored key', () => {
    vi.stubGlobal('localStorage', fakeStorage({ 'tempest-high-scores': table(9000) }))
    expect(getTopScore('star-wars')).toBeNull()
  })

  it('returns null for corrupt JSON without throwing', () => {
    vi.stubGlobal('localStorage', fakeStorage({ 'tempest-high-scores': '{not valid json' }))
    expect(() => getTopScore('tempest')).not.toThrow()
    expect(getTopScore('tempest')).toBeNull()
  })

  it('returns null when the stored value parses but is not an array', () => {
    vi.stubGlobal('localStorage', fakeStorage({ 'tempest-high-scores': '{"score":9000}' }))
    expect(getTopScore('tempest')).toBeNull()
  })

  it('drops malformed rows and returns the max of the valid ones', () => {
    // A mix of junk (no score, non-numeric score, non-object) plus two real rows.
    // SH-4: "valid" is now the shared isHighScoreRow guard — a string name + a
    // finite score — the exact shape the games write, so the real rows are named.
    const mixed = JSON.stringify([
      { name: 'AAA' },
      { score: 'x' },
      42,
      { name: 'BBB', score: 1500, level: 3 },
      { name: 'CCC', score: 700, level: 1 },
    ])
    vi.stubGlobal('localStorage', fakeStorage({ 'tempest-high-scores': mixed }))
    expect(getTopScore('tempest')).toBe(1500)
  })

  it('returns null when every row is malformed', () => {
    vi.stubGlobal('localStorage', fakeStorage({ 'tempest-high-scores': '[{"name":"AAA"},5,null]' }))
    expect(getTopScore('tempest')).toBeNull()
  })

  it('returns null when reading storage throws (e.g. private mode)', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('access denied')
      },
    })
    expect(() => getTopScore('tempest')).not.toThrow()
    expect(getTopScore('tempest')).toBeNull()
  })

  it('returns null when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(getTopScore('tempest')).toBeNull()
  })
})
