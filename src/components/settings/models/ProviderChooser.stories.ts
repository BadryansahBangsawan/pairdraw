import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, fn, userEvent, within } from 'storybook/test'

import {
  modelSettingsSnapshot,
  replaceAIModelSettings,
  type AIModelSettings
} from '@/app/ai/models'

import ProviderChooser from './ProviderChooser.vue'

type Args = { onChoose: (providerID: string) => void }

/** No model is connected, so no row wears the "set up" badge. */
const noModels: AIModelSettings = {
  version: 1,
  connections: [],
  models: [],
  assignments: { design: 'model-default', review: 'design', fast: 'design', vision: null }
}

const meta = {
  title: 'App/Settings/Models/Provider Chooser',
  args: { onChoose: fn() },
  beforeEach: () => {
    const previous = modelSettingsSnapshot()
    replaceAIModelSettings(noModels)
    return () => replaceAIModelSettings(previous)
  },
  render: (args) => ({
    components: { ProviderChooser },
    setup: () => ({ args }),
    template: '<ProviderChooser @choose="args.onChoose" />'
  })
} satisfies Meta<Args>

export default meta
type Story = StoryObj<typeof meta>

const chooser = () => within(document.body).getByTestId('settings-model-provider-chooser')

function namedButton(name: string): RegExp {
  return new RegExp(`^${name}$`)
}

function button(root: HTMLElement, name: string) {
  return within(root).getByRole('button', { name: namedButton(name) })
}

/**
 * Storybook is the web app, not the desktop app. Pi, ChatGPT sign-in, and the API accounts whose
 * endpoints send no CORS headers are left off the list. The other agents, API accounts, cloud
 * platforms, and servers stay.
 */
export const OutsideDesktop: Story = {
  play: async () => {
    const root = chooser()
    for (const name of [
      'Claude Code',
      'Codex',
      'Gemini CLI',
      'Anthropic',
      'xAI',
      'Amazon Bedrock',
      'Google Vertex AI',
      'Anthropic-compatible'
    ]) {
      await expect(button(root, name)).toBeVisible()
    }
    // The server row's description is part of its accessible name.
    await expect(within(root).getByRole('button', { name: /^OpenAI-compatible\b/ })).toBeVisible()
    for (const name of ['Pi', 'ChatGPT', 'Kimi For Coding', 'OpenCode Zen', 'OpenCode Go']) {
      await expect(within(root).queryByRole('button', { name: namedButton(name) })).toBeNull()
    }
  }
}

/** Choosing a row tells the editor which provider to add. */
export const ChoosesAProvider: Story = {
  play: async ({ args }) => {
    await userEvent.click(button(chooser(), 'Claude Code'))
    await expect(args.onChoose).toHaveBeenCalledWith('acp:claude-code')
  }
}
