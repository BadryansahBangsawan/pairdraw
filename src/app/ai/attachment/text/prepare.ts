import type { FilePresentation } from '@/app/ai/attachment/presentation/types'

import {
  MAX_TEXT_ATTACHMENT_BYTES,
  TEXT_ATTACHMENT_EXTENSIONS,
  type TextAttachmentDraft,
  type TextAttachmentRefusal
} from './types'

/** Types systems give text files that are not `text/*`. */
const TEXT_MEDIA_TYPES: ReadonlySet<string> = new Set([
  'application/json',
  'application/ld+json',
  'application/xml',
  'application/javascript',
  'application/x-javascript',
  'application/typescript',
  'application/x-typescript',
  'application/x-yaml',
  'application/yaml',
  'application/toml',
  'application/x-sh',
  'application/sql',
  'application/graphql'
])

const EXTENSIONS: ReadonlySet<string> = new Set(TEXT_ATTACHMENT_EXTENSIONS)

/** The file picker's `accept`: text files by extension, since many systems report no type. */
export const TEXT_ATTACHMENT_ACCEPT = [
  ...TEXT_ATTACHMENT_EXTENSIONS.map((extension) => `.${extension}`),
  'text/*',
  ...TEXT_MEDIA_TYPES
].join(',')

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

/** A type without its parameters, as `text/css` of `text/css;charset=utf-8`. */
function mediaTypeEssence(type: string): string {
  return (type.split(';').at(0) ?? '').trim().toLowerCase()
}

/**
 * Whether a type a drag reports is a text file's. Only types are readable while dragging, and
 * a file the system has no type for, such as a `.fig`, reports none.
 */
export function isTextAttachmentMediaType(type: string): boolean {
  const essence = mediaTypeEssence(type)
  return essence.startsWith('text/') || TEXT_MEDIA_TYPES.has(essence)
}

/** Whether the chat attaches the file as text: by its extension first, since `.ts` reads as video. */
export function isAttachableTextFile(file: File): boolean {
  if (EXTENSIONS.has(extensionOf(file.name))) return true
  return isTextAttachmentMediaType(file.type)
}

/**
 * Reads a text file to attach, or says why it cannot be: not a text file by name or type, larger
 * than a message should carry, or bytes that are not UTF-8 text.
 */
export async function readTextAttachment(
  file: File
): Promise<{ draft: TextAttachmentDraft } | { refusal: TextAttachmentRefusal }> {
  if (!isAttachableTextFile(file)) return { refusal: 'unsupported' }
  if (file.size > MAX_TEXT_ATTACHMENT_BYTES) return { refusal: 'too-large' }
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer())
  } catch {
    return { refusal: 'not-text' }
  }
  if (text.includes('\u0000')) return { refusal: 'not-text' }
  return {
    draft: {
      name: file.name,
      mediaType: isTextAttachmentMediaType(file.type) ? mediaTypeEssence(file.type) : 'text/plain',
      text,
      size: file.size
    }
  }
}

/** The files as the sent message shows them; each keeps its text to read in the viewer. */
export function textAttachmentPresentations(
  messageId: string,
  files: readonly TextAttachmentDraft[]
): FilePresentation[] {
  return files.map((file) => ({
    id: crypto.randomUUID(),
    messageId,
    kind: 'file',
    name: file.name,
    preview: new Blob([file.text], { type: 'text/plain;charset=utf-8' }),
    mediaType: file.mediaType,
    size: file.size
  }))
}
