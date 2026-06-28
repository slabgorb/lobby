import { describe, it, expect, vi } from 'vitest'
import {
  applyGlow,
  resetGlow,
  glowStroke,
  glowFill,
  glowRect,
  glowText,
  type Point,
} from '../src/shell/render'

// Snapshot of the canvas drawing state captured at the moment of a draw call,
// so tests can assert *what state was live when the ink was laid down* — not
// just that the property was set at some point.
interface DrawSnapshot {
  method: 'stroke' | 'fill' | 'fillText'
  args: unknown[]
  strokeStyle: string
  fillStyle: string
  shadowColor: string
  shadowBlur: number
  lineWidth: number
  globalCompositeOperation: string
}

// A minimal CanvasRenderingContext2D stand-in: settable style props plus spied
// path/draw methods. The draw methods snapshot the current style so we can prove
// the glow was applied before the stroke/fill, not after. No jsdom/canvas needed.
function makeCtx() {
  const draws: DrawSnapshot[] = []
  const base = {
    strokeStyle: '',
    fillStyle: '',
    shadowColor: '',
    shadowBlur: -1,
    lineWidth: -1,
    font: '',
    letterSpacing: '0px',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    globalCompositeOperation: 'source-over',
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
  }
  const snap = (method: DrawSnapshot['method'], args: unknown[]): void => {
    draws.push({
      method,
      args,
      strokeStyle: base.strokeStyle,
      fillStyle: base.fillStyle,
      shadowColor: base.shadowColor,
      shadowBlur: base.shadowBlur,
      lineWidth: base.lineWidth,
      globalCompositeOperation: base.globalCompositeOperation,
    })
  }
  base.stroke = vi.fn(() => snap('stroke', []))
  base.fill = vi.fn(() => snap('fill', []))
  // Real signature is fillText(text, x, y, maxWidth?); glowText never passes
  // maxWidth, so the three-arg form mirrors the calls under test.
  base.fillText = vi.fn((text: string, x: number, y: number) =>
    snap('fillText', [text, x, y]),
  )

  // Model the real canvas save/restore stack for the mutable style props, so a
  // restore() actually rolls back state the way a browser would. Without this,
  // glowText's 'lighter' blend would appear to leak past its restore().
  const styleKeys = [
    'strokeStyle', 'fillStyle', 'shadowColor', 'shadowBlur', 'lineWidth',
    'font', 'letterSpacing', 'textAlign', 'textBaseline', 'globalCompositeOperation',
  ] as const
  const stack: Record<string, unknown>[] = []
  base.save = vi.fn(() => {
    stack.push(Object.fromEntries(styleKeys.map((k) => [k, base[k]])))
  })
  base.restore = vi.fn(() => {
    const saved = stack.pop()
    if (saved) for (const k of styleKeys) (base as Record<string, unknown>)[k] = saved[k]
  })

  // `as unknown as` is the idiomatic cast for a partial Canvas mock: this stub
  // implements only the ~18 members render.ts touches, not the full ~200-member
  // interface, and CanvasRenderingContext2D's overloaded methods (stroke/fill
  // take an optional Path2D) make a Pick<> stub reject our `() => void` impls.
  // The production functions still see a real CanvasRenderingContext2D type, so
  // any wrong-typed canvas call in render.ts is caught at the call site.
  const ctx = base as unknown as CanvasRenderingContext2D
  return { ctx, base, draws }
}

describe('applyGlow', () => {
  it('maps style fields onto canvas stroke/fill/shadow state', () => {
    const { ctx, base } = makeCtx()
    applyGlow(ctx, { color: '#00eaff', blur: 12, width: 3 })
    expect(base.strokeStyle).toBe('#00eaff')
    expect(base.fillStyle).toBe('#00eaff')
    expect(base.shadowColor).toBe('#00eaff')
    expect(base.shadowBlur).toBe(12)
    expect(base.lineWidth).toBe(3)
  })

  it('defaults blur and width when omitted', () => {
    const { ctx, base } = makeCtx()
    applyGlow(ctx, { color: '#fff' })
    expect(base.shadowBlur).toBe(8)
    expect(base.lineWidth).toBe(2)
  })

  it('honours a distinct fill colour while glow tracks the stroke colour', () => {
    const { ctx, base } = makeCtx()
    applyGlow(ctx, { color: '#00eaff', fill: '#ff0066' })
    expect(base.strokeStyle).toBe('#00eaff')
    expect(base.shadowColor).toBe('#00eaff')
    expect(base.fillStyle).toBe('#ff0066')
  })
})

