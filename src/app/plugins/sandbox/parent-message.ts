/**
 * What the host may send the sandbox frame. The frame ignores every other message, including one
 * from a different window, so only the parent page can start a run or answer a call.
 */
import * as v from 'valibot'

import { pluginHostMessageSchema } from '@/app/plugins/sandbox/schema'

export function readPluginHostMessage(
  data: unknown,
  source: unknown,
  parentWindow: object | null
): v.InferOutput<typeof pluginHostMessageSchema> | null {
  if (parentWindow === null || source !== parentWindow) return null
  const parsed = v.safeParse(pluginHostMessageSchema, data)
  return parsed.success ? parsed.output : null
}
