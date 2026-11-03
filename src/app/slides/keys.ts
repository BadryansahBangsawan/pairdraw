/**
 * What a key does in a presentation. `forward` and `back` scroll a slide shown at 100% first and
 * step to the next or previous slide at its end; `next` and `previous` always step.
 */
export type PresentationKeyAction = 'next' | 'previous' | 'forward' | 'back' | 'first' | 'last'

type PresentationKey = Pick<KeyboardEvent, 'code' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey'>

const ACTIONS: Readonly<Partial<Record<string, PresentationKeyAction>>> = {
  ArrowRight: 'next',
  ArrowLeft: 'previous',
  ArrowDown: 'forward',
  PageDown: 'forward',
  Space: 'forward',
  Enter: 'forward',
  NumpadEnter: 'forward',
  ArrowUp: 'back',
  PageUp: 'back',
  Backspace: 'previous',
  Home: 'first',
  End: 'last'
}

/**
 * The presentation's keys, as Keynote and Google Slides take them: arrows, Space, Enter, and the
 * page keys step through the slides, Shift+Space goes back, Home and End jump to either end.
 * Keys held with ⌘, Ctrl, or Alt belong to the app's own shortcuts.
 */
export function presentationKeyAction(event: PresentationKey): PresentationKeyAction | null {
  if (event.metaKey || event.ctrlKey || event.altKey) return null
  if (event.code === 'Space' && event.shiftKey) return 'back'
  if (event.shiftKey) return null
  return ACTIONS[event.code] ?? null
}

/** How far a key scrolls a slide shown at 100%: an arrow a little, the others nearly a screen. */
export function presentationScrollStep(code: string, screenHeight: number): number {
  return code === 'ArrowDown' || code === 'ArrowUp' ? 80 : Math.max(screenHeight * 0.9, 80)
}