describe('resetGlow', () => {
  it('zeroes shadowBlur so later draws lose the halo', () => {
    const { ctx, base } = makeCtx()
    base.shadowBlur = 18
    resetGlow(ctx)
    expect(base.shadowBlur).toBe(0)
  })
})

describe('glowStroke', () => {
  const tri: Point[] = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ]

  it('draws nothing for fewer than two points', () => {
    const { ctx, base, draws } = makeCtx()
    glowStroke(ctx, [{ x: 1, y: 1 }], { color: '#fff' })
    expect(base.beginPath).not.toHaveBeenCalled()
    expect(draws).toHaveLength(0)
  })

  it('moves to the first point and lines to the rest, then strokes once', () => {
    const { ctx, base } = makeCtx()
    glowStroke(ctx, tri, { color: '#0f0' })
    expect(base.moveTo).toHaveBeenCalledTimes(1)
    expect(base.moveTo).toHaveBeenCalledWith(0, 0)
    expect(base.lineTo).toHaveBeenCalledTimes(2)
    expect(base.lineTo).toHaveBeenNthCalledWith(1, 10, 0)
    expect(base.lineTo).toHaveBeenNthCalledWith(2, 10, 10)
    expect(base.stroke).toHaveBeenCalledTimes(1)
  })

  it('leaves the path open by default and closes it when asked', () => {
    const open = makeCtx()
    glowStroke(open.ctx, tri, { color: '#0f0' })
    expect(open.base.closePath).not.toHaveBeenCalled()

    const closed = makeCtx()
    glowStroke(closed.ctx, tri, { color: '#0f0' }, true)
    expect(closed.base.closePath).toHaveBeenCalledTimes(1)
  })

  it('applies the glow style before stroking (glow live at draw time)', () => {
    const { ctx, draws } = makeCtx()
    glowStroke(ctx, tri, { color: '#abc', blur: 14, width: 4 })
    expect(draws).toHaveLength(1)
    expect(draws[0]).toMatchObject({
      method: 'stroke',
      strokeStyle: '#abc',
      shadowColor: '#abc',
      shadowBlur: 14,
      lineWidth: 4,
    })
  })
})

describe('glowFill', () => {
  it('draws nothing for fewer than three points', () => {
    const { ctx, base, draws } = makeCtx()
    glowFill(ctx, [{ x: 0, y: 0 }, { x: 1, y: 1 }], { color: '#fff' })
    expect(base.beginPath).not.toHaveBeenCalled()
    expect(draws).toHaveLength(0)
  })

  it('always closes the polygon and fills once with the glow live', () => {
    const { ctx, base, draws } = makeCtx()
    glowFill(
      ctx,
      [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }],
      { color: '#114', fill: '#229', blur: 6 },
    )
    // Geometry: moveTo the first point, lineTo the rest (matching glowStroke/glowRect coverage).
    expect(base.moveTo).toHaveBeenCalledWith(0, 0)
    expect(base.lineTo).toHaveBeenNthCalledWith(1, 4, 0)
    expect(base.lineTo).toHaveBeenNthCalledWith(2, 4, 4)
    expect(base.closePath).toHaveBeenCalledTimes(1)
    expect(base.fill).toHaveBeenCalledTimes(1)
    expect(draws).toHaveLength(1)
    expect(draws[0]).toMatchObject({
      method: 'fill',
      fillStyle: '#229',
      shadowColor: '#114',
      shadowBlur: 6,
    })
  })
})

describe('glowRect', () => {
  it('strokes a closed rectangle through its four corners', () => {
    const { ctx, base } = makeCtx()
    glowRect(ctx, 5, 10, 20, 8, { color: '#00eaff' })
    expect(base.moveTo).toHaveBeenCalledWith(5, 10)
    expect(base.lineTo).toHaveBeenNthCalledWith(1, 25, 10)
    expect(base.lineTo).toHaveBeenNthCalledWith(2, 25, 18)
    expect(base.lineTo).toHaveBeenNthCalledWith(3, 5, 18)
    expect(base.closePath).toHaveBeenCalledTimes(1)
    expect(base.stroke).toHaveBeenCalledTimes(1)
  })
})

