import { describe, expect, mock, spyOn, test } from 'bun:test'

import type { Chat } from '@ai-sdk/vue'
import type { UIMessage } from 'ai'
import { ref, shallowRef } from 'vue'

import { SceneGraph } from '@open-pencil/scene-graph'

import { AgentSetupError } from '@/app/ai/agents/setup/readiness'
import { attachmentsForMessage } from '@/app/ai/attachment/presentation/store'
import { stripModelNotes } from '@/app/ai/chat/context'
import { useChatSubmission } from '@/app/ai/chat/submission/use'
import type { EditorStore } from '@/app/editor/active-store'

import { asDouble } from '#tests/helpers/doubles'

const messages = ref({
  openSettings: 'Open settings',
  requestFailed: 'Request failed',
  visionUnavailable: 'Vision unavailable',
  cloudUnavailable: 'Cloud AI unavailable',
  runSetup: 'Run guided setup',
  agentSetup: {
    'companion-missing': 'Companion missing',
    'companion-outdated': 'Companion outdated',
    'mcp-outdated': 'MCP outdated',
    'pi-sign-in': 'Pi sign-in',
    'pi-model': 'Pi model'
  }
})

function submission(
  ensureChat: () => Promise<Chat<UIMessage> | null>,
  editor: EditorStore = asDouble<EditorStore>({})
) {
  const reportError = mock(() => undefined)
  const openSetup = mock(() => undefined)
  const chat = useChatSubmission({
    chat: shallowRef<Chat<UIMessage> | null>(null),
    ensureChat,
    clearFailure: () => undefined,
    getEditor: () => editor,
    messages,
    reportError,
    openModelSettings: () => undefined,
    openSetup
  })
  return { chat, reportError, openSetup }
}

const message = { modelText: 'Draw a card', displayText: 'Draw a card', images: [], nodes: [] }

describe('useChatSubmission', () => {
  test('reports an unsent message so the composer can keep it', async () => {
    const { chat } = submission(async () => null)
    expect(await chat.submit(message)).toBe(false)
  })

  test('names the setup problem that stopped an agent chat and offers guided setup', async () => {
    const { chat, reportError, openSetup } = submission(async () => {
      throw new AgentSetupError('mcp-outdated')
    })
    expect(await chat.submit(message)).toBe(false)
    expect(reportError).toHaveBeenCalledWith('MCP outdated', {
      label: 'Run guided setup',
      run: openSetup
    })
  })

  test('keeps the previews of an unsent message for the composer to take back', async () => {
    const revoke = spyOn(URL, 'revokeObjectURL')
    try {
      const { chat } = submission(async () => null)
      const image = { file: new File(['png'], 'card.png'), previewURL: 'blob:card' }
      expect(await chat.submit({ ...message, images: [image] })).toBe(false)
      expect(revoke).not.toHaveBeenCalled()
    } finally {
      revoke.mockRestore()
    }
  })

  test('hands back a message that failed before reaching the chat', async () => {
    const target = fakeChat()
    const { chat } = submission(async () => target)
    // The editor stand-in cannot snapshot the referenced layer, which fails before sending.
    const node = { id: '1:2', name: 'Card', type: 'FRAME' as const }
    expect(await chat.submit({ ...message, nodes: [node] })).toBe(false)
    expect(target.messages).toEqual([])
  })

  test('takes back a message whose images could not be prepared', async () => {
    const revoke = spyOn(URL, 'revokeObjectURL')
    try {
      const target = fakeChat()
      const { chat } = submission(async () => target)
      const image = { file: new File(['not an image'], 'card.png'), previewURL: 'blob:card' }
      expect(await chat.submit({ ...message, images: [image] })).toBe(false)
      expect(target.messages).toEqual([])
      expect(revoke).not.toHaveBeenCalled()
    } finally {
      revoke.mockRestore()
    }
  })
})

describe('text files attached to a message', () => {
  const tokens = {
    name: 'tokens.css',
    mediaType: 'text/css',
    text: ':root { --brand: red; }',
    size: 23
  }

  function sentTexts(target: Chat<UIMessage>) {
    const texts: string[] = []
    target.sendMessage = async (message) => {
      if (message && 'text' in message && typeof message.text === 'string') {
        texts.push(message.text)
      }
    }
    return texts
  }

  test('the model reads the files, and the transcript lists them beside the text', async () => {
    const target = fakeChat()
    const texts = sentTexts(target)
    const { chat } = submission(
      async () => target,
      asDouble<EditorStore>({ graph: new SceneGraph() })
    )
    expect(await chat.submit({ ...message, files: [tokens] })).toBe(true)

    expect(texts).toHaveLength(1)
    expect(texts[0]).toContain(':root { --brand: red; }')
    expect(stripModelNotes(texts[0] ?? '')).toBe('Draw a card')
    const sent = target.messages.at(-1)
    expect(sent?.role).toBe('user')
    const listed = attachmentsForMessage(sent?.id ?? '').value
    expect(listed.map((attachment) => [attachment.kind, attachment.name])).toEqual([
      ['file', 'tokens.css']
    ])
  })

  test('an edited message is sent again with the files it had', async () => {
    const target = fakeChat()
    const texts = sentTexts(target)
    const { chat } = submission(
      async () => target,
      asDouble<EditorStore>({ graph: new SceneGraph() })
    )
    await chat.submit({ ...message, files: [tokens] })
    const sent = target.messages.at(-1)
    if (!sent) throw new Error('Missing sent message')

    await chat.resend(sent.id, 'Draw a pricing card')
    expect(texts).toHaveLength(2)
    expect(stripModelNotes(texts[1] ?? '')).toBe('Draw a pricing card')
    expect(texts[1]).toContain(':root { --brand: red; }')
    expect(attachmentsForMessage(sent.id).value.map((attachment) => attachment.name)).toEqual([
      'tokens.css'
    ])
  })
})

function fakeChat(sendMessage: () => Promise<void> = async () => undefined): Chat<UIMessage> {
  return asDouble<Chat<UIMessage>>({ messages: [], status: 'ready', sendMessage })
}
