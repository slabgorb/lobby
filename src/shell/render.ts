// src/shell/render.ts
// Low-level glowing-vector rendering primitives for the lobby's Canvas 2D
// surface. Mirrors tempest's glow-on-black aesthetic (shadowBlur + stroke/fill,
// additive bloom for text) WITHOUT sharing code — the arcade games share a
// visual *language*, not a library (per the orchestrator CLAUDE.md). The lobby
// owns its own primitives; stories 7-3 (tile grid) and 7-4 (selection) compose
// tiles and labels from these.

/** A 2D point in canvas (device-pixel) space. */
export interface Point {
  x: number
  y: number
}

/**
 * Shared glow styling for the stroke/fill primitives below. `color` drives both
 * the ink and its halo; `blur` is the glow radius (canvas `shadowBlur`) — raise
 * it for a softer, brighter bloom. `width` is the stroke thickness; `fill`
 * overrides the fill colour when it should differ from the stroke/glow colour.
 */
export interface GlowStyle {
  color: string
  blur?: number
  width?: number
  fill?: string
}

const DEFAULT_BLUR = 8
const DEFAULT_WIDTH = 2

/**
 * Configure `ctx` for a glowing stroke/fill — colour, halo (`shadowBlur`), and
 * line width — in one call. This is the single point where a GlowStyle becomes
 * canvas state: every primitive here routes through it, and callers drawing a
 * custom path can call it directly before their own `beginPath`/`stroke`.
 */
export function applyGlow(ctx: CanvasRenderingContext2D, style: GlowStyle): void {
  ctx.strokeStyle = style.color
  ctx.fillStyle = style.fill ?? style.color
  ctx.shadowColor = style.color
  ctx.shadowBlur = style.blur ?? DEFAULT_BLUR
  ctx.lineWidth = style.width ?? DEFAULT_WIDTH
}

/**
 * Clear the glow so later draws don't inherit a stray halo. Canvas leaks
 * `shadowBlur` across calls, so framing code calls this once it's done glowing.
 */
export function resetGlow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowBlur = 0
}

/**
 * Stroke a polyline through `points` with a glow. With `closed`, the last point
 * joins back to the first (a glowing polygon outline). Fewer than two points
 * draws nothing.
 */
export function glowStroke(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
  style: GlowStyle,
  closed = false,
): void {
  if (points.length < 2) return
  applyGlow(ctx, style)
  ctx.beginPath()
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
  if (closed) ctx.closePath()
  ctx.stroke()
}

/**
 * Fill the polygon described by `points` with a glow. Fewer than three points
 * encloses no area and draws nothing.
 */
export function glowFill(
  ctx: CanvasRenderingContext2D,
  points: readonly Point[],
  style: GlowStyle,
): void {
  if (points.length < 3) return
  applyGlow(ctx, style)
  ctx.beginPath()
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
  ctx.closePath()
  ctx.fill()
}

/**
 * Stroke a glowing rectangle — the lobby's tile-outline primitive (story 7-3).
 * Sugar over `glowStroke` with the four corners walked clockwise and closed.
 */
export function glowRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  style: GlowStyle,
): void {
  glowStroke(
    ctx,
    [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ],
    style,
    true,
  )
}

/**
 * Draw glowing neon text at (x, y). Thin vector faces read dim under a single
 * shadow pass, so — like tempest — stack two additive blurred passes (a wide
 * bloom + a tighter inner glow) beneath a crisp core. Respects the caller's
 * current font / textAlign / textBaseline; save/restore keeps the 'lighter'
 * blend from leaking. `style.width` is unused — text has no stroke.
 */
export function glowText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  style: GlowStyle,
): void {
  const blur = style.blur ?? DEFAULT_BLUR
  ctx.fillStyle = style.fill ?? style.color
  ctx.shadowColor = style.color
  if (blur > 0) {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.shadowBlur = blur * 1.5
    ctx.fillText(text, x, y)
    ctx.shadowBlur = blur * 0.8
    ctx.fillText(text, x, y)
    ctx.restore()
  }
  ctx.shadowBlur = 0
  ctx.fillText(text, x, y)
}
