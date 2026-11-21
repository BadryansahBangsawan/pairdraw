import { describe, expect, test } from 'bun:test'

import * as v from 'valibot'

import { createBrowserRPCBridge, timeoutMessage } from '#mcp/browser-rpc'

const sentMessageSchema = v.object({
  type: v.optional(v.string()),
  id: v.optional(v.string())
})

describe('the browser RPC timeout', () => {
  test('says a long read may still be running, not that it edited the document', () => {
    const message = timeoutMessage(false, true, 135_000)
    expect(message).toContain('the call may still be running')
    expect(message).not.toContain('edit may still be applied')
  })

  test('keeps the edit warning for a write', () => {
    expect(timeoutMessage(true, true, 120_000)).toContain('the edit may still be applied')
  })

  test('cancels an in-flight call on the app and rejects its promise', async () => {
    const messages: v.InferOutput<typeof sentMessageSchema>[] = []
    const socket = {
      readyState: 1,
      OPEN: 1,
      send: (text: string) => {
        const parsed = v.safeParse(v.pipe(v.string(), v.parseJson(), sentMessageSchema), text)
        if (parsed.success) messages.push(parsed.output)
      },
      close: () => undefined
    }
    const bridge = createBrowserRPCBridge({ authToken: null, onConnectionChange: () => undefined })
    try {
      bridge.handleConnection(socket as never)
      bridge.handleMessage(
        JSON.stringify({ type: 'register', token: null, window: 'test' }),
        socket as never
      )
      const controller = new AbortController()
      const call = bridge.sendRPC(
        { command: 'tool', args: { name: 'export_video', args: {} } },
        controller.signal
      )
      const request = messages.find((message) => message.type === 'request')
      expect(request).toBeDefined()

      controller.abort()

      await expect(call).rejects.toMatchObject({ name: 'AbortError' })
      expect(messages.find((message) => message.type === 'cancel')).toEqual({
        type: 'cancel',
        id: request?.id
      })
    } finally {
      bridge.close()
    }
  })
})
