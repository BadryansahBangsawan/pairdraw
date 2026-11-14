import { svgToVectorPaths, vectorizableImageFill } from '@pairdraw/core/vector'

import type { EditorStore } from '@/app/editor/active-store'
import { notificationMessages } from '@/app/i18n/notifications'
import { openSettingsDialog } from '@/app/settings/dialog'
import { toast } from '@/app/shell/ui'

import { requestVectorSVG, selectedVectorizeProvider } from './request'
import { VectorizeAuthError } from './types'

const activeStores = new WeakSet<EditorStore>()
const ERROR_MAX_LENGTH = 240

/** Whether the selection is one layer showing an image, of any kind, and none is converting. */
export function canVectorizeImageNode(store: EditorStore): boolean {
  if (store.state.selectedIds.size !== 1 || activeStores.has(store)) return false
  const nodeId = store.state.selectedIds.values().next().value
  if (!nodeId) return false
  const node = store.graph.getNode(nodeId)
  return Boolean(node && vectorizableImageFill(node))
}

function vectorizeErrorMessage(error: unknown): string {
  let message = 'Vectorization failed'
  if (error instanceof TypeError) message = error.message || 'Network request failed'
  else if (error instanceof Error) message = error.message
  return message.length <= ERROR_MAX_LENGTH ? message : `${message.slice(0, ERROR_MAX_LENGTH)}…`
}

/** Converts a layer's image into vector layers beside it, keeping the image, as one undo step. */
export async function vectorizeImageNode(store: EditorStore, nodeId: string): Promise<void> {
  if (activeStores.has(store)) return
  const node = store.graph.getNode(nodeId)
  const fill = node ? vectorizableImageFill(node) : null
  if (!node || !fill) return

  const provider = selectedVectorizeProvider()
  activeStores.add(store)
  try {
    const imageBytes = store.graph.images.get(fill.imageHash)
    if (!imageBytes) {
      toast.error(notificationMessages.get().vectorizeImageMissing)
      return
    }

    const result = await requestVectorSVG(store, provider, imageBytes, () => {
      toast.info(notificationMessages.get().vectorizingImage)
    })
    if (result.status === 'missing-key') {
      toast.error(
        notificationMessages.get().vectorizeCredentialRequired({ provider: provider.name })
      )
      openSettingsDialog('services')
      return
    }

    const currentNode = store.graph.getNode(node.id)
    if (!currentNode || vectorizableImageFill(currentNode)?.imageHash !== fill.imageHash) {
      throw new Error('The image changed before vectorization finished')
    }
    const vectorized = svgToVectorPaths(result.svg, {
      width: currentNode.width,
      height: currentNode.height
    })
    if (!vectorized?.paths.length) throw new Error('The vectorizer returned no editable paths')

    const frameId = store.addVectorFrameBeside(currentNode.id, vectorized)
    if (!frameId) throw new Error('Could not add vector layers beside this image')
    toast.info(notificationMessages.get().imageConvertedToVectors)
  } catch (error) {
    if (error instanceof VectorizeAuthError) {
      toast.error(notificationMessages.get().vectorizeCredentialFailed({ error: error.message }))
      openSettingsDialog('services')
    } else {
      toast.error(
        notificationMessages
          .get()
          .vectorizeFailed({ provider: provider.name, error: vectorizeErrorMessage(error) })
      )
    }
  } finally {
    activeStores.delete(store)
  }
}