describe('glowText', () => {
  it('stacks two additive blurred passes under a crisp core when blurred', () => {
    const { ctx, base, draws } = makeCtx()
    glowText(ctx, 'ARCADE', 100, 50, { color: '#00eaff', blur: 20 })

    // Three fillText passes total: two blurred (additive) + one crisp.
    const passes = draws.filter((d) => d.method === 'fillText')
    expect(passes).toHaveLength(3)

    // The two bloom passes run under 'lighter' with descending blur radii.
    expect(passes[0]).toMatchObject({
      globalCompositeOperation: 'lighter',
      shadowBlur: 30, // blur * 1.5
      shadowColor: '#00eaff',
    })
    expect(passes[1]).toMatchObject({
      globalCompositeOperation: 'lighter',
      shadowBlur: 16, // blur * 0.8
    })
    // The crisp core has no halo and runs in normal compositing.
    expect(passes[2]).toMatchObject({
      globalCompositeOperation: 'source-over',
      shadowBlur: 0,
    })

    // The 'lighter' blend is sandboxed in save/restore so it doesn't leak.
    expect(base.save).toHaveBeenCalledTimes(1)
    expect(base.restore).toHaveBeenCalledTimes(1)
    // All passes paint the same text at the same spot.
    for (const p of passes) expect(p.args).toEqual(['ARCADE', 100, 50])
    // Final canvas state is halo-free.
    expect(base.shadowBlur).toBe(0)
  })

  it('falls back to DEFAULT_BLUR for the bloom when blur is omitted', () => {
    const { ctx, draws } = makeCtx()
    glowText(ctx, 'X', 0, 0, { color: '#fff' }) // no blur → ?? DEFAULT_BLUR (8)
    const passes = draws.filter((d) => d.method === 'fillText')
    expect(passes).toHaveLength(3) // bloom branch fires under the default blur
    expect(passes[0].shadowBlur).toBe(12) // DEFAULT_BLUR (8) * 1.5
  })

  it('draws a single crisp pass with no bloom when blur is zero', () => {
    const { ctx, base, draws } = makeCtx()
    glowText(ctx, 'GO', 0, 0, { color: '#fff', blur: 0 })
    expect(draws.filter((d) => d.method === 'fillText')).toHaveLength(1)
    expect(base.save).not.toHaveBeenCalled()
    expect(base.restore).not.toHaveBeenCalled()
    expect(base.shadowBlur).toBe(0)
  })

  it('uses the fill override for the ink and the colour for the halo', () => {
    const { ctx, base } = makeCtx()
    glowText(ctx, 'HI', 0, 0, { color: '#00eaff', fill: '#ffffff', blur: 10 })
    expect(base.fillStyle).toBe('#ffffff')
    expect(base.shadowColor).toBe('#00eaff')
  })

  // The shared arcade text treatment (matching tempest/star-wars): the Vector
  // Battle ROM face is caps-only and a tight monoline, so render it uppercase
  // with ~0.1em tracking for the airy marquee look that helps thin caps read.
  it('renders text uppercase (Vector Battle is caps-only)', () => {
    const { ctx, base } = makeCtx()
    glowText(ctx, 'tempest', 10, 20, { color: '#00eaff', blur: 0 })
    expect(base.fillText).toHaveBeenCalledWith('TEMPEST', 10, 20)
  })

  it('tracks letters to ~0.1em of the current font size', () => {
    const { ctx, base } = makeCtx()
    base.font = "900 100px 'Vector Battle', 'Orbitron', monospace"
    glowText(ctx, 'ARCADE', 0, 0, { color: '#00eaff', blur: 0 })
    expect(base.letterSpacing).toBe('10.00px') // 100px * 0.1
  })

  it('falls back to a 16px-derived tracking when the font has no px size', () => {
    const { ctx, base } = makeCtx()
    base.font = ''
    glowText(ctx, 'ARCADE', 0, 0, { color: '#00eaff', blur: 0 })
    expect(base.letterSpacing).toBe('1.60px') // 16px default * 0.1
  })
})
