/** The accent of Pairdraw's selection, so the highlight reads as the app's own. */
const ACCENT = '#ff5b2e'

const OVERLAY_STYLE = `
  :host { all: initial; }
  .box { position: fixed; pointer-events: none; z-index: 2147483647; box-sizing: border-box;
    border: 2px solid ${ACCENT}; background: ${ACCENT}14; border-radius: 2px;
    transition: all 60ms linear; }
  .label { position: fixed; pointer-events: none; z-index: 2147483647; padding: 2px 6px;
    border-radius: 4px; background: ${ACCENT}; color: #17171c;
    font: 500 11px/16px Inter, system-ui, -apple-system, sans-serif; white-space: nowrap; }
  .hint { position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%);
    pointer-events: none; z-index: 2147483647; padding: 8px 12px; border-radius: 10px;
    background: #17171c; color: #ffffff;
    font: 500 12px/16px Inter, system-ui, -apple-system, sans-serif;
    box-shadow: 0 8px 24px #00000040; }
  @media (prefers-reduced-motion: reduce) { .box { transition: none; } }
`

/** Where keyboard picking starts: the focused element, or the body when nothing is focused. */
function startElement(document: Document): Element | null {
  const focused = document.activeElement
  if (focused && focused !== document.body && focused !== document.documentElement) return focused
  return document.body
}

export interface PickerHandlers {
  /** Called inside the click that picked, so the clipboard write counts as part of it. */
  onPick(element: Element): void
  onCancel?(): void
}

function place(element: HTMLElement, rect: DOMRect) {
  element.style.left = `${rect.left}px`
  element.style.top = `${rect.top}px`
  element.style.width = `${rect.width}px`
  element.style.height = `${rect.height}px`
}

/**
 * Lets the person point at an element of the page: hovering outlines it, ↑ and ↓ move to its
 * parent or first child, a click or Enter picks it, and Escape cancels. Picking starts on the
 * focused element, or the body, so the keys work without a pointer. The page receives none of
 * these clicks and keys while picking. Returns a function that stops picking.
 */
export function startPicker(document: Document, hint: string, handlers: PickerHandlers) {
  const pageWindow = document.defaultView
  if (!pageWindow) throw new Error('The page has no window')
  const view: Window = pageWindow
  const host = document.createElement('div')
  const shadow = host.attachShadow({ mode: 'closed' })
  const style = document.createElement('style')
  style.textContent = OVERLAY_STYLE
  const box = document.createElement('div')
  box.className = 'box'
  const label = document.createElement('div')
  label.className = 'label'
  const hintElement = document.createElement('div')
  hintElement.className = 'hint'
  // Announced when picking starts, so a screen reader says how to pick.
  hintElement.setAttribute('role', 'status')
  hintElement.textContent = hint
  shadow.append(style, box, label, hintElement)
  document.documentElement.append(host)

  let current: Element | null = null

  function highlight(element: Element | null) {
    current = element
    if (!element) {
      box.style.display = 'none'
      label.style.display = 'none'
      return
    }
    const rect = element.getBoundingClientRect()
    box.style.display = 'block'
    label.style.display = 'block'
    place(box, rect)
    label.textContent = `${element.localName}  ${Math.round(rect.width)} × ${Math.round(rect.height)}`
    label.style.left = `${Math.max(0, rect.left)}px`
    label.style.top = `${Math.max(0, rect.top - 20)}px`
    label.style.width = ''
    label.style.height = ''
  }

  function pageElement(target: EventTarget | null): Element | null {
    if (!(target instanceof Element) || target === host) return null
    return target === document.documentElement ? document.body : target
  }

  function swallow(event: Event) {
    event.preventDefault()
    event.stopImmediatePropagation()
  }

  function onMove(event: MouseEvent) {
    const element = pageElement(event.target)
    if (element && element !== current) highlight(element)
  }

  function onClick(event: MouseEvent) {
    swallow(event)
    const element = pageElement(event.target) ?? current
    if (!element) return
    stop()
    handlers.onPick(element)
  }

  function onKey(event: KeyboardEvent) {
    swallow(event)
    if (event.key === 'Escape') {
      stop()
      handlers.onCancel?.()
    } else if (event.key === 'ArrowUp' && current?.parentElement) {
      const parent = current.parentElement
      highlight(parent === document.documentElement ? document.body : parent)
    } else if (event.key === 'ArrowDown' && current?.firstElementChild) {
      highlight(current.firstElementChild)
    } else if (event.key === 'Enter' && current) {
      const picked = current
      stop()
      handlers.onPick(picked)
    }
  }

  const options = { capture: true }
  const swallowed = ['mousedown', 'mouseup', 'pointerdown', 'pointerup', 'dblclick', 'contextmenu']

  function stop() {
    view.removeEventListener('mousemove', onMove, options)
    view.removeEventListener('click', onClick, options)
    view.removeEventListener('keydown', onKey, options)
    for (const type of swallowed) view.removeEventListener(type, swallow, options)
    host.remove()
  }

  view.addEventListener('mousemove', onMove, options)
  view.addEventListener('click', onClick, options)
  view.addEventListener('keydown', onKey, options)
  for (const type of swallowed) view.addEventListener(type, swallow, options)
  highlight(startElement(document))
  return stop
}
