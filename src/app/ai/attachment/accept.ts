import { isAttachableImageFile } from '@/app/ai/attachment/image/prepare'
import { isAttachableTextFile, isTextAttachmentMediaType } from '@/app/ai/attachment/text/prepare'

/** Whether the chat attaches the file, as an image or as text. */
export function isAttachableFile(file: File): boolean {
  return isAttachableImageFile(file) || isAttachableTextFile(file)
}

/**
 * Whether a file a drag carries looks attachable, which shows the chat's drop overlay. Only its
 * type is readable before the drop, so a file the system reports no type for, such as a `.fig` or
 * often a `.tsx`, shows none; the drop itself still attaches the ones `isAttachableFile` takes.
 */
export function carriesAttachableFile(item: DataTransferItem): boolean {
  return (
    item.kind === 'file' && (item.type.startsWith('image/') || isTextAttachmentMediaType(item.type))
  )
}
