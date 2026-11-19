import { useEventListener } from '@vueuse/core'
import { uniq } from 'es-toolkit'
import { createKeybindingsHandler } from 'tinykeys'
import type { KeyBindingMap } from 'tinykeys'

import { BOARD_TOOL_SHORTCUTS, resolveEditorProfile } from '@pairdraw/core'
import { animateViewport } from '@pairdraw/vue/canvas'
import { isCanvasTextInput } from '@pairdraw/vue/canvas/text-edit'
import { editorCommandMetadata, type EditorCommandId } from '@pairdraw/vue/editor/commands'

import { CHAT_COLUMN_SHORTCUT } from '@/app/ai/chat/panel'
import { isCloudBinding, openVersionDialog } from '@/app/cloud/integration'
import { useComments } from '@/app/comments/use'
import { COPY_AS_PNG_SHORTCUT } from '@/app/editor/canvas/menu/registry'
import {
  pasteClipboardToReplace,
  pasteClipboardToReplaceInInstance
} from '@/app/editor/clipboard/paste/replace'
import { copySelectionAsPNG } from '@/app/editor/clipboard/png'
import {
  copySelectionProperties,
  pasteClipboardProperties
} from '@/app/editor/clipboard/properties'
import { openFindLayers } from '@/app/editor/layers/find'
import { openPlaceImageDialog } from '@/app/editor/place/dialog'
import { requestRenameSelection } from '@/app/editor/selection/rename-dialog'
import { TOOL_SHORTCUTS } from '@/app/editor/session'
import { toggleRemoteCursors } from '@/app/presence/cursor-motion'
import { openSettingsDialog } from '@/app/settings/dialog'
import { setSnappingPreference, togglePixelGrid } from '@/app/settings/preferences/apply'
import { removeSelectionAutoLayout } from '@/app/shell/keyboard/auto-layout'
import { isButtonActivation, isInputElement } from '@/app/shell/keyboard/focus'
import { shortcutEvent } from '@/app/shell/keyboard/layout'
import { overlayHoldsKeys } from '@/app/shell/keyboard/overlays'
import { openShortcutSheet, SHORTCUT_SHEET_KEYBINDINGS } from '@/app/shell/keyboard/sheet'
import { bindSpaceHandTool } from '@/app/shell/keyboard/space-tool'
import type {
  KeyboardShortcutOptions,
  KeyboardShortcutRunOptions
} from '@/app/shell/keyboard/types'
import { bindZoomToolKey } from '@/app/shell/keyboard/zoom-tool'
import { appMenuTinykeysShortcut, shortcutTokenToTinykeys } from '@/app/shell/menu/shortcut'
import { togglePresentation } from '@/app/slides/present'
import { showsDocument } from '@/app/tabs'

type ShortcutAction = (options: KeyboardShortcutRunOptions) => void

type ShortcutDefinition = {
  id: string
  keys: string | string[]
  run: ShortcutAction
  shouldPreventDefault?: (event: KeyboardEvent) => boolean
  global?: boolean
  /** Whether the shortcut switches or leaves the canvas's view, so it runs in every view. */
  view?: boolean
}

function commandShortcut(
  command: EditorCommandId,
  keys = editorCommandMetadata(command).keybinding
): ShortcutDefinition | null {
  return keys ? { id: command, keys, run: ({ runCommand }) => runCommand(command) } : null
}

function commandShortcuts(...commands: EditorCommandId[]): ShortcutDefinition[] {
  return commands.flatMap((command) => {
    const shortcut = commandShortcut(command)
    return shortcut ? [shortcut] : []
  })
}

type AlignAxis = 'horizontal' | 'vertical'
type AlignEdge = 'min' | 'center' | 'max'

/**
 * The Arrange menu's align keys (⌥A/H/D, ⌥W/V/S). They are matched by key code, since macOS
 * Option turns the letter into another character (⌥W types ∑).
 */
const ALIGN_SHORTCUTS: readonly [string, AlignAxis, AlignEdge][] = [
  ['arrange.align-left', 'horizontal', 'min'],
  ['arrange.align-center', 'horizontal', 'center'],
  ['arrange.align-right', 'horizontal', 'max'],
  ['arrange.align-top', 'vertical', 'min'],
  ['arrange.align-middle', 'vertical', 'center'],
  ['arrange.align-bottom', 'vertical', 'max']
]

