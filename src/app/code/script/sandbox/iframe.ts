/**
 * The frame the app runs scripts in: an iframe with an opaque origin under the sandbox CSP. It is
 * loaded on demand, so the pure host in `evaluate.ts` stays importable outside a browser.
 */
import { sandboxDocument } from '@/app/code/sandbox/document'
import type { ScriptFrame } from '@/app/code/script/sandbox/evaluate'
import frameScript from '@/app/code/script/sandbox/frame.ts?script'

export function createIframeFrame(): ScriptFrame {
  const iframe = document.createElement('iframe')
  iframe.hidden = true
  iframe.setAttribute('sandbox', 'allow-scripts')
  iframe.srcdoc = sandboxDocument(frameScript)
  document.body.append(iframe)
  return {
    postMessage: (message) => iframe.contentWindow?.postMessage(message, '*'),
    listen(handler) {
      const onMessage = (event: MessageEvent<unknown>) => {
        // Only this frame may answer, and only from its opaque origin.
        if (event.source !== iframe.contentWindow || event.origin !== 'null') return
        handler(event.data)
      }
      window.addEventListener('message', onMessage)
      return () => window.removeEventListener('message', onMessage)
    },
    dispose: () => iframe.remove()
  }
}
