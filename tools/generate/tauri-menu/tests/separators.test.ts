import { expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

import * as v from 'valibot'

import { resolveWorkspaceRoot } from '@open-pencil/package-artifacts-tools'

import { MENU_PATH, cleanGroup, nativeItems } from '../src/menu'

const item = (id: string) => ({ id, label: id })
const separator = { type: 'separator' as const }
const browserOnly = (id: string) => ({ id, label: id, target: 'browser' as const })

test('a browser-only entry does not leave its separator dangling', () => {
  const group = cleanGroup({
    label: 'Text',
    items: [item('bold'), separator, browserOnly('add-link')]
  })
  expect(group).toEqual({ label: 'Text', items: [{ id: 'bold', label: 'bold' }] })
})

test('one separator remains where a browser-only entry sat between two', () => {
  const items = nativeItems([
    item('bold'),
    separator,
    browserOnly('add-link'),
    separator,
    item('italic')
  ])
  expect(items).toEqual([
    { id: 'bold', label: 'bold' },
    { type: 'separator' },
    { id: 'italic', label: 'italic' }
  ])
})

test('a group never starts with a separator', () => {
  expect(nativeItems([separator, browserOnly('add-link'), item('bold')])).toEqual([
    { id: 'bold', label: 'bold' }
  ])
})

test('submenus are trimmed the same way', () => {
  const [entry] = nativeItems([
    { id: 'parent', label: 'parent', sub: [item('bold'), separator, browserOnly('add-link')] }
  ])
  expect(entry).toEqual({ id: 'parent', label: 'parent', sub: [{ id: 'bold', label: 'bold' }] })
})

const menuEntrySchema = v.union([
  v.object({ type: v.literal('separator') }),
  v.object({
    id: v.string(),
    label: v.string(),
    accelerator: v.optional(v.string()),
    checkbox: v.optional(v.boolean()),
    feature: v.optional(v.string()),
    sub: v.optional(v.array(v.unknown()))
  })
])

const menuSchema = v.array(
  v.object({
    label: v.string(),
    items: v.array(menuEntrySchema)
  })
)

test('every committed menu group keeps separators between entries', async () => {
  const root = await resolveWorkspaceRoot(import.meta.dir)
  const raw = await readFile(join(root, MENU_PATH), 'utf8')
  const parsed = v.safeParse(v.pipe(v.string(), v.parseJson(), menuSchema), raw)
  expect(parsed.success).toBe(true)
  if (!parsed.success) return

  for (const group of parsed.output) {
    const separators = group.items.flatMap((entry, index) =>
      'type' in entry && entry.type === 'separator' ? [index] : []
    )
    expect(separators, `${group.label} starts with a separator`).not.toContain(0)
    expect(separators, `${group.label} ends with a separator`).not.toContain(group.items.length - 1)
    for (const [index, position] of separators.entries()) {
      const previous = separators[index - 1]
      expect(previous === undefined || position - previous > 1, `${group.label} repeats one`).toBe(
        true
      )
    }
  }
})