function alignShortcuts(): ShortcutDefinition[] {
  return ALIGN_SHORTCUTS.flatMap(([id, axis, edge]) => {
    const keys = appMenuTinykeysShortcut(id)
    if (!keys) return []
    return [
      {
        id,
        keys,
        run: ({ store }: KeyboardShortcutRunOptions) =>
          store.alignNodes([...store.state.selectedIds], axis, edge)
      }
    ]
  })
}

/** Find layers searches a document's page, so Home leaves the key alone. */
function findLayersInDocument({ store }: KeyboardShortcutRunOptions): void {
  if (showsDocument()) openFindLayers(store)
}

/**
 * Menu and canvas-menu keys the browser build binds itself; the desktop app's native menu binds
 * them too, and Copy as PNG and the ? key of the shortcut sheet are not in a menu.
 */
function browserMenuShortcuts(): ShortcutDefinition[] {
  return [
    {
      id: 'find-layers',
      keys: appMenuTinykeysShortcut('find-layers') ?? '$mod+KeyF',
      run: findLayersInDocument
    },
    ...commandShortcuts(
      'selection.frameSelection',
      'selection.booleanUnion',
      'selection.booleanSubtract',
      'selection.booleanIntersect',
      'selection.booleanExclude',
      'selection.flatten'
    ),
    ...alignShortcuts(),
    {
      // Also stops the browser's hard reload, which ⇧⌘R would otherwise start.
      id: 'paste-to-replace',
      keys: appMenuTinykeysShortcut('paste-to-replace') ?? '$mod+Shift+KeyR',
      run: ({ store }) => void pasteClipboardToReplace(store)
    },
    {
      // pen.dev's key for Replace inside instance.
      id: 'replace-in-instance',
      keys: appMenuTinykeysShortcut('replace-in-instance') ?? 'Shift+Alt+KeyR',
      run: ({ store }) => void pasteClipboardToReplaceInInstance(store)
    },
    {
      id: 'copy-as-png',
      keys: shortcutTokenToTinykeys(COPY_AS_PNG_SHORTCUT) ?? '$mod+Shift+KeyC',
      run: ({ store }) => copySelectionAsPNG(store)
    },
    {
      id: 'remove-auto-layout',
      keys: appMenuTinykeysShortcut('remove-auto-layout') ?? 'Shift+Alt+KeyA',
      run: ({ store }) => void removeSelectionAutoLayout(store)
    },
    {
      id: 'shortcut-sheet',
      keys: SHORTCUT_SHEET_KEYBINDINGS,
      run: () => openShortcutSheet(),
      view: true
    }
  ]
}

/** ⌘↩ presents the page's slides, and leaves the presentation again. */
function presentationShortcut(): ShortcutDefinition {
  return {
    id: 'present',
    keys: appMenuTinykeysShortcut('present') ?? '$mod+Enter',
    run: ({ store }) => togglePresentation(store),
    view: true
  }
}

function zoomAtViewportCenter(delta: number): ShortcutAction {
  return ({ store }) => {
    const center = store.viewportCanvasCenter()
    animateViewport(store, () => store.applyZoom(delta, center.x, center.y))
  }
}

function opacityBindings(): ShortcutDefinition[] {
  return ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => ({
    id: `selection-opacity-${digit}`,
    keys: digit,
    run: ({ keyEvent, actions }) => {
      if (keyEvent.metaKey || keyEvent.ctrlKey || keyEvent.altKey || keyEvent.shiftKey) return
      actions.opacityDigit(digit)
    },
    shouldPreventDefault: (event) =>
      !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey
  }))
}

/**
 * Tab steps through sibling layers only while nothing on the page holds focus and an editor pane is
 * on screen, so it still moves focus through the panels' controls and through Home.
 */
function isCanvasFocus(event: KeyboardEvent) {
  if (event.target instanceof HTMLCanvasElement) return true
  return (
    event.target === document.body && document.querySelector('[data-active-pane="true"]') !== null
  )
}

function siblingShortcut(
  command: 'selection.selectNextSibling' | 'selection.selectPreviousSibling'
): ShortcutDefinition {
  return {
    id: command,
    keys: editorCommandMetadata(command).keybinding ?? [],
    run: ({ keyEvent, runCommand }) => {
      if (isCanvasFocus(keyEvent)) runCommand(command)
    },
    shouldPreventDefault: isCanvasFocus
  }
}

