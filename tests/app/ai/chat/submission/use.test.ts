import { describe, expect, mock, spyOn, test } from 'bun:test'

import type { Chat } from '@ai-sdk/vue'
import type { UIMessage } from 'ai'
import { ref, shallowRef } from 'vue'

import { SceneGraph } from '@open-pencil/scene-graph'
import { withAgentNotes } from '@open-pencil/scene-graph/agent-notes'

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

/** A document with one empty page and nothing selected, which a message reads as it is sent. */
function documentDouble(graph = new SceneGraph()): EditorStore {
  return asDouble<EditorStore>({
    graph,
    state: { currentPageId: graph.getPages()[0].id, selectedIds: new Set<string>() }
  })
}

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
    const { chat } = submission(async () => target, documentDouble())
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
    const { chat } = submission(async () => target, documentDouble())
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

describe('canvas notes a message carries', () => {
  const tokens = {
    name: 'tokens.css',
    mediaType: 'text/css',
    text: ':root { --x: 1px; }',
    size: 19
  }
  const explore = { kind: 'variants', count: 3, axis: 'layout' } as const

  /** A page with one layer noted for agents, and a way to change its note. */
  function notedDocument(context: string) {
    const graph = new SceneGraph()
    const pageId = graph.getPages()[0].id
    const node = graph.createNode('FRAME', pageId, { name: 'Pay', width: 200, height: 60 })
    const note = (text: string) =>
      graph.updateNode(node.id, { pluginData: withAgentNotes(node, { context: text }) })
    note(context)
    return { editor: documentDouble(graph), note }
  }

  /** A chat that keeps each text it is sent, as a user message the next request reads. */
  function recordingChat() {
    const target = fakeChat()
    const texts: string[] = []
    target.sendMessage = async (message) => {
      if (!message || !('text' in message) || typeof message.text !== 'string') return
      texts.push(message.text)
      if (message.messageId) return
      const sent: UIMessage = {
        id: `sent-${texts.length}`,
        role: 'user',
        parts: [{ type: 'text', text: message.text }]
      }
      target.messages = [...target.messages, sent]
    }
    return { target, texts }
  }

  const count = (text: string | undefined, part: string) => (text ?? '').split(part).length - 1

  test('an edited message keeps its explore note and files, and reads the notes again', async () => {
    const { editor, note } = notedDocument('Opens the receipt dialog')
    const { target, texts } = recordingChat()
    const { chat } = submission(async () => target, editor)
    expect(await chat.submit({ ...message, explore, files: [tokens] })).toBe(true)
    const sent = target.messages.at(-1)
    if (!sent) throw new Error('Missing sent message')

    note('Opens the payment sheet')
    await chat.resend(sent.id, 'Draw a pricing card')
    expect(texts).toHaveLength(2)
    const edited = texts[1]
    expect(stripModelNotes(edited ?? '')).toBe('Draw a pricing card')
    expect(count(edited, '<explore ')).toBe(1)
    expect(count(edited, ':root { --x: 1px; }')).toBe(1)
    expect(edited).toContain('Opens the payment sheet')
    expect(edited).not.toContain('Opens the receipt dialog')
  })

  test('a later message leaves out notes the model already read, until they change', async () => {
    const { editor, note } = notedDocument('x'.repeat(3000))
    const { target, texts } = recordingChat()
    const { chat } = submission(async () => target, editor)
    await chat.submit(message)
    await chat.submit({ ...message, modelText: 'Again', displayText: 'Again' })
    note('Opens the payment sheet')
    await chat.submit({ ...message, modelText: 'Once more', displayText: 'Once more' })

    expect(texts).toHaveLength(3)
    expect(count(texts[0], '<layer-note ')).toBe(1)
    expect(texts[1]).toBe('Again')
    expect(texts[2]).toContain('Opens the payment sheet')
  })
})

function fakeChat(sendMessage: () => Promise<void> = async () => undefined): Chat<UIMessage> {
  return asDouble<Chat<UIMessage>>({ messages: [], status: 'ready', sendMessage })
}
