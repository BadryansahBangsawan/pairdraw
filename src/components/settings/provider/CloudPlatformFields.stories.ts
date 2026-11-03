import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { expect, userEvent, within } from 'storybook/test'
import { ref } from 'vue'

import type { AIModelProfileDraft } from '@/app/ai/models'
import { bedrockBaseURL } from '@/app/ai/providers/bedrock/endpoint'
import { vertexBaseURL } from '@/app/ai/providers/vertex/endpoint'

import BedrockConnectionFields from './BedrockConnectionFields.vue'
import VertexConnectionFields from './VertexConnectionFields.vue'

type Args = {
  draft: AIModelProfileDraft
  saved: boolean
  error: string
  projectError: string
  desktop: boolean
}

function draft(
  providerID: 'amazon-bedrock' | 'google-vertex',
  modelID: string,
  customBaseURL: string
): AIModelProfileDraft {
  return {
    profileId: null,
    sourceConnectionId: null,
    name: '',
    providerID,
    modelID,
    customModelID: '',
    customBaseURL,
    customAPIType: 'completions',
    maxOutputTokens: 16384,
    thinkingLevel: 'default',
    harnessPermissionMode: 'allow-reads',
    capabilities: ['tools', 'vision']
  }
}

const bedrock = draft('amazon-bedrock', 'anthropic.claude-sonnet-5-5', bedrockBaseURL('eu-west-1'))
const vertexClaude = draft('google-vertex', 'claude-sonnet-5-5', '')
const vertexProject = draft(
  'google-vertex',
  'claude-sonnet-5-5',
  vertexBaseURL({ project: 'design-team', location: 'us' })
)

const meta = {
  title: 'App/Settings/Models/Cloud Platform Fields',
  args: { draft: bedrock, saved: false, error: '', projectError: '', desktop: true },
  render: (args) => ({
    components: { BedrockConnectionFields, VertexConnectionFields },
    setup: () => ({
      args,
      baseURL: ref(args.draft.customBaseURL),
      credential: ref(''),
      project: ref('')
    }),
    template: `<div class="flex max-w-lg flex-col gap-6 bg-panel p-4">
      <BedrockConnectionFields
        v-if="args.draft.providerID === 'amazon-bedrock'"
        v-model:base-url="baseURL"
        v-model:credential="credential"
        :draft="args.draft"
        :saved="args.saved"
        :error="args.error || undefined"
        :desktop="args.desktop"
        key-placeholder="ABSK… / bedrock-api-key-…"
        key-u-r-l="https://console.aws.amazon.com/bedrock/home#/api-keys"
      />
      <VertexConnectionFields
        v-else
        v-model:base-url="baseURL"
        v-model:credential="credential"
        v-model:project="project"
        :draft="args.draft"
        :saved="args.saved"
        :error="args.error || undefined"
        :project-error="args.projectError || undefined"
        key-placeholder="ya29.… / AIza…"
        key-u-r-l="https://console.cloud.google.com/vertex-ai"
      />
      <output class="font-mono text-[11px] text-muted" data-test-id="base-url">{{ baseURL }}</output>
    </div>`
  })
} satisfies Meta<Args>
export default meta
type Story = StoryObj<typeof meta>

export const BedrockAPIKey: Story = {}
export const BedrockSavedKey: Story = { args: { saved: true } }
export const BedrockMissingCredential: Story = { args: { error: 'This field is required.' } }
export const BedrockInBrowser: Story = { args: { desktop: false } }
export const BedrockAccessKeys: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByText('AWS access keys'))
    await expect(canvas.getByLabelText(/Secret access key/)).toBeVisible()
    await expect(canvas.getByLabelText(/Session token/)).toBeVisible()
  }
}
export const VertexExpressMode: Story = { args: { draft: vertexClaude } }
export const VertexProject: Story = { args: { draft: vertexProject, saved: true } }
export const VertexClaudeNeedsProject: Story = {
  args: { draft: vertexClaude, projectError: 'Claude models on Vertex AI need a project ID.' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('alert')).toHaveTextContent('need a project ID')
    // Without a project there is no location to choose: express mode picks it.
    await expect(canvas.getByLabelText('Location')).toBeDisabled()
  }
}
export const VertexInvalidProject: Story = {
  args: {
    draft: vertexClaude,
    projectError: 'Enter a project ID with lowercase letters, digits, and hyphens.'
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText(/Project ID/), 'My Project')
    await expect(canvas.getByRole('alert')).toBeVisible()
    await expect(canvas.getByTestId('base-url')).toHaveTextContent(
      'https://aiplatform.googleapis.com/v1'
    )
  }
}
export const VertexClaudeWithAPIKey: Story = {
  args: {
    draft: vertexProject,
    error: 'Claude on Vertex AI needs an access token. An API key reaches Gemini models only.'
  }
}
