import { describe, expect, test } from 'bun:test'

import type { AppMenuActionItem, AppMenuEntry } from '@/app/shell/menu/schema'
import { APP_MENU_SCHEMA } from '@/app/shell/menu/schema'
import { MENU_ITEMS_NEEDING_SELECTION } from '@/app/shell/menu/selection-gate'

function actionItems(entries: readonly AppMenuEntry[]): AppMenuActionItem[] {
  return entries.flatMap((entry) =>
    entry.type === 'separator' ? [] : [entry, ...actionItems(entry.sub ?? [])]
  )
}

const entries = actionItems(APP_MENU_SCHEMA.flatMap((group) => group.items))

describe('menu items that wait for a selection', () => {
  test('Export Selection and every format it exports wait for one', () => {
    const exportSelection = entries.find((entry) => entry.id === 'export-selection')
    expect(exportSelection?.sub?.length).toBeGreaterThan(0)
    const exportItems = [exportSelection, ...(exportSelection?.sub ?? [])].filter(
      (entry): entry is AppMenuActionItem => entry !== undefined && entry.type !== 'separator'
    )

    expect(exportItems.length).toBeGreaterThan(1)
    for (const item of exportItems) {
      expect(MENU_ITEMS_NEEDING_SELECTION.has(item.id)).toBe(true)
    }
  })

  test('Copy and Cut wait for one, Paste does not', () => {
    expect(MENU_ITEMS_NEEDING_SELECTION.has('copy')).toBe(true)
    expect(MENU_ITEMS_NEEDING_SELECTION.has('cut')).toBe(true)
    expect(MENU_ITEMS_NEEDING_SELECTION.has('paste')).toBe(false)
  })

  test('Export Frames to PDF is not gated: it exports the page with nothing selected', () => {
    expect(MENU_ITEMS_NEEDING_SELECTION.has('export-pdf')).toBe(false)
  })
})
