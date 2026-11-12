import { Buffer } from 'node:buffer'

import * as v from 'valibot'

import { MAX_RESULT_BYTES, fail, ok, resultTooLargeMessage, type MCPResult } from '#mcp/result'
import {
  automationTargetSchema,
  sendCommand,
  splitAutomationTarget,
  withTarget,
  type RPCSender
} from '#mcp/tool/registration'

/**
 * The built-in browser tools. This package only forwards them to the open app. The window, the
 * page, and the canvas stay in the app. None of these is a raw CDP session.
 */

type RegisterBrowserTool = <InputArgs extends v.GenericSchema>(
  name: string,
  toolOptions: { inputSchema: InputArgs },
  handler: (args: v.InferOutput<InputArgs>) => Promise<MCPResult>
) => void

export function registerBrowserTools(register: RegisterBrowserTool, sendRPC: RPCSender): void {
  const browserShotKind = v.pipe(
    v.picklist(['visible', 'full', 'element']),
    v.description('visible is the view, full is the page, element waits for one click')
  )

  register(
    'browser_load_page',
    {
      inputSchema: v.strictObject({
        url: v.pipe(
          v.string(),
          v.description('Address to load in the open browser window. A bare host becomes https.')
        )
      })
    },
    async (args: { url: string }) => {
      try {
        const res = await sendCommand(sendRPC, 'browser_load_page', { url: args.url })
        return ok(res.result ?? {})
      } catch (e) {
        return fail(e)
      }
    }
  )

  register(
    'browser_screenshot',
    { inputSchema: v.strictObject({ kind: browserShotKind }) },
    async (args: { kind: string }) => {
      try {
        const res = await sendCommand(sendRPC, 'browser_screenshot', { kind: args.kind })
        return pngResult(res.result)
      } catch (e) {
        return fail(e)
      }
    }
  )

  register(
    'browser_element',
    { inputSchema: v.strictObject({ ...automationTargetSchema }) },
    async (args) => {
      try {
        const { target } = splitAutomationTarget(args)
        const res = await sendCommand(sendRPC, 'browser_element', target)
        return ok(withTarget({ imported: true }, res))
      } catch (e) {
        return fail(e)
      }
    }
  )

  register(
    'browser_screenshot_to_canvas',
    { inputSchema: v.strictObject({ kind: browserShotKind, ...automationTargetSchema }) },
    async (args: { kind: string; document_id?: string; page_id?: string }) => {
      try {
        const { target } = splitAutomationTarget(args)
        const res = await sendCommand(sendRPC, 'browser_screenshot_to_canvas', {
          ...target,
          kind: args.kind
        })
        return ok(withTarget({ placed: true }, res))
      } catch (e) {
        return fail(e)
      }
    }
  )
}

/** A browser screenshot is an image. Anything else is the same failure the window reports. */
function pngResult(result: unknown): MCPResult {
  if (!isPNGResult(result)) return fail(new Error('The page returned no picture'))
  const bytes = Buffer.byteLength(result.base64, 'utf8')
  if (bytes > MAX_RESULT_BYTES) {
    return fail(
      new Error(
        resultTooLargeMessage(
          'Image from "browser_screenshot"',
          bytes,
          'Screenshot the view, or one element, instead of the whole page.'
        )
      )
    )
  }
  return { content: [{ type: 'image', data: result.base64, mimeType: 'image/png' }] }
}

function isPNGResult(result: unknown): result is { base64: string; mimeType: 'image/png' } {
  if (!result || typeof result !== 'object') return false
  if (!('base64' in result) || !('mimeType' in result)) return false
  return typeof result.base64 === 'string' && result.mimeType === 'image/png'
}
