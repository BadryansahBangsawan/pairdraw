import { describe, expect, test } from 'bun:test'

import {
  EDITOR_COMMAND_METADATA,
  editorCommandMetadata,
  type EditorCommandMetadata
} from '@open-pencil/vue/editor/commands'

import { APP_MENU_SCHEMA, type AppMenuEntry } from '@/app/shell/menu/schema'
import { shortcutTokenToTinykeys } from '@/app/shell/menu/shortcut'

/** Each key, in tinykeys notation, with the actions it runs: a menu item's command, or its id. */
type KeyOwners = Map<string, Set<string>>

function claim(owners: KeyOwners, key: string | undefined, action: string) {
  if (!key) return
  const actions = owners.get(key) ?? new Set<string>()
  actions.add(action)
  owners.set(key, actions)
}

function claimMenuEntries(owners: KeyOwners, entries: readonly AppMenuEntry[]) {
  for (const entry of entries) {
    if (entry.type === 'separator') continue
    const shortcut =
      entry.shortcut ?? (entry.command ? editorCommandMetadata(entry.command).shortcut : undefined)
    claim(owners, shortcutTokenToTinykeys(shortcut), entry.command ?? entry.id)
    if (entry.sub) claimMenuEntries(owners, entry.sub)
  }
}

function claimCommandKeybindings(owners: KeyOwners) {
  for (const [id, metadata] of Object.entries(EDITOR_COMMAND_METADATA)) {
    const { keybinding }: EditorCommandMetadata = metadata
    for (const key of Array.isArray(keybinding) ? keybinding : [keybinding]) claim(owners, key, id)
  }
}

/** Every key the app menu and the editor commands bind, with the actions bound to it. */
function keyOwners(): KeyOwners {
  const owners: KeyOwners = new Map()
  for (const group of APP_MENU_SCHEMA) claimMenuEntries(owners, group.items)
  claimCommandKeybindings(owners)
  return owners
}

function conflicts(owners: KeyOwners): Record<string, string[]> {
  return Object.fromEntries(
    [...owners]
      .filter(([, actions]) => actions.size > 1)
      .map(([key, actions]) => [key, [...actions]])
  )
}

describe('shortcut conflicts', () => {
  test('no two menu items or editor commands share a key', () => {
    expect(conflicts(keyOwners())).toEqual({})
  })

  test('⇧⌘K places an image, as in Figma, and Create Component Set has no key', () => {
    expect([...(keyOwners().get('$mod+Shift+KeyK') ?? [])]).toEqual(['place-image'])
    expect(EDITOR_COMMAND_METADATA['selection.createComponentSet']).toEqual({})
  })
})
