import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'
import { ref } from 'vue'

import type { ShortcutSheetSection } from '@/app/shell/keyboard/sheet'

import ShortcutSheet from './ShortcutSheet.vue'
import ShortcutSheetBody from './ShortcutSheetBody.vue'

const sections: ShortcutSheetSection[] = [
  {
    id: 'tools',
    label: 'Tools',
    entries: [
      { id: 'tool-SELECT', label: 'Move', shortcut: 'V' },
      { id: 'tool-FRAME', label: 'Frame', shortcut: 'F' },
      { id: 'tool-RECTANGLE', label: 'Rectangle', shortcut: 'R' },
      { id: 'tool-TEXT', label: 'Text', shortcut: 'T' },
      { id: 'pan-while-held', label: 'Pan while held', shortcut: 'Space' }
    ]
  },
  {
    id: 'menu-edit',
    label: 'Edit',
    entries: [
      { id: 'edit.undo', label: 'Undo', shortcut: '⌘Z' },
      { id: 'edit.redo', label: 'Redo', shortcut: '⇧⌘Z' },
      { id: 'paste-to-replace', label: 'Paste to replace', shortcut: '⇧⌘R' },
      { id: 'selection.duplicate', label: 'Duplicate', shortcut: '⌘D' }
    ]
  },
  {
    id: 'menu-arrange',
    label: 'Arrange',
    entries: [
      { id: 'arrange.align-left', label: 'Align left', shortcut: '⌥A' },
      { id: 'arrange.align-center', label: 'Align center', shortcut: '⌥H' },
      { id: 'arrange.align-top', label: 'Align top', shortcut: '⌥W' }
    ]
  },
  {
    id: 'canvas',
    label: 'Canvas and selection',
    entries: [
      { id: 'copy-as-png', label: 'Copy as PNG', shortcut: '⇧⌘C' },
      { id: 'remove-auto-layout', label: 'Remove auto layout', shortcut: '⌥⇧A' },
      { id: 'selection.setOpacity', label: 'Set opacity', shortcut: '1-9, 0' },
      { id: 'shortcut-sheet', label: 'Keyboard shortcuts', shortcut: '?' }
    ]
  }
]

type Args = { sections: ShortcutSheetSection[]; width?: number }

const meta = {
  title: 'App/Shell/Shortcut Sheet',
  args: { sections },
  render: (args) => ({
    components: { ShortcutSheet },
    setup: () => ({ args, open: ref(true) }),
    template: `<ShortcutSheet v-model:open="open" :sections="args.sections" />`
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

/** Typing narrows the sheet to the entries whose name or keys match. */
export const Search: Story = {
  play: async () => {
    const body = within(document.body)
    const dialog = await body.findByRole('dialog')
    await userEvent.type(within(dialog).getByRole('searchbox'), 'align')
    await expect(within(dialog).getAllByRole('term')).toHaveLength(3)
  }
}

export const NoResults: Story = {
  play: async () => {
    const body = within(document.body)
    const dialog = await body.findByRole('dialog')
    await userEvent.type(within(dialog).getByRole('searchbox'), 'zzz')
    await expect(within(dialog).queryAllByRole('term')).toHaveLength(0)
  }
}

export const Empty: Story = { args: { sections: [] } }

/**
 * The sheet's body at a fixed width: its sections take one column in a narrow container, two in
 * a medium one, and three in a wide one, by the container's width, not the viewport's.
 */
const atWidth: Story['render'] = (args) => ({
  components: { ShortcutSheetBody },
  setup: () => ({ args, query: ref('') }),
  template: `<div :style="{ width: args.width + 'px' }">
    <ShortcutSheetBody v-model:query="query" :sections="args.sections" />
  </div>`
})

/** The number of columns the sections flow into. */
function columns(canvasElement: HTMLElement): number {
  const grid = within(canvasElement).getByRole('heading', { name: 'Tools' }).closest('section')
  const container = grid?.parentElement
  if (!container) throw new Error('The sheet shows no sections')
  return getComputedStyle(container).gridTemplateColumns.split(' ').length
}

export const Narrow: Story = {
  args: { width: 360 },
  render: atWidth,
  play: async ({ canvasElement }) => expect(columns(canvasElement)).toBe(1)
}

export const Medium: Story = {
  args: { width: 640 },
  render: atWidth,
  play: async ({ canvasElement }) => expect(columns(canvasElement)).toBe(2)
}

export const Wide: Story = {
  args: { width: 1000 },
  render: atWidth,
  play: async ({ canvasElement }) => expect(columns(canvasElement)).toBe(3)
}
