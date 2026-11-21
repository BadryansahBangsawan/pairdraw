import type { Ref } from 'vue'

import { nodeToXPath } from '@pairdraw/core/xpath'

import { acceptsDocumentPrompts, runPromptInDocument } from '@/app/ai/chat/entry/run'
import { stickyPrompt } from '@/app/ai/chat/entry/sticky'
import { exploreVariationsOf } from '@/app/ai/explore/variations'
import type { EditorStore } from '@/app/editor/active-store'
import {
  pasteClipboardToReplace,
  pasteClipboardToReplaceInInstance
} from '@/app/editor/clipboard/paste/replace'
import { copyLayersAsPNG } from '@/app/editor/clipboard/png'
import {
  copySelectionProperties,
  pasteClipboardProperties
} from '@/app/editor/clipboard/properties'
import { executeClipboardCommand } from '@/app/editor/clipboard/system'
import { copyPendingText, createTextClipboard } from '@/app/editor/clipboard/text'
import {
  canEditImageBackground,
  canGenerateImageFill,
  openImageAIPrompt,
  removeImageBackground
} from '@/app/editor/image-ai'
import { canVectorizeImageNode, vectorizeImageNode } from '@/app/editor/vectorize'
import { notificationMessages } from '@/app/i18n/notifications'
import { toast } from '@/app/shell/ui'

export function createCanvasMenuActions(store: EditorStore, selectedIds: Ref<Set<string>>) {
  const copyText = createTextClipboard()

  function ids() {
    return [...selectedIds.value]
  }

  function execCommand(cmd: 'copy' | 'cut' | 'paste') {
    const { cursorCanvasX: ccx, cursorCanvasY: ccy } = store.state
    const cursorPos = ccx != null && ccy != null ? { x: ccx, y: ccy } : undefined
    void executeClipboardCommand(store, cmd, cursorPos).then((ok) => {
      if (!ok) toast.error(notificationMessages.get().clipboardAccessBlocked)
      return undefined
    })
  }

  async function clipboardWrite(text: string | null, label: string) {
    if (text) await copyText(text, label)
  }

  async function copyNodeId() {
    const nodeIds = ids()
    if (nodeIds.length === 0) return
    const messages = notificationMessages.get()
    await clipboardWrite(
      nodeIds.join(', '),
      nodeIds.length > 1 ? messages.nodeIDs : messages.nodeID
    )
  }

  async function copyXPath() {
    const nodeIds = ids()
    if (nodeIds.length === 0) return
    const xpaths = nodeIds
      .map((id) => nodeToXPath(store.graph, id))
      .filter((xpath): xpath is string => xpath !== null)
    if (xpaths.length === 0) return
    const messages = notificationMessages.get()
    await clipboardWrite(xpaths.join('\n'), xpaths.length > 1 ? messages.xPaths : messages.xPath)
  }

  function copyAsPNG() {
    return copyLayersAsPNG(store, ids())
  }

  /**
   * The selection as HTML, which takes a moment to write: the clipboard write starts at once with
   * the markup still on its way, as browsers allow a write only during the click. A failed write
   * is reported from how the markup settles, since the browser can refuse the write before the
   * markup is ready: blocked access when markup came, the render error when it failed, and
   * nothing when the selection draws nothing.
   */
  async function copyAsHTML() {
    const nodeIds = ids()
    if (nodeIds.length === 0) return
    const html = store.copySelectionAsHTML(nodeIds)
    try {
      await copyPendingText(
        html.then((markup) => markup ?? Promise.reject(new Error('Nothing to copy as HTML'))),
        'HTML'
      )
    } catch (error: unknown) {
      const markup = await html.then(
        (value) => ({ value }),
        (renderError: unknown) => ({ renderError })
      )
      const messages = notificationMessages.get()
      if ('renderError' in markup) {
        const { renderError } = markup
        console.warn('Copy as HTML failed', renderError)
        toast.error(
          messages.operationFailed({
            error: renderError instanceof Error ? renderError.message : String(renderError)
          })
        )
      } else if (markup.value) {
        console.warn('Copy as HTML failed', error)
        toast.error(messages.clipboardAccessBlocked)
      }
    }
  }

  /** The prompt the selected sticky notes make, or null; reactive to the selection and scene. */
  function stickyPromptText(): string | null {
    void selectedIds.value
    void store.state.sceneVersion
    if (!acceptsDocumentPrompts(store)) return null
    return stickyPrompt(store.graph, ids())
  }

  async function runStickyPrompt() {
    const text = stickyPromptText()
    if (text) await runPromptInDocument(store, text)
  }

  return {
    ids,
    execCommand,
    pasteToReplace: () => pasteClipboardToReplace(store),
    /** Whether the selection holds a layer the clipboard can replace inside its instance. */
    canReplaceInInstance: () => {
      void selectedIds.value
      void store.state.sceneVersion
      return store.replaceableInstanceLayers(ids()).length > 0
    },
    replaceInInstance: () => pasteClipboardToReplaceInInstance(store),
    copyProperties: () => copySelectionProperties(store),
    pasteProperties: () => pasteClipboardProperties(store),
    clipboardWrite,
    copyNodeId,
    copyXPath,
    copyAsPNG,
    copyAsHTML,
    /** Whether the selection is one layer the chat can make versions of, beside it. */
    canExploreVariations: () => {
      void store.state.sceneVersion
      const [id, ...rest] = ids()
      return (
        !!id && rest.length === 0 && acceptsDocumentPrompts(store) && store.canCreateVariations(id)
      )
    },
    exploreVariations: () => {
      const [id] = ids()
      if (id) exploreVariationsOf(store, id)
    },
    canRunStickyPrompt: () => stickyPromptText() !== null,
    runStickyPrompt,
    canVectorizeImage: () => {
      void selectedIds.value
      return canVectorizeImageNode(store)
    },
    vectorizeImage: async () => {
      const nodeId = ids()[0]
      if (nodeId) await vectorizeImageNode(store, nodeId)
    },
    canEditImageBackground: () => {
      void selectedIds.value
      return canEditImageBackground(store)
    },
    canGenerateImageFill: () => {
      void selectedIds.value
      return canGenerateImageFill(store)
    },
    removeImageBackground: async () => {
      const nodeId = ids()[0]
      if (nodeId) await removeImageBackground(store, nodeId)
    },
    replaceImageBackground: () => openImageAIPrompt(store, 'replace-background'),
    generateImageFill: () => openImageAIPrompt(store, 'generate-fill')
  }
}
