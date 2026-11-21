import { describe, expect, test } from 'bun:test'

import type { AppMenuEntry } from '@/app/shell/menu/schema'
import { APP_MENU_SCHEMA } from '@/app/shell/menu/schema'

function actionItems(entries: readonly AppMenuEntry[]): AppMenuEntry[] {
  const result: AppMenuEntry[] = []
  for (const entry of entries) {
    if ('type' in entry && entry.type === 'separator') continue
    result.push(entry)
    if (entry.sub) result.push(...actionItems(entry.sub))
  }
  return result
}

describe('APP_MENU_SCHEMA', () => {
  test('does not duplicate shortcuts for command-backed entries', () => {
    const duplicated = APP_MENU_SCHEMA.flatMap((group) =>
      actionItems(group.items).filter(
        (entry) => !('type' in entry) && entry.command && entry.shortcut
      )
    )

    expect(duplicated).toEqual([])
  })

  test('exposes every menu-backed editor command to shared dispatch', () => {
    const commandIds = actionItems(
      APP_MENU_SCHEMA.flatMap<AppMenuEntry>((group) => group.items)
    ).flatMap((entry) => {
      if ('type' in entry || !entry.command) return []
      return [entry.command]
    })

    expect(commandIds).toContain('selection.frameSelection')
    expect(commandIds).toContain('selection.toggleMask')
    expect(commandIds).toContain('selection.toggleVisibility')
    expect(commandIds).toContain('selection.toggleLock')
    expect(commandIds).toContain('selection.flipHorizontal')
    expect(commandIds).toContain('selection.flipVertical')
    expect(commandIds).toContain('selection.createInstance')
    expect(commandIds).toContain('selection.goToMainComponent')
    expect(commandIds).toContain('selection.moveToPage')
  })

  test('marks route-neutral native actions for shell dispatch', () => {
    const shellEntries = actionItems(
      APP_MENU_SCHEMA.flatMap<AppMenuEntry>((group) => group.items)
    ).filter((entry) => !('type' in entry) && entry.handler === 'shell')

    expect(shellEntries.map((entry) => ('type' in entry ? '' : entry.id))).toEqual([
      'new-window',
      'open-tour',
      'diagnostics',
      'settings',
      'view-layers-panel',
      'view-properties-panel',
      'theme-light',
      'theme-dark',
      'theme-auto',
      'snap-geometry',
      'snap-objects',
      'snap-pixel-grid',
      'keyboard-shortcuts',
      'check-updates'
    ])
  })

  // Windows and Linux have no application menu, so their Help menu holds what macOS keeps there.
  test('gives the desktop app a Help menu with Check for Updates and About', () => {
    const help = APP_MENU_SCHEMA.find((group) => group.label === 'Help')
    expect(help).toMatchObject({ target: 'native' })
    const ids = (help ? actionItems(help.items) : []).map((entry) =>
      'type' in entry ? '' : entry.id
    )
    expect(ids).toEqual(['check-updates', 'about'])
  })

  test('places images, exports frames to PDF, and records the prototype from the File menu', () => {
    const fileMenu = APP_MENU_SCHEMA.find((group) => group.label === 'File')
    const ids = (fileMenu ? actionItems(fileMenu.items) : []).map((entry) =>
      'type' in entry ? '' : entry.id
    )
    expect(ids).toContain('place-image')
    expect(ids).toContain('export-pdf')
    expect(ids).toContain('export-video')
  })

  // As in Figma, files are browsed on Home and in a New tab, so the File menu creates and saves.
  test('starts documents and saves to places from the File menu', () => {
    const fileMenu = APP_MENU_SCHEMA.find((group) => group.label === 'File')
    const ids = (fileMenu ? actionItems(fileMenu.items) : []).map((entry) =>
      'type' in entry ? '' : entry.id
    )

    expect(ids.slice(0, 4)).toEqual(['new', 'new-tab', 'new-window', 'open'])
    expect(ids).not.toContain('browse-files')
    expect(ids).toContain('save-to')
    expect(ids).not.toContain('save-to-cloud')
  })

  // A window is the shell's, not a document's: only the desktop app can open one.
  test('opens a second editor window from the native File menu', () => {
    const fileMenu = APP_MENU_SCHEMA.find((group) => group.label === 'File')
    const entries = fileMenu ? actionItems(fileMenu.items) : []

    expect(entries).toContainEqual(
      expect.objectContaining({ id: 'new-window', label: 'New Window', target: 'native' })
    )
  })

  test('exposes recent files through the native File menu', () => {
    const fileMenu = APP_MENU_SCHEMA.find((group) => group.label === 'File')
    const entries = fileMenu ? actionItems(fileMenu.items) : []

    expect(entries).toContainEqual(
      expect.objectContaining({ id: 'open-recent', label: 'Open Recent', target: 'native' })
    )
  })

  test('keeps move-to-page destination selection in the browser menu', () => {
    const objectMenu = APP_MENU_SCHEMA.find((group) => group.label === 'Object')
    const entries = objectMenu ? actionItems(objectMenu.items) : []
    const moveEntries = entries.filter(
      (entry) => !('type' in entry) && entry.id.startsWith('selection.moveToPage')
    )

    expect(moveEntries).toEqual([
      expect.objectContaining({ id: 'selection.moveToPage', target: 'browser' })
    ])
  })

  test('picks the zoom tool from the View menu', () => {
    const viewMenu = APP_MENU_SCHEMA.find((group) => group.label === 'View')
    const ids = (viewMenu ? actionItems(viewMenu.items) : []).map((entry) =>
      'type' in entry ? '' : entry.id
    )
    const zoomTool = (viewMenu ? actionItems(viewMenu.items) : []).find(
      (entry) => !('type' in entry) && entry.id === 'view-zoom-tool'
    )

    // It follows the zoom commands it belongs with, and binds no key: Z is spring-loaded in the
    // keymap and needs the raw key, which a native accelerator would take.
    expect(ids.indexOf('view-zoom-tool')).toBe(ids.indexOf('zoom-out') + 1)
    expect(zoomTool).toEqual({
      id: 'view-zoom-tool',
      label: 'Zoom Tool',
      palette: { keywords: ['magnifier', 'magnify'] }
    })
  })

  test('adds a link to the selected texts from the Text menu', () => {
    const textMenu = APP_MENU_SCHEMA.find((group) => group.label === 'Text')
    const ids = (textMenu ? actionItems(textMenu.items) : []).map((entry) =>
      'type' in entry ? '' : entry.id
    )

    // The selected texts enable it, which the native menu cannot follow, so it is browser-only.
    expect(ids).toEqual(['text.bold', 'text.italic', 'text.underline', 'text-add-link'])
    const addLink = (textMenu ? actionItems(textMenu.items) : []).find(
      (entry) => !('type' in entry) && entry.id === 'text-add-link'
    )
    expect(addLink).toEqual({
      id: 'text-add-link',
      label: 'Add Link',
      palette: { keywords: ['hyperlink', 'url'] },
      target: 'browser'
    })
  })

  test('opens Shader Mode from the View menu while the selection has a shader', () => {
    const viewMenu = APP_MENU_SCHEMA.find((group) => group.label === 'View')
    const ids = (viewMenu ? actionItems(viewMenu.items) : []).map((entry) =>
      'type' in entry ? '' : entry.id
    )
    const shaderMode = (viewMenu ? actionItems(viewMenu.items) : []).find(
      (entry) => !('type' in entry) && entry.id === 'view-shader-mode'
    )

    // It sits with the modes Preview and Present, and the selection's shader paints enable it;
    // the native menu cannot follow the selection, so the entry is browser-only.
    expect(ids.indexOf('view-shader-mode')).toBe(ids.indexOf('present') + 1)
    expect(shaderMode).toEqual({
      id: 'view-shader-mode',
      label: 'Shader Mode',
      palette: { keywords: ['glsl', 'effect', 'animation', 'play'] },
      target: 'browser'
    })
  })
})
