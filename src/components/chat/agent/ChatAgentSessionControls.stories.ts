import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { TooltipProvider } from 'reka-ui'
import { expect, fn, screen, userEvent, waitFor, within } from 'storybook/test'
import IconCompass from '~icons/lucide/compass'
import IconMousePointer from '~icons/lucide/mouse-pointer-2'
import IconPaperclip from '~icons/lucide/paperclip'
import IconSparkles from '~icons/lucide/sparkles'

import { startAgentSessionControls } from '@/app/ai/agents/acp/session/store'
import ChatComposer from '@/components/chat/ChatComposer.vue'
import { chatInputTheme } from '@/components/chat/ui'
import IconButton from '@/components/ui/button/IconButton.vue'

import ChatAgentSessionControls from './ChatAgentSessionControls.vue'

interface Args {
  agentId: string
  agent: string
  onError: (message: string) => void
}

/**
 * What Codex's adapter advertises: a model and reasoning effort as config options, and modes.
 * `extra` adds options outside those categories, as agents such as omp advertise.
 */
async function advertise(agentId: string, extra = 0): Promise<void> {
  await startAgentSessionControls(
    agentId,
    {
      configOptions: [
        ...Array.from({ length: extra }, (_, index) => ({
          type: 'select' as const,
          id: `option-${index}`,
          name: `Option ${index + 1}`,
          category: 'other',
          currentValue: 'on',
          options: [
            { value: 'on', name: 'On' },
            { value: 'off', name: 'Off' }
          ]
        })),
        {
          type: 'select',
          id: 'model',
          name: 'Model',
          category: 'model',
          currentValue: 'gpt-5-codex',
          options: [
            { value: 'gpt-5-codex', name: 'GPT-5 Codex' },
            { value: 'gpt-5', name: 'GPT-5' }
          ]
        },
        {
          type: 'select',
          id: 'reasoning_effort',
          name: 'Reasoning',
          category: 'thought_level',
          currentValue: 'medium',
          options: [
            { value: 'low', name: 'Low' },
            { value: 'medium', name: 'Medium' },
            { value: 'high', name: 'High' }
          ]
        }
      ],
      modes: {
        currentModeId: 'read-only',
        availableModes: [
          { id: 'read-only', name: 'Read only' },
          { id: 'auto', name: 'Auto' },
          { id: 'full-access', name: 'Full access' }
        ]
      }
    },
    async () => null
  )
}

const ON_OFF = [
  { value: 'on', name: 'On' },
  { value: 'off', name: 'Off' }
]

/**
 * What Claude Code's adapter advertises beyond the model, effort, and mode: the main thread's
 * agent persona, Fast mode, and Ultracode, each with an icon for what it sets.
 */
async function advertiseClaude(agentId: string): Promise<void> {
  await startAgentSessionControls(
    agentId,
    {
      configOptions: [
        {
          type: 'select',
          id: 'model',
          name: 'Model',
          category: 'model',
          currentValue: 'opus',
          options: [
            { value: 'opus', name: 'Opus' },
            { value: 'sonnet', name: 'Sonnet' }
          ]
        },
        {
          type: 'select',
          id: 'fast',
          name: 'Fast mode',
          description: 'Faster responses on supported models',
          category: 'model_config',
          currentValue: 'off',
          options: ON_OFF
        },
        {
          type: 'select',
          id: 'ultracode',
          name: 'Ultracode',
          description: 'Dynamic workflows on every task, at any effort level',
          category: 'model_config',
          currentValue: 'off',
          options: ON_OFF
        },
        {
          type: 'select',
          id: 'agent',
          name: 'Agent',
          description: 'Main-thread agent persona',
          currentValue: 'default',
          options: [
            { value: 'default', name: 'Default' },
            { value: 'reviewer', name: 'reviewer' }
          ]
        }
      ]
    },
    async () => null
  )
}

