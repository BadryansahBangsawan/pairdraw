import * as v from 'valibot'

/** Messages the webview sends the extension: the editor's state, not its content. */
export const webviewMessageSchema = v.variant('type', [
  v.object({ type: v.literal('connected') }),
  v.object({ type: v.literal('loaded'), name: v.string() }),
  v.object({ type: v.literal('saved'), id: v.number(), name: v.string(), data: v.string() }),
  v.object({ type: v.literal('editable'), editable: v.boolean() }),
  v.object({ type: v.literal('documentchange') }),
  v.object({ type: v.literal('error'), message: v.string() })
])

export type WebviewMessage = v.InferOutput<typeof webviewMessageSchema>
