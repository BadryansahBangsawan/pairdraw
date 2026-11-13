/**
 * A sandbox frame for the app: an iframe with an opaque origin under the sandbox CSP, running the
 * frame script it is given. It is loaded on demand, so the pure hosts in `evaluate.ts` stay
 * importable outside a browser.
 */
import { sandboxDocument } from '@/app/code/sandbox/document'
import type { SandboxFrame } from '@/app/runtime/sandbox-frame'

export function createIframeFrame(frameScript: string): SandboxFrame {
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
