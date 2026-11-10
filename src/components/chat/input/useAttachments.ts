import { useFileDialog } from '@vueuse/core'
import { partition } from 'es-toolkit/array'
import { computed, onBeforeUnmount, ref, type Ref } from 'vue'

import type { Editor } from '@open-pencil/core'
import { isSVGFile } from '@open-pencil/scene-graph/images'

import { isAttachableFile } from '@/app/ai/attachment/accept'
import {
  createImagePreviewURL,
  isAttachableImageFile,
  rasterizeSVGAttachment,
  revokeImagePreviewURL,
  validateImageAttachmentFile
} from '@/app/ai/attachment/image/prepare'
import { MAX_IMAGE_ATTACHMENTS, type ImageAttachmentDraft } from '@/app/ai/attachment/image/types'
import { readTextAttachment, TEXT_ATTACHMENT_ACCEPT } from '@/app/ai/attachment/text/prepare'
import {
  MAX_TEXT_ATTACHMENTS,
  type TextAttachmentDraft,
  type TextAttachmentRefusal
} from '@/app/ai/attachment/text/types'
import { resolveReferencedNodes } from '@/app/ai/chat/context'
import { referenceLink } from '@/app/ai/chat/references/link'
import { mentionedNodes } from '@/app/ai/chat/references/nodes'
import type { ChatSubmission } from '@/app/ai/chat/submission/types'

interface AttachmentDraftOptions {
  editor: Editor
  selectedIds: Ref<Set<string>>
  reportError: (message: string) => void
  /** Why a text file did not attach, in the person's language. */
  describeFileRefusal: (name: string, refusal: TextAttachmentRefusal | 'limit') => string
  /** Why more images cannot be attached, in the person's language. */
  describeImageLimit: (count: number) => string
}

export function useAttachmentDrafts(options: AttachmentDraftOptions) {
  /** Advances when a message is sent or the draft is cleared, so late images skip it. */
  let draftGeneration = 0
  const images = ref<ImageAttachmentDraft[]>([])
  const files = ref<TextAttachmentDraft[]>([])
  const canMentionSelection = computed(() => options.selectedIds.value.size > 0)
  /** Neither images nor text files fit in the message any more. */
  const full = computed(
    () => images.value.length >= MAX_IMAGE_ATTACHMENTS && files.value.length >= MAX_TEXT_ATTACHMENTS
  )
  const {
    open: openFileDialog,
    reset: resetFileDialog,
    onChange: onFileChange
  } = useFileDialog({
    accept: `image/png,image/jpeg,image/webp,image/svg+xml,${TEXT_ATTACHMENT_ACCEPT}`,
    multiple: true,
    reset: true
  })

  /** Attaches files chosen, pasted, or dropped: images as images, the rest as text. */
  async function addFiles(chosen: File[]): Promise<void> {
    const [imageFiles, textFiles] = partition(chosen, isAttachableImageFile)
    // Both start now, so both belong to the draft the files were added to.
    await Promise.all([addTextFiles(textFiles), addImages(imageFiles)])
  }

  /** Reads text files into the message, up to the limit; each that cannot attach says why. */
  async function addTextFiles(chosen: File[]): Promise<void> {
    const draft = draftGeneration
    for (const file of chosen) {
      if (files.value.length >= MAX_TEXT_ATTACHMENTS) {
        options.reportError(options.describeFileRefusal(file.name, 'limit'))
        break
      }
      const read = await readTextAttachment(file)
      // The message was sent or cleared while the file was read: it belongs to no draft now.
      if (draft !== draftGeneration) return
      if ('refusal' in read) {
        options.reportError(options.describeFileRefusal(file.name, read.refusal))
        continue
      }
      // Checked after the await, since another drop may have filled the slots meanwhile.
      if (files.value.length >= MAX_TEXT_ATTACHMENTS) {
        options.reportError(options.describeFileRefusal(file.name, 'limit'))
        break
      }
      files.value.push(read.draft)
    }
  }

  function removeFile(index: number): void {
    files.value.splice(index, 1)
  }

  /**
   * Attaches images, up to the limit: SVGs are drawn as PNGs first, and each file that cannot be
   * attached says why.
   */
  async function addImages(chosen: File[]): Promise<void> {
    if (chosen.length === 0) {
      resetFileDialog()
      return
    }
    const draft = draftGeneration
    if (images.value.length >= MAX_IMAGE_ATTACHMENTS) {
      options.reportError(options.describeImageLimit(MAX_IMAGE_ATTACHMENTS))
      resetFileDialog()
      return
    }
    for (const file of chosen) {
      try {
        const image = isSVGFile(file) ? await rasterizeSVGAttachment(file) : file
        // The message was sent or cleared while the SVG was drawn: it belongs to no draft now.
        if (draft !== draftGeneration) return
        // Checked after the await, since another drop may have filled the slots meanwhile.
        if (images.value.length >= MAX_IMAGE_ATTACHMENTS) {
          options.reportError(options.describeImageLimit(MAX_IMAGE_ATTACHMENTS))
          break
        }
        const validationError = validateImageAttachmentFile(image)
        if (validationError) {
          options.reportError(validationError)
          continue
        }
        images.value.push({ file: image, previewURL: createImagePreviewURL(image) })
      } catch (error) {
        options.reportError(error instanceof Error ? error.message : String(error))
      }
    }
    resetFileDialog()
  }

  function removeImage(index: number): void {
    revokeImagePreviewURL(images.value[index].previewURL)
    images.value.splice(index, 1)
    resetFileDialog()
  }

  /** The selected layers as references, to insert into the message where the caret is. */
  function selectionMentions(): string {
    return resolveReferencedNodes(options.editor.graph, [...options.selectedIds.value])
      .map((node) => `${referenceLink({ kind: 'node', id: node.id, label: node.name })} `)
      .join('')
  }

  function handlePaste(event: ClipboardEvent): void {
    const pasted = event.clipboardData?.files
    const attachable = pasted ? [...pasted].filter(isAttachableFile) : []
    if (attachable.length === 0) return
    event.preventDefault()
    void addFiles(attachable)
  }

  /**
   * The message as sent. The layers it mentions go along as attachments, whose previews the
   * history shows; the references in the text already tell the model their IDs.
   */
  function takeSubmission(text: string): ChatSubmission {
    draftGeneration++
    const submittedImages = images.value
    const submittedFiles = files.value
    images.value = []
    files.value = []
    resetFileDialog()
    return {
      modelText: text,
      displayText: text,
      images: submittedImages,
      nodes: mentionedNodes(options.editor.graph, text),
      files: submittedFiles
    }
  }

  /** Takes back a submission that was not sent, ahead of anything attached since. */
  function restoreSubmission(submission: ChatSubmission): void {
    images.value = [...submission.images, ...images.value]
    files.value = [...(submission.files ?? []), ...files.value]
  }

  function clear(): void {
    draftGeneration++
    for (const image of images.value) revokeImagePreviewURL(image.previewURL)
    images.value = []
    files.value = []
    resetFileDialog()
  }

  onFileChange((chosen) => {
    if (chosen) void addFiles([...chosen])
  })
  onBeforeUnmount(clear)

  return {
    images,
    files,
    full,
    canMentionSelection,
    selectionMentions,
    openFileDialog,
    addFiles,
    removeImage,
    removeFile,
    handlePaste,
    takeSubmission,
    restoreSubmission
  }
}