/**
 * While text is edited its input handles the keys, undo and redo among them. Focus can leave it
 * for a panel field while the edit stays open, as after a typed font size; undo and redo then
 * run on the editor's history, which records the text edit's steps, rather than go nowhere.
 */
function editingTextHandles(options: KeyboardShortcutOptions, history: boolean) {
  if (!options.store.state.editingTextId) return false
  return !history || isCanvasTextInput(document.activeElement)
}

/**
 * Other shortcuts wait for open popovers to close, but undo and redo work while a fill, stroke,
 * or colour picker is open, as in Figma; a text field in it keeps its own undo.
 */
function shouldIgnoreShortcut(
  event: KeyboardEvent,
  options: KeyboardShortcutOptions,
  shortcutId: string,
  history = false
) {
  return (
    isButtonActivation(event) ||
    overlayHoldsKeys(event, history) ||
    fieldKeepsKey(event, shortcutId) ||
    editingTextHandles(options, history) ||
    !!options.store.state.numberFieldFocused
  )
}

/** A field in a panel or the page has focus; the canvas text editor types through its own field. */
function plainTextFieldFocused(): boolean {
  const active = document.activeElement
  return isInputElement(active) && !isCanvasTextInput(active)
}

/**
 * A focused text field keeps every key that acts on the document or the canvas: ⌘D would
 * otherwise duplicate a layer from a rename field, and ⌘Z would undo the document instead of the
 * typing. Only these application and file commands pass through, as the desktop menu's
 * accelerators do, so ⌘O still opens a file while Home's search field has focus. Each is held
 * with ⌘ or Ctrl: `?` types its character in a field rather than opening the shortcut sheet.
 */
const APP_LEVEL_SHORTCUTS: Readonly<Record<string, true>> = {
  'open-file': true,
  'new-design': true,
  'open-settings': true,
  save: true,
  'save-as': true,
  'toggle-ai': true,
  'toggle-ui': true
}

/** Whether a focused text field keeps this key for itself rather than letting it run. */
function fieldKeepsKey(event: KeyboardEvent, shortcutId: string): boolean {
  if (!plainTextFieldFocused()) return false
  if (!event.metaKey && !event.ctrlKey) return true
  return !Object.hasOwn(APP_LEVEL_SHORTCUTS, shortcutId)
}

/** The shortcut each bound key runs, which decides whether a focused text field keeps that key. */
function shortcutIdsByKeys(shortcuts: readonly ShortcutDefinition[]): Map<string, string> {
  const ids = new Map<string, string>()
  for (const shortcut of shortcuts) {
    if (shortcut.global) continue
    for (const keys of [shortcut.keys].flat()) ids.set(keys, shortcut.id)
  }
  return ids
}

function bindShortcut(
  bindings: KeyBindingMap,
  keys: string | string[],
  run: (event: KeyboardEvent) => void
) {
  for (const key of Array.isArray(keys) ? keys : [keys]) bindings[key] = run
}

/**
 * Binds every key a design or a board picks a tool with; which tool a key picks, if any, comes
 * from the editor profile's key map when it is pressed.
 */
function bindToolShortcuts(bindings: KeyBindingMap, options: KeyboardShortcutRunOptions) {
  const codes = uniq([...Object.keys(TOOL_SHORTCUTS), ...Object.keys(BOARD_TOOL_SHORTCUTS)])
  for (const code of codes) {
    bindings[code] = (event: KeyboardEvent) => {
      const tool = resolveEditorProfile(options.store.state).toolKeys[code]
      if (!tool) return
      event.preventDefault()
      options.spaceTool.resetToolBeforeSpace()
      options.store.setTool(tool)
    }
  }
}

