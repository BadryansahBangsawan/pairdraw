import { describe, expect, test } from 'bun:test'

import { ref } from 'vue'

import type { EditorCommandId } from '@open-pencil/vue/editor/commands'

import { buildCanvasContextMenu } from '#vue/editor/menu-model/canvas'
import type { CanvasMenuOptions } from '#vue/editor/menu-model/canvas'

/** The canvas menu's command ids for a selection that is an icon or not. */
function menuIds(isIcon: boolean, enabled: ReadonlySet<EditorCommandId> = new Set()) {
  const menu = buildCanvasContextMenu({
    commandMenuItem: (id: EditorCommandId) => ({
      id,
      label: id,
      ...(enabled.has(id) ? { disabled: false } : {})
    }),
    otherPages: [],
    moveSelectionToPage: (pageId: string) => pageId,
    selection: {
      hasSelection: ref(true),
      isGroup: ref(false),
      isComponent: ref(false),
      isInstance: ref(false),
      isIcon: ref(isIcon),
      canCreateComponentSet: ref(false),
      canCreateSlot: ref(false),
      canConvertToFrame: ref(false),
      canAutoArrange: ref(false)
    } as CanvasMenuOptions['selection'],
    t: { moveToPage: 'Move to page', autoArrange: 'Auto arrange' }
  })
  return menu.flatMap((item) => (item.separator ? [] : [item.id]))
}

describe('canvas menu for icons', () => {
  test('offers Detach icon only for icons', () => {
    expect(menuIds(true)).toContain('selection.detachIcon')
    expect(menuIds(false)).not.toContain('selection.detachIcon')
  })
})

describe('canvas menu for images', () => {
  test('offers Crop image only while the selection can be cropped', () => {
    expect(menuIds(false, new Set(['selection.cropImage']))).toContain('selection.cropImage')
    expect(menuIds(false)).not.toContain('selection.cropImage')
  })
})
