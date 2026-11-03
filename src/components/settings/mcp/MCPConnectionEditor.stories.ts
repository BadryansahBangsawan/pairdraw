import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'

import type { MCPConnectionDraft } from '@/app/integrations/mcp'
import type { MCPConnectionTestResult } from '@/app/integrations/mcp/client/test'
import type { MCPSignInStatus, MCPTestStatus } from '@/app/integrations/mcp/settings/access'
import type { CredentialStatus } from '@/app/settings/credentials/types'

import MCPConnectionEditor from './MCPConnectionEditor.vue'

type Args = {
  draft: MCPConnectionDraft
  tokenStatus: CredentialStatus
  envStatus: CredentialStatus
  busy: boolean
  error: string
  desktop: boolean
  signedIn: boolean
  signInStatus: MCPSignInStatus
  canSignIn: boolean
  canTest: boolean
  testStatus: MCPTestStatus
  testResult: MCPConnectionTestResult | null
}
const emptyDraft: MCPConnectionDraft = {
  id: null,
  name: '',
  enabled: false,
  transportType: 'streamable-http',
  url: '',
  command: '',
  args: '',
  authenticationType: 'none'
}
const savedDraft: MCPConnectionDraft = {
  ...emptyDraft,
  id: 'mcp-story',
  name: 'Design library',
  url: 'https://example.com/mcp',
  enabled: true,
  authenticationType: 'bearer'
}
const oauthDraft: MCPConnectionDraft = {
  ...savedDraft,
  name: 'Notion',
  url: 'https://mcp.notion.com/mcp',
  authenticationType: 'oauth'
}
const localDraft: MCPConnectionDraft = {
  ...emptyDraft,
  id: 'mcp-local',
  name: 'Filesystem',
  enabled: true,
  transportType: 'stdio',
  command: 'npx',
  args: '-y\n@modelcontextprotocol/server-filesystem\n/Users/me/Designs'
}
const meta = {
  title: 'App/Settings/MCP/Connection Editor',
  args: {
    draft: emptyDraft,
    tokenStatus: 'missing',
    envStatus: 'missing',
    busy: false,
    error: '',
    desktop: true,
    signedIn: false,
    signInStatus: 'idle',
    canSignIn: true,
    canTest: true,
    testStatus: 'idle',
    testResult: null
  },
  render: (args) => ({
    components: { MCPConnectionEditor },
    setup: () => ({ args, draft: ref({ ...args.draft }), token: ref(''), env: ref('') }),
    template: `<div class="max-w-lg bg-panel p-4">
      <MCPConnectionEditor
        v-model:draft="draft"
        v-model:token="token"
        v-model:env="env"
        :token-status="args.tokenStatus"
        :env-status="args.envStatus"
        :busy="args.busy"
        :error="args.error"
        :desktop="args.desktop"
        :signed-in="args.signedIn"
        :sign-in-status="args.signInStatus"
        :can-sign-in="args.canSignIn"
        :can-test="args.canTest"
        :test-status="args.testStatus"
        :test-result="args.testResult"
      />
    </div>`
  })
} satisfies Meta<Args>
export default meta
type Story = StoryObj<typeof meta>
export const Create: Story = {}
export const Edit: Story = { args: { draft: savedDraft, tokenStatus: 'configured' } }
export const MissingCredential: Story = { args: { draft: savedDraft } }
export const Saving: Story = { args: { draft: savedDraft, tokenStatus: 'configured', busy: true } }
export const CredentialFailure: Story = {
  args: { draft: savedDraft, error: 'The credential store is locked. Unlock it and try again.' }
}
export const LocalCommand: Story = { args: { draft: localDraft, envStatus: 'configured' } }
export const LocalCommandInBrowser: Story = { args: { draft: emptyDraft, desktop: false } }
export const OAuthSignedOut: Story = { args: { draft: oauthDraft } }
export const OAuthUnsaved: Story = { args: { draft: oauthDraft, canSignIn: false, canTest: false } }
export const OAuthWaiting: Story = { args: { draft: oauthDraft, signInStatus: 'waiting' } }
export const OAuthSignedIn: Story = { args: { draft: oauthDraft, signedIn: true } }
export const OAuthFailed: Story = { args: { draft: oauthDraft, signInStatus: 'failed' } }
export const TestSucceeded: Story = {
  args: {
    draft: oauthDraft,
    signedIn: true,
    testStatus: 'done',
    testResult: { ok: true, tools: 12 }
  }
}
export const TestNeedsSignIn: Story = {
  args: { draft: oauthDraft, testStatus: 'done', testResult: { ok: false, reason: 'sign-in' } }
}
