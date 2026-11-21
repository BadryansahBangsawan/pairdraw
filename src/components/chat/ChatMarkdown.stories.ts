import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { ref } from 'vue'

import ChatMarkdown from './ChatMarkdown.vue'

type ChatMarkdownStoryArgs = {
  content: string
  mode?: 'static' | 'streaming'
  localFiles?: boolean
}

/**
 * vue-stream-markdown wraps each code block in its own <header> and <main>, which its component
 * overrides cannot replace; until upstream drops them they read as page landmarks.
 */
const codeBlockLandmarks = {
  a11y: {
    config: {
      rules: [
        'landmark-banner-is-top-level',
        'landmark-main-is-top-level',
        'landmark-no-duplicate-banner',
        'landmark-no-duplicate-main',
        'landmark-unique'
      ].map((id) => ({ id, enabled: false }))
    }
  }
}

type Story = StoryObj<ChatMarkdownStoryArgs>

const meta = {
  title: 'App/Chat/Markdown',
  component: ChatMarkdown,
  parameters: { layout: 'centered' },
  render: (args) => ({
    components: { ChatMarkdown },
    setup: () => ({ args }),
    template:
      '<div class="w-80 bg-panel px-3.5 py-3 text-xs leading-relaxed text-surface"><ChatMarkdown v-bind="args" /></div>'
  })
} satisfies Meta<ChatMarkdownStoryArgs>

export default meta

export const Prose: Story = {
  args: {
    content: `# Compact heading

A paragraph with **bold text**, *emphasis*, and [a link](https://example.com).

## Smaller heading

- First item
- Second item

---

Closing paragraph.`
  }
}

export const InlineCode: Story = {
  args: {
    content:
      'Rename cells using `Cell_R{row}C{col}`. Rows run from `Row_1` through `Row_4`; for example, use `Cell_R2C3`.'
  }
}

export const CodeBlock: Story = {
  parameters: codeBlockLandmarks,
  args: {
    content: `\`\`\`typescript
const button = {
  label: 'Subscribe',
  rounded: 8,
}
\`\`\``
  }
}

export const MixedContent: Story = {
  parameters: codeBlockLandmarks,
  args: {
    content: `## Updated layout

The grid uses \`Cell_R{row}C{col}\` names.

\`\`\`typescript
const columns = 4
const rows = 4
\`\`\`

> Names remain stable when cells move.`
  }
}

export const Table: Story = {
  args: {
    content: `The button now has these states:

| State | Look |
| --- | --- |
| Default | Burnt orange \`#c2410c\` with the soft glow |
| Hover | Brighter \`#ea580c\` with a bigger glow |
| Disabled | Muted \`#374151\` with grey text |`
  }
}

export const TaskList: Story = {
  args: {
    content: `- [x] Variants created
- [ ] Checked in preview

See [the guide](https://example.com/guide).`
  }
}

export const Streaming: Story = {
  args: {
    mode: 'streaming',
    content:
      'The assistant is writing **streamed content** with `inline_code` and an unfinished [link'
  }
}

/** On the desktop, links to files on this computer show the file in its folder. */
export const LocalFileLinks: Story = {
  args: {
    localFiles: true,
    content:
      'I saved the tokens to [tokens.css](file:///Users/me/Designs/tokens.css) and the export to <file:///Users/me/Designs/hero.png>.'
  }
}

/** In the browser the same links stay inert text. */
export const LocalFileLinksInBrowser: Story = {
  args: {
    localFiles: false,
    content: 'I saved the tokens to [tokens.css](file:///Users/me/Designs/tokens.css).'
  }
}

/** A reply that finishes, which the Finish button stands in for, keeps the text as it was drawn. */
export const Finishing: Story = {
  args: {
    content:
      'The card now **hugs** its content, with `16px` between [its rows](https://pairdraw.app).'
  },
  render: (args) => ({
    components: { ChatMarkdown },
    setup: () => ({ args, mode: ref<'static' | 'streaming'>('streaming') }),
    template: `<div class="w-80 space-y-2">
      <div class="bg-panel px-3.5 py-3 text-xs leading-relaxed text-surface"><ChatMarkdown :content="args.content" :mode="mode" /></div>
      <button type="button" class="text-xs text-surface" @click="mode = 'static'">Finish</button>
    </div>`
  }),
  play: async ({ canvasElement }) => {
    // The Markdown renderer loads on demand, so it can arrive after the story mounts.
    const markdown = await waitFor(async () => {
      const element = canvasElement.querySelector('[data-markdown-mode]')
      await expect(element).toHaveAttribute('data-markdown-mode', 'streaming')
      return element
    })
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Finish' }))
    await waitFor(() => expect(markdown).toHaveAttribute('data-markdown-mode', 'static'))
    // Still the element that streamed: a new one would fade the read text in again.
    await expect(canvasElement.querySelector('[data-markdown-mode]')).toBe(markdown)
  }
}
