// src/shell/input.ts
// Keyboard → lobby behaviour (shell). Three small pieces, kept separable so the
// logic stays testable without a real DOM: a pure key→action mapping, a launch
// dispatch with navigation injected, and a thin keydown binding that wires them
// to the selection cursor. The grid-navigation maths lives in core/selection.ts.
import { moveSelection, type Direction } from '../core/selection'
import type { Game } from '../core/registry'

/** What a handled key means: move the cursor, or launch the current selection. */
export type LobbyAction = { type: 'move'; direction: Direction } | { type: 'launch' }

const KEY_DIRECTIONS: Readonly<Record<string, Direction>> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

/**
 * Map a `KeyboardEvent.key` to a lobby action, or `null` for keys the lobby
 * ignores. Arrows move the cursor; Enter launches. Pure — no DOM, no state.
 */
export function keyToAction(key: string): LobbyAction | null {
  const direction = KEY_DIRECTIONS[key]
  if (direction) return { type: 'move', direction }
  if (key === 'Enter') return { type: 'launch' }
  return null
}

/**
 * Launch `game` by handing its `launchUrl` to `navigate` (e.g. a closure over
 * `window.location.href`). Navigation is injected so the dispatch is unit-testable
 * without a real window. A missing game (selection out of range) is a no-op.
 */
export function launchGame(game: Readonly<Game> | undefined, navigate: (url: string) => void): void {
  if (!game) return
  navigate(game.launchUrl)
}

/** Hooks the binding needs into the shell's selection state. */
export interface LobbyInputDeps {
  /** Current selected tile index. */
  getIndex: () => number
  /** Number of tiles in the grid. */
  getCount: () => number
  /** Grid column count (must match the rendered grid's columns). */
  getColumns: () => number
  /** Called with the next index after a directional move. */
  onMove: (nextIndex: number) => void
  /** Called with the current index when the player launches (Enter). */
  onLaunch: (index: number) => void
}

/**
 * Bind a `keydown` listener that turns arrow keys into cursor moves and Enter
 * into a launch, calling back into the shell's selection state. Default scrolling
 * is suppressed only for keys the lobby actually handles, so other keys behave
 * normally. The binding stays deliberately thin — all real logic is in
 * {@link keyToAction} and {@link moveSelection}.
 */
export function bindLobbyInput(
  target: Pick<EventTarget, 'addEventListener'>,
  deps: Readonly<LobbyInputDeps>,
): void {
  target.addEventListener('keydown', (ev: Event) => {
    const action = keyToAction((ev as KeyboardEvent).key)
    if (!action) return
    ev.preventDefault()
    if (action.type === 'move') {
      deps.onMove(moveSelection(deps.getIndex(), deps.getCount(), deps.getColumns(), action.direction))
    } else {
      deps.onLaunch(deps.getIndex())
    }
  })
}
