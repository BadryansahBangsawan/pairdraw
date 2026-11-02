/** A text file attached to a chat message, such as notes, a stylesheet, or source code. */
export interface TextAttachmentDraft {
  name: string
  /** The file's type as the system reported it, or `text/plain` when it reported none. */
  mediaType: string
  text: string
  /** Bytes, as the file had them. */
  size: number
}

export const MAX_TEXT_ATTACHMENTS = 4

/** A file larger than this would crowd the model's context, whatever it holds. */
export const MAX_TEXT_ATTACHMENT_BYTES = 200 * 1024

/** Why a file did not attach. */
export type TextAttachmentRefusal = 'unsupported' | 'too-large' | 'not-text'

/** File extensions the chat attaches as text, lower case and without the dot. */
export const TEXT_ATTACHMENT_EXTENSIONS = [
  'md',
  'markdown',
  'mdx',
  'txt',
  'text',
  'css',
  'scss',
  'sass',
  'less',
  'html',
  'htm',
  'xml',
  'json',
  'jsonc',
  'yaml',
  'yml',
  'toml',
  'csv',
  'tsv',
  'js',
  'mjs',
  'cjs',
  'jsx',
  'ts',
  'mts',
  'cts',
  'tsx',
  'vue',
  'svelte',
  'astro',
  'py',
  'rb',
  'go',
  'rs',
  'java',
  'kt',
  'swift',
  'c',
  'h',
  'cpp',
  'hpp',
  'cs',
  'php',
  'sh',
  'sql',
  'graphql',
  'gql'
] as const
