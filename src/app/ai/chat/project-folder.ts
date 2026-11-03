import { useLocalStorage } from '@vueuse/core'
import { takeRight } from 'es-toolkit'
import * as v from 'valibot'

import { isTauri } from '@/app/tauri/env'

/** Conversations that remember a folder; the oldest are forgotten past this. */
const MAX_FOLDERS = 200
const MAX_PATH = 4096

const foldersSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.record(
    v.pipe(v.string(), v.maxLength(256)),
    v.pipe(v.string(), v.minLength(1), v.maxLength(MAX_PATH))
  )
)

/**
 * The project folder each conversation's coding agent works in, by conversation id. Only the
 * desktop app starts agents in a folder the person picks; the web app's companion keeps every
 * session in its own workspace (`packages/mcp/src/agents/filter.ts`).
 */
const folders = useLocalStorage<Record<string, string>>(
  'open-pencil:ai:chat-project-folders',
  {},
  {
    serializer: {
      read: (raw) => {
        const parsed = v.safeParse(foldersSchema, raw)
        return parsed.success ? parsed.output : {}
      },
      write: JSON.stringify
    }
  }
)

/** The folder a conversation's agent works in, or null for the app's own agent workspace. */
export function chatProjectFolder(conversationId: string | null | undefined): string | null {
  if (!conversationId || !isTauri()) return null
  return folders.value[conversationId] ?? null
}

export function setChatProjectFolder(conversationId: string, folder: string | null): void {
  const rest = Object.entries(folders.value).filter(([id]) => id !== conversationId)
  const next = folder ? [...rest, [conversationId, folder] as const] : rest
  folders.value = Object.fromEntries(takeRight(next, MAX_FOLDERS))
}

/** Asks for a folder through the system dialog; null when cancelled or outside the desktop app. */
export async function pickProjectFolder(): Promise<string | null> {
  if (!isTauri()) return null
  const { open } = await import('@tauri-apps/plugin-dialog')
  const folder = await open({ directory: true, multiple: false })
  return typeof folder === 'string' && folder.length <= MAX_PATH ? folder : null
}

/** The folder's own name, which the chat header shows; the full path is in its tooltip. */
export function projectFolderName(folder: string): string {
  const trimmed = folder.replace(/[\\/]+$/, '')
  return trimmed.split(/[\\/]/).at(-1) || folder
}