export function registerKeyboardShortcuts(options: KeyboardShortcutOptions) {
  const spaceTool = bindSpaceHandTool(options.inputFocused, options.store)
  // Before the shortcut handler, which picks the zoom tool, so it sees the tool Z replaces.
  bindZoomToolKey(options.inputFocused, options.store)
  const runOptions = (event: KeyboardEvent): KeyboardShortcutRunOptions => ({
    ...options,
    keyEvent: event,
    spaceTool
  })

  const shortcuts: ShortcutDefinition[] = [
    ...commandShortcuts(
      'selection.createComponent',
      'selection.detachInstance',
      'selection.createComponentSet',
      'selection.toggleMask',
      'selection.toggleVisibility',
      'selection.toggleLock',
      'selection.flipHorizontal',
      'selection.flipVertical',
      'selection.tidyUp',
      'selection.distributeHorizontal',
      'selection.distributeVertical'
    ),
    {
      id: 'copy-properties',
      keys: '$mod+Alt+KeyC',
      run: ({ store }) => void copySelectionProperties(store)
    },
    {
      id: 'paste-properties',
      keys: '$mod+Alt+KeyV',
      run: ({ store }) => void pasteClipboardProperties(store)
    },
    {
      id: 'export-selection-png',
      keys: appMenuTinykeysShortcut('export-selection') ?? '$mod+Shift+KeyE',
      run: ({ actions }) => actions.exportSelectionPNG()
    },
    {
      id: 'save-as',
      keys: appMenuTinykeysShortcut('save-as') ?? '$mod+Shift+KeyS',
      run: ({ store }) => {
        if (showsDocument()) void store.saveFigFileAs()
      }
    },
    {
      id: 'save-version',
      keys: appMenuTinykeysShortcut('save-version') ?? '$mod+Alt+KeyS',
      run: ({ store }) => {
        if (isCloudBinding(store.getStorageBinding())) openVersionDialog(store)
      }
    },
    ...commandShortcuts('selection.ungroup', 'edit.redo'),
    {
      id: 'toggle-preview',
      keys: appMenuTinykeysShortcut('toggle-preview') ?? '$mod+Alt+Enter',
      run: ({ actions }) => actions.togglePlay(),
      view: true
    },
    presentationShortcut(),
    {
      id: 'toggle-rulers',
      keys: 'Shift+KeyR',
      run: ({ store }) => {
        store.state.showRulers = !store.state.showRulers
        store.requestRepaint()
      }
    },
    {
      id: 'toggle-multiplayer-cursors',
      keys: '$mod+Alt+Backslash',
      run: ({ store }) => toggleRemoteCursors(store)
    },
    // Figma's keys, matched by key position since Shift turns ' into ".
    {
      id: 'toggle-pixel-grid',
      keys: 'Shift+Quote',
      run: ({ store }) => togglePixelGrid(store)
    },
    {
      id: 'toggle-pixel-grid-snap',
      keys: '$mod+Shift+Quote',
      run: ({ store }) =>
        setSnappingPreference('pixelGrid', !store.state.snappingPreferences.pixelGrid)
    },
    {
      id: 'toggle-ui',
      keys: appMenuTinykeysShortcut('toggle-ui') ?? '$mod+Backslash',
      run: ({ actions }) => actions.toggleUI()
    },
    {
      id: 'toggle-ai',
      keys: shortcutTokenToTinykeys(CHAT_COLUMN_SHORTCUT) ?? '$mod+KeyJ',
      run: ({ actions }) => actions.toggleAI()
    },
    {
      id: 'toggle-comments',
      keys: appMenuTinykeysShortcut('view-comments') ?? 'Shift+KeyC',
      run: () => useComments().toggleOnCanvas()
    },
    {
      id: 'open-settings',
      keys: appMenuTinykeysShortcut('settings') ?? '$mod+Comma',
      run: () => openSettingsDialog(),
      global: true
    },
    {
      id: 'zoom-in',
      keys: [appMenuTinykeysShortcut('zoom-in') ?? '$mod+Equal', '$mod+Shift+Equal'],
      run: zoomAtViewportCenter(-100),
      global: true
    },
    {
      id: 'zoom-out',
      keys: appMenuTinykeysShortcut('zoom-out') ?? '$mod+Minus',
      run: zoomAtViewportCenter(100),
      global: true
    },
    {
      id: 'zoom-in-unmodified',
      keys: 'Shift+Equal',
      run: zoomAtViewportCenter(-100)
    },
    {
      id: 'zoom-out-unmodified',
      keys: 'Minus',
      run: zoomAtViewportCenter(100)
    },
    {
      id: 'close-tab',
      keys: appMenuTinykeysShortcut('close') ?? '$mod+KeyW',
      run: ({ closeActiveTab }) => closeActiveTab()
    },
    {
      id: 'new-design',
      keys: appMenuTinykeysShortcut('new') ?? '$mod+KeyN',
      run: ({ createTab }) => createTab()
    },
    {
      id: 'new-tab',
      keys: appMenuTinykeysShortcut('new-tab') ?? '$mod+KeyT',
      run: ({ openNewFileTab }) => openNewFileTab()
    },
    {
      id: 'next-tab',
      keys: 'Control+Tab',
      run: ({ switchAdjacentTab }) => switchAdjacentTab(1),
      global: true
    },
    {
      id: 'previous-tab',
      keys: 'Control+Shift+Tab',
      run: ({ switchAdjacentTab }) => switchAdjacentTab(-1),
      global: true
    },
    {
      id: 'rename-selection',
      keys: appMenuTinykeysShortcut('selection.rename') ?? '$mod+KeyR',
      run: ({ store }) => requestRenameSelection(store)
    },
    ...commandShortcuts(
      'edit.undo',
      'view.zoom100',
      'view.zoomFit',
      'view.zoomSelection',
      'view.zoomNextFrame',
      'view.zoomPreviousFrame',
      'view.nextPage',
      'view.previousPage',
      'selection.selectParent',
      'selection.duplicate',
      'selection.selectAll',
      'selection.selectInverse'
    ),
    {
      id: 'save',
      keys: appMenuTinykeysShortcut('save') ?? '$mod+KeyS',
      run: ({ store }) => {
        if (showsDocument()) void store.saveFigFile()
      }
    },
    {
      id: 'open-file',
      keys: appMenuTinykeysShortcut('open') ?? '$mod+KeyO',
      run: ({ openFileDialog }) => openFileDialog()
    },
    {
      id: 'place-image',
      keys: appMenuTinykeysShortcut('place-image') ?? '$mod+Shift+KeyK',
      run: ({ store }) => openPlaceImageDialog(store)
    },
    ...commandShortcuts('selection.group'),
    {
      id: 'toggle-auto-layout',
      keys: 'Shift+KeyA',
      run: ({ actions }) => actions.toggleAutoLayout()
    },
    ...commandShortcuts(
      'selection.bringForward',
      'selection.bringToFront',
      'selection.sendBackward',
      'selection.sendToBack'
    ),
    { id: 'delete-backspace', keys: 'Backspace', run: ({ actions }) => actions.smartDelete(false) },
    { id: 'delete', keys: 'Delete', run: ({ actions }) => actions.smartDelete(false) },
    { id: 'delete-alt', keys: 'Alt+Delete', run: ({ actions }) => actions.smartDelete(true) },
    { id: 'enter', keys: 'Enter', run: ({ actions }) => actions.confirmOrEditSelection() },
    {
      id: 'escape',
      keys: 'Escape',
      run: ({ actions }) => actions.escapeOrDeselect(),
      view: true
    },
    siblingShortcut('selection.selectNextSibling'),
    siblingShortcut('selection.selectPreviousSibling'),
    ...opacityBindings(),
    ...browserMenuShortcuts()
  ]

  const bindings: KeyBindingMap = {}
  const globalBindings: KeyBindingMap = {}
  const shortcutIds = shortcutIdsByKeys(shortcuts)
  /** Keys that switch or leave the canvas's view, which every view keeps. */
  const viewKeys = new Set(
    shortcuts.filter((shortcut) => shortcut.view).flatMap((shortcut) => [shortcut.keys].flat())
  )
  const historyKeys = new Set(
    shortcuts
      .filter((shortcut) => shortcut.id === 'edit.undo' || shortcut.id === 'edit.redo')
      .flatMap((shortcut) => [shortcut.keys].flat())
  )
  bindToolShortcuts(bindings, runOptions(new KeyboardEvent('keydown')))

  for (const shortcut of shortcuts) {
    bindShortcut(shortcut.global ? globalBindings : bindings, shortcut.keys, (event) => {
      shortcut.run(runOptions(event))
      if (shortcut.shouldPreventDefault?.(event) ?? true) event.preventDefault()
    })
  }

  const editorHandler = createKeybindingsHandler(
    Object.fromEntries(
      Object.entries(bindings).map(([keys, handler]) => [
        keys,
        (event: KeyboardEvent) => {
          const id = shortcutIds.get(keys) ?? ''
          if (shouldIgnoreShortcut(event, options, id, historyKeys.has(keys))) return
          const { shortcuts: allowed } = resolveEditorProfile(options.store.state)
          if (allowed === 'view' && !viewKeys.has(keys)) return
          handler(event)
        }
      ])
    )
  )
  const globalHandler = createKeybindingsHandler(globalBindings)

  useEventListener(window, 'keydown', (event) => editorHandler(shortcutEvent(event)), {
    capture: true
  })
  useEventListener(window, 'keydown', (event) => globalHandler(shortcutEvent(event)), {
    capture: true
  })
}