const meta = {
  title: 'App/Chat/Agent Session Controls',
  args: { agentId: 'story-codex', agent: 'Codex', onError: fn() },
  loaders: [({ args }) => advertise(args.agentId)],
  parameters: {
    docs: {
      description: {
        component:
          'The model, reasoning effort, and mode a coding agent advertised for its sessions, beside the model in the composer. A choice applies to the running session and to every later one.'
      }
    }
  },
  render: (args) => ({
    components: { ChatAgentSessionControls },
    setup: () => ({ args }),
    template:
      '<div class="@container flex w-96 items-center rounded-card border border-border bg-panel p-2"><ChatAgentSessionControls v-bind="args" /></div>'
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

export const Codex: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('combobox', { name: 'Model: GPT-5 Codex' })).toBeVisible()
    await expect(canvas.getByRole('combobox', { name: 'Reasoning effort: Medium' })).toBeVisible()
    await userEvent.click(canvas.getByRole('combobox', { name: 'Mode: Read only' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Auto' }))
    const mode = await canvas.findByRole('combobox', { name: 'Mode: Auto' })
    // Choices are kept for the agent's next sessions, so the story leaves the one it started with.
    await userEvent.click(mode)
    await userEvent.click(await screen.findByRole('option', { name: 'Read only' }))
    await expect(await canvas.findByRole('combobox', { name: 'Mode: Read only' })).toBeVisible()
  }
}

/** In a narrow composer reasoning and mode keep only their icon; the tooltip names the value. */
export const Narrow: Story = {
  args: { agentId: 'story-codex-narrow' },
  render: (args) => ({
    components: { ChatAgentSessionControls },
    setup: () => ({ args }),
    template:
      '<div class="@container flex w-56 items-center rounded-card border border-border bg-panel p-2"><ChatAgentSessionControls v-bind="args" /></div>'
  })
}

/** Squeezed beside the model picker in a narrow chat: each control keeps its icon, none overlap. */
export const Cramped: Story = {
  args: { agentId: 'story-codex-cramped' },
  render: (args) => ({
    components: { ChatAgentSessionControls },
    setup: () => ({ args }),
    template:
      '<div class="@container flex w-28 items-center rounded-card border border-border bg-panel p-2"><ChatAgentSessionControls v-bind="args" /></div>'
  })
}

/** Two rectangles that share any area. */
function overlaps(a: DOMRect, b: DOMRect): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom
}

/**
 * In the composer of a chat narrowed beside the canvas, the controls of an agent that advertises
 * five never run into each other or into the composer's settings and send buttons.
 */
export const InNarrowComposer: Story = {
  args: { agentId: 'story-omp-composer' },
  loaders: [({ args }) => advertise(args.agentId, 2)],
  render: (args) => ({
    components: {
      ChatAgentSessionControls,
      ChatComposer,
      IconButton,
      IconCompass,
      IconMousePointer,
      IconPaperclip,
      IconSparkles,
      TooltipProvider
    },
    setup: () => ({ args, ui: chatInputTheme() }),
    template: `
      <TooltipProvider>
        <div v-for="width in [240, 300, 360, 420, 520, 640, 840]" :key="width" :style="{ width: width + 'px' }" class="bg-panel" data-test-id="narrow-composer">
          <ChatComposer status="ready" :prompts="[]">
            <template #leading>
              <IconButton label="Mention selection" size="sm"><IconMousePointer class="size-4" /></IconButton>
              <IconButton label="Attach files" size="sm"><IconPaperclip class="size-4" /></IconButton>
              <IconButton label="Use a skill" size="sm"><IconSparkles class="size-4" /></IconButton>
              <IconButton label="Explore" size="sm"><IconCompass class="size-4" /></IconButton>
            </template>
            <template #model>
              <div :class="ui.model()">
                <button type="button" class="flex min-w-0 items-center gap-1 px-1.5 text-[11px] text-muted"><span class="min-w-0 truncate">omp</span></button>
                <ChatAgentSessionControls v-bind="args" />
              </div>
            </template>
          </ChatComposer>
        </div>
      </TooltipProvider>`
  }),
  play: async ({ canvasElement }) => {
    const composers = within(canvasElement).getAllByTestId('narrow-composer')
    for (const composer of composers) {
      const triggers = await waitFor(async () => {
        const found = within(composer).getAllByRole('combobox')
        await expect(found).toHaveLength(5)
        return found
      })
      const actions = [
        ...composer.querySelectorAll<HTMLElement>(
          '[data-test-id="provider-settings-trigger"], button[type="submit"]'
        )
      ]
      await expect(actions).toHaveLength(2)
      const width = composer.style.width
      const boxes = triggers.map((trigger) => trigger.getBoundingClientRect())
      for (const [index, box] of boxes.entries()) {
        for (const other of boxes.slice(index + 1)) {
          await expect(overlaps(box, other), `controls overlap at ${width}`).toBe(false)
        }
        for (const action of actions) {
          await expect(
            overlaps(box, action.getBoundingClientRect()),
            `a control covers ${action.getAttribute('aria-label') ?? 'an action'} at ${width}`
          ).toBe(false)
        }
      }
    }
  }
}

/** Claude Code's agent persona, Fast mode, and Ultracode, each named by its own icon and label. */
export const ClaudeCode: Story = {
  args: { agentId: 'story-claude-code', agent: 'Claude Code' },
  loaders: [({ args }) => advertiseClaude(args.agentId)],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    for (const name of ['Agent: Default', 'Fast mode: Off', 'Ultracode: Off']) {
      await expect(canvas.getByRole('combobox', { name })).toBeVisible()
    }
  }
}

/** The same controls in a narrow composer, where only their icons tell them apart. */
export const ClaudeCodeNarrow: Story = {
  args: { agentId: 'story-claude-code-narrow', agent: 'Claude Code' },
  loaders: [({ args }) => advertiseClaude(args.agentId)],
  render: Narrow.render
}
