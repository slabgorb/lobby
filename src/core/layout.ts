// src/core/layout.ts
// Pure, DOM-free sizing math. Mirrors tempest's core/shell split: anything that
// can be unit-tested without a canvas lives in core/. The shell (main.ts) wires
// this to the real window.

export interface CanvasSize {
  /** Backing-store width in device pixels. */
  width: number
  /** Backing-store height in device pixels. */
  height: number
}

/**
 * Compute the backing-store pixel dimensions for a canvas from its CSS size and
 * the device pixel ratio. The ratio is clamped to [1, 2] so retina displays stay
 * crisp without paying for 3x+ buffers, and a falsy ratio falls back to 1.
 * Fractional pixels are floored to whole device pixels.
 */
export function canvasSize(
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
): CanvasSize {
  const dpr = Math.min(2, Math.max(1, devicePixelRatio || 1))
  return {
    width: Math.floor(cssWidth * dpr),
    height: Math.floor(cssHeight * dpr),
  }
}
