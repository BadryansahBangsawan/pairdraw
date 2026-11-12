import { EmbedClient } from '../embed/client'
import { startWebviewHost } from './host'

interface WebviewAPI {
  postMessage(message: unknown): void
}

declare function acquireVsCodeApi(): WebviewAPI

const vscode = acquireVsCodeApi()
const frameElement = document.querySelector<HTMLIFrameElement>('#editor')

function fail(error: unknown): void {
  vscode.postMessage({
    type: 'error',
    message: error instanceof Error ? error.message : String(error)
  })
}

async function run(frame: HTMLIFrameElement): Promise<void> {
  const editorURL = frame.dataset.editorUrl
  if (!editorURL) throw new Error('The editor URL is missing')
  const url = new URL(editorURL)
  url.searchParams.set('embed', '')
  url.searchParams.set('origin', location.origin)
  url.searchParams.set('allow-edit', '')
  frame.src = url.toString()

  const client = await EmbedClient.connect({
    window,
    frame: frame.contentWindow as Window,
    editorOrigin: url.origin
  })
  const stop = startWebviewHost({
    client,
    transport: {
      post: (message) => vscode.postMessage(message),
      onMessage: (listener) => {
        const handler = (event: MessageEvent): void => listener(event.data)
        window.addEventListener('message', handler)
        return () => window.removeEventListener('message', handler)
      }
    }
  })
  window.addEventListener('unload', () => {
    stop()
    client.close()
  })
  vscode.postMessage({ type: 'connected' })
}

if (!frameElement) fail(new Error('The editor frame is missing'))
else run(frameElement).catch(fail)
