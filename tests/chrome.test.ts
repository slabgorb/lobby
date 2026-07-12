import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

// The cabinet furniture: the vector grid floor and its mirrored ceiling, the four
// L-shaped bezel brackets, the marquee, the curvature vignette, and the footer.
//
// This is STATIC markup — it lives in index.html, not in a module — so it is tested
// by parsing index.html itself rather than by importing anything. We build a real
// JSDOM document from the file so the <style> cascade is live and getComputedStyle
// tells the truth about pointer-events.
//
// The single behavioural claim worth defending here is that NONE of this beautiful
// junk gets between the player and the games. A full-bleed decorative layer with a
// z-index and no `pointer-events: none` is the classic way to build a screen where
// every tile is unclickable — and it looks perfect in a screenshot.

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')

// Load index.html and inline any LOCAL stylesheet it links, so the cascade is
// complete whether the CSS stays in a <style> block or moves out to a .css file.
// Remote hrefs (the Google Fonts link) are left alone — the test must not hit the
// network, and a missing webfont changes nothing we assert here.
function loadIndex(): Document {
  let html = readFileSync(join(ROOT, 'index.html'), 'utf8')

  html = html.replace(
    /<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi,
    (tag) => {
      const href = /href=["']([^"']+)["']/i.exec(tag)?.[1]
      if (!href || /^(https?:)?\/\//i.test(href)) return tag // remote — leave it
      const file = join(ROOT, href.replace(/^\//, ''))
      return existsSync(file) ? `<style>${readFileSync(file, 'utf8')}</style>` : tag
    },
  )

  // Scripts are never executed: this asserts the static shell only. The tile grid
  // is main.ts's job and is covered by tiles.test.ts / main.test.ts.
  return new JSDOM(html).window.document
}

let doc: Document

beforeAll(() => {
  doc = loadIndex()
})

// The accessible name a screen reader would announce: an explicit aria-label if one
// is given, otherwise the visible text with whitespace collapsed.
function accessibleName(el: Element): string {
  return (el.getAttribute('aria-label') ?? el.textContent ?? '').replace(/\s+/g, ' ').trim()
}

describe('cabinet furniture is present', () => {
  it('has the receding vector grid floor and its mirrored ceiling', () => {
    expect(doc.querySelector('[data-chrome="grid-floor"]')).not.toBeNull()
    expect(doc.querySelector('[data-chrome="grid-ceiling"]')).not.toBeNull()
  })

  it('frames the screen with four L-shaped bezel brackets', () => {
    expect(doc.querySelectorAll('[data-chrome="bezel"]').length).toBe(4)
  })

  it('has the screen-curvature vignette (the design ships curvature on)', () => {
    expect(doc.querySelector('[data-chrome="vignette"]')).not.toBeNull()
  })

  // The design's own prop defaults are authoritative: curvature true, scanlines
  // false. Scanlines are therefore NOT shipped — the designer turned them off.
  it('does not ship the scanline overlay, which the design defaults to off', () => {
    expect(doc.querySelector('[data-chrome="scanlines"]')).toBeNull()
  })
})

describe('cabinet furniture never gets between the player and the games', () => {
  it('marks every decorative layer pointer-events: none', () => {
    const chrome = [...doc.querySelectorAll('[data-chrome]')]
    expect(chrome.length).toBeGreaterThan(0)

    for (const el of chrome) {
      const pointerEvents = doc.defaultView!.getComputedStyle(el).pointerEvents
      expect(
        pointerEvents,
        `[data-chrome="${el.getAttribute('data-chrome')}"] would swallow clicks`,
      ).toBe('none')
    }
  })

  it('keeps every decorative layer out of the tab order', () => {
    const chrome = [...doc.querySelectorAll('[data-chrome]')]
    // Without this guard the loop below iterates nothing and the test passes while
    // asserting precisely zero things.
    expect(chrome.length).toBeGreaterThan(0)

    for (const el of chrome) {
      expect(el.getAttribute('tabindex')).not.toBe('0')
      // Decoration must not contain anything natively focusable either.
      expect(el.querySelector('a, button, input, select, textarea')).toBeNull()
    }
  })
})

describe('marquee', () => {
  it('reads SLABGORB PRESENTS above the wordmark', () => {
    const text = (doc.body.textContent ?? '').replace(/\s+/g, ' ')
    expect(text).toContain('SLABGORB PRESENTS')
  })

  // The design spells the wordmark one letter per <span> (V·E·C·T·O·R A·R·C·A·D·E)
  // to spread it across the marquee. That is a purely visual trick, and it leaves
  // the h1 announcing "VECTORARCADE" — or, worse, spelling it out letter by letter.
  // However it is built, the heading must expose the real name.
  it('exposes the wordmark as the accessible name VECTOR ARCADE', () => {
    const h1 = doc.querySelector('h1')
    expect(h1).not.toBeNull()
    expect(accessibleName(h1 as Element)).toBe('VECTOR ARCADE')
  })

  it('invites the player to choose', () => {
    const text = (doc.body.textContent ?? '').replace(/\s+/g, ' ')
    expect(text).toContain('SELECT GAME')
  })
})

describe('footer', () => {
  it('blinks INSERT COIN (the design ships it on)', () => {
    const text = (doc.body.textContent ?? '').replace(/\s+/g, ' ')
    expect(text).toContain('INSERT COIN')
  })

  it('carries the fan-tribute disclaimer', () => {
    const text = (doc.body.textContent ?? '').replace(/\s+/g, ' ').toUpperCase()
    expect(text).toContain('NOT AFFILIATED')
  })
})

describe('the grid the tiles render into survives the restyle', () => {
  it('still has the #games container main.ts builds into', () => {
    const games = doc.getElementById('games')
    expect(games).not.toBeNull()
    // Empty in the static shell — the tiles are built from the registry at runtime,
    // never hardcoded into index.html.
    expect(games?.querySelector('a')).toBeNull()
  })
})
