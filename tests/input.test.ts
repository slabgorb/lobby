import { describe, it, expect, vi } from 'vitest'
import { keyToAction, launchGame, bindLobbyInput } from '../src/shell/input'
import type { Game } from '../src/core/registry'

// Keyboard → lobby behaviour (shell): the pure key→action mapping, the launch
// dispatch (navigation injected so it's testable without a real window), and the
// thin keydown binding that ties them to the selection state. moveSelection's
// grid maths is covered in selection.test.ts; here we prove the wiring.

describe('keyToAction', () => {
  it('maps the four arrow keys to directional moves', () => {
    expect(keyToAction('ArrowUp')).toEqual({ type: 'move', direction: 'up' })
    expect(keyToAction('ArrowDown')).toEqual({ type: 'move', direction: 'down' })
    expect(keyToAction('ArrowLeft')).toEqual({ type: 'move', direction: 'left' })
    expect(keyToAction('ArrowRight')).toEqual({ type: 'move', direction: 'right' })
  })

  it('maps Enter to a launch', () => {
    expect(keyToAction('Enter')).toEqual({ type: 'launch' })
  })

  it('ignores unrelated keys', () => {
    expect(keyToAction('a')).toBeNull()
    expect(keyToAction('Escape')).toBeNull()
    expect(keyToAction('Tab')).toBeNull()
  })
})

const tempest: Game = { id: 'tempest', title: 'TEMPEST', launchUrl: '/tempest/', color: '#00eaff' }

describe('launchGame', () => {
  it('navigates to the game launchUrl through the injected navigator', () => {
    const navigate = vi.fn()
    launchGame(tempest, navigate)
    expect(navigate).toHaveBeenCalledTimes(1)
    expect(navigate).toHaveBeenCalledWith('/tempest/')
  })

  it('does nothing when there is no game at the selected index', () => {
    const navigate = vi.fn()
    launchGame(undefined, navigate)
    expect(navigate).not.toHaveBeenCalled()
  })
})

// A keydown target stub: captures the registered handler so a test can fire a
// synthetic event at it. No jsdom — the binding only needs addEventListener.
function makeTarget() {
  let handler: ((ev: Event) => void) | undefined
  const target = {
    addEventListener: vi.fn((_type: string, fn: EventListenerOrEventListenerObject) => {
      handler = fn as (ev: Event) => void
    }),
  }
  const fire = (key: string) => {
    const ev = { key, preventDefault: vi.fn() }
    handler?.(ev as unknown as Event)
    return ev
  }
  return { target, fire }
}

describe('bindLobbyInput', () => {
  it('registers a single keydown listener', () => {
    const { target } = makeTarget()
    bindLobbyInput(target, {
      getIndex: () => 0,
      getCount: () => 4,
      getColumns: () => 2,
      onMove: vi.fn(),
      onLaunch: vi.fn(),
    })
    expect(target.addEventListener).toHaveBeenCalledTimes(1)
    expect(target.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('moves the selection on an arrow key, reporting the next index', () => {
    const { target, fire } = makeTarget()
    const onMove = vi.fn()
    bindLobbyInput(target, {
      getIndex: () => 0, // top-left of a 2x2 grid
      getCount: () => 4,
      getColumns: () => 2,
      onMove,
      onLaunch: vi.fn(),
    })
    fire('ArrowRight')
    expect(onMove).toHaveBeenCalledWith(1)
    fire('ArrowDown')
    expect(onMove).toHaveBeenCalledWith(2)
  })

  it('launches the current selection on Enter', () => {
    const { target, fire } = makeTarget()
    const onLaunch = vi.fn()
    bindLobbyInput(target, {
      getIndex: () => 3,
      getCount: () => 4,
      getColumns: () => 2,
      onMove: vi.fn(),
      onLaunch,
    })
    fire('Enter')
    expect(onLaunch).toHaveBeenCalledWith(3)
  })

  it('prevents default only for keys it handles', () => {
    const { target, fire } = makeTarget()
    bindLobbyInput(target, {
      getIndex: () => 0,
      getCount: () => 4,
      getColumns: () => 2,
      onMove: vi.fn(),
      onLaunch: vi.fn(),
    })
    const handled = fire('ArrowLeft')
    expect(handled.preventDefault).toHaveBeenCalledTimes(1)
    const ignored = fire('q')
    expect(ignored.preventDefault).not.toHaveBeenCalled()
  })

  it('does not move or launch on an unhandled key', () => {
    const { target, fire } = makeTarget()
    const onMove = vi.fn()
    const onLaunch = vi.fn()
    bindLobbyInput(target, {
      getIndex: () => 0,
      getCount: () => 4,
      getColumns: () => 2,
      onMove,
      onLaunch,
    })
    fire('Shift')
    expect(onMove).not.toHaveBeenCalled()
    expect(onLaunch).not.toHaveBeenCalled()
  })
})
