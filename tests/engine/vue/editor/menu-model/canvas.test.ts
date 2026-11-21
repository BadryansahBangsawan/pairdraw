import { describe, expect, test } from 'bun:test'

import { computed, ref } from 'vue'

import type { EditorCommandId } from '@pairdraw/vue/editor/commands'

import { buildCanvasContextMenu } from '#vue/editor/menu-model/canvas'
import type { CanvasMenuOptions } from '#vue/editor/menu-model/canvas'

function selection(overrides: Partial<CanvasMenuOptions['selection']> = {}) {
  return {
    hasSelection: ref(true),
    isGroup: ref(false),
    isComponent: ref(false),
    isInstance: ref(false),
    isIcon: ref(false),
    canCreateComponentSet: ref(false),
    canCreateSlot: ref(false),
    canConvertToFrame: ref(false),
    canCreateVariations: ref(false),
    canAutoArrange: ref(false),
    ...overrides
  } as CanvasMenuOptions['selection']
}

function options(overrides: Partial<CanvasMenuOptions> = {}): CanvasMenuOptions {
  return {
    commandMenuItem(id: EditorCommandId) {
      return { id, label: id }
    },
    otherPages: [],
    moveSelectionToPage: (pageId: string) => pageId,
    selection: selection(),
    t: { moveToPage: 'Move to page', autoArrange: 'Auto arrange' },
    ...overrides
  } as CanvasMenuOptions
}

function itemIds(menu: ReturnType<typeof buildCanvasContextMenu>) {
  return menu.map((item) => (item.separator ? '---' : (item.id ?? item.label)))
}

describe('buildCanvasContextMenu', () => {
  test('keeps the default selection menu in semantic groups', () => {
    expect(itemIds(buildCanvasContextMenu(options()))).toEqual([
      'selection.duplicate',
      'selection.delete',
      '---',
      'selection.bringForward',
      'selection.bringToFront',
      'selection.sendBackward',
      'selection.sendToBack',
      '---',
      'selection.group',
      'selection.frameSelection',
      'selection.wrapInAutoLayout',
      'selection.toggleMask',
      'selection.flatten',
      'selection.outlineText',
      'selection.outlineStroke',
      '---',
      'selection.createComponent',
      '---',
      'selection.toggleVisibility',
      'selection.toggleLock',
      '---',
      'selection.flipHorizontal',
      'selection.flipVertical'
    ])
  })

  test('offers Duplicate as variation after Duplicate only for a layer that can be varied', () => {
    const ids = itemIds(
      buildCanvasContextMenu(
        options({ selection: selection({ canCreateVariations: computed(() => true) }) })
      )
    )
    expect(ids.slice(0, 3)).toEqual([
      'selection.duplicate',
      'selection.duplicateAsVariation',
      'selection.delete'
    ])
  })

  test('shows instance actions only for instances', () => {
    expect(
      itemIds(
        buildCanvasContextMenu(
          options({ selection: selection({ isInstance: computed(() => true) }) })
        )
      )
    ).toContain('selection.detachInstance')
  })

  test('offers Push and Reset all changes ahead of the other instance actions', () => {
    const ids = itemIds(
      buildCanvasContextMenu(
        options({ selection: selection({ isInstance: computed(() => true) }) })
      )
    )
    expect(ids.indexOf('selection.pushInstanceOverrides')).toBeLessThan(
      ids.indexOf('selection.resetInstanceOverrides')
    )
    expect(ids.indexOf('selection.resetInstanceOverrides')).toBeLessThan(
      ids.indexOf('selection.goToMainComponent')
    )
    expect(itemIds(buildCanvasContextMenu(options()))).not.toContain(
      'selection.resetInstanceOverrides'
    )
    expect(itemIds(buildCanvasContextMenu(options()))).not.toContain(
      'selection.pushInstanceOverrides'
    )
  })

  test('offers Create slot for layers of a main component', () => {
    const ids = itemIds(
      buildCanvasContextMenu(
        options({ selection: selection({ canCreateSlot: computed(() => true) }) })
      )
    )
    expect(ids).toContain('selection.createSlot')
    expect(itemIds(buildCanvasContextMenu(options()))).not.toContain('selection.createSlot')
  })

  test('offers Convert to frame beside Create instance for a main component', () => {
    const ids = itemIds(
      buildCanvasContextMenu(
        options({
          selection: selection({
            isComponent: computed(() => true),
            canConvertToFrame: computed(() => true)
          })
        })
      )
    )
    expect(ids).toContain('selection.createInstance')
    expect(ids).toContain('selection.convertToFrame')
    expect(itemIds(buildCanvasContextMenu(options()))).not.toContain('selection.convertToFrame')
  })

  test('offers Auto arrange for layers that can be arranged', () => {
    const menu = buildCanvasContextMenu(
      options({ selection: selection({ canAutoArrange: computed(() => true) }) })
    )
    const arrange = menu.at(-1)
    expect(arrange && !arrange.separator ? arrange.label : undefined).toBe('Auto arrange')
    expect(itemIds(arrange && !arrange.separator ? (arrange.sub ?? []) : [])).toEqual([
      'selection.arrangeSpread',
      'selection.arrangeCompact',
      'selection.arrangePack',
      '---',
      'selection.arrangeFlowDown',
      'selection.arrangeFlowRight',
      'selection.arrangeTreeDown',
      'selection.arrangeTreeRight',
      'selection.arrangeRadial',
      'selection.arrangeNetwork'
    ])
    expect(itemIds(buildCanvasContextMenu(options()))).not.toContain('Auto arrange')
  })

  test('does not emit empty leading or repeated separators', () => {
    const ids = itemIds(buildCanvasContextMenu(options({ otherPages: [] })))
    expect(ids[0]).not.toBe('---')
    expect(ids.at(-1)).not.toBe('---')
    expect(ids.join(',')).not.toContain('---,---')
  })
})
