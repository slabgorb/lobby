import { describe, it, expect } from 'vitest'
import { canvasSize } from '../src/core/layout'

describe('canvasSize', () => {
  it('scales CSS dimensions by the device pixel ratio', () => {
    expect(canvasSize(800, 600, 2)).toEqual({ width: 1600, height: 1200 })
  })

  it('clamps the ratio to a maximum of 2', () => {
    expect(canvasSize(100, 100, 3)).toEqual({ width: 200, height: 200 })
  })

  it('clamps the ratio to a minimum of 1 and floors fractional pixels', () => {
    expect(canvasSize(101, 101, 0)).toEqual({ width: 101, height: 101 })
  })
})
