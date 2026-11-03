import * as v from 'valibot'

import type { MCPClient, MCPClientID } from './catalog'
import { editEntry, inspectEntry } from './entry'
import type { MCPClientEditFailure, MCPClientEntryState } from './entry'
import { mcpClientConfigSchema, mcpClientFileErrorSchema, mcpClientWriteSchema } from './schema'
import type { MCPClientConfig, MCPClientFileError } from './schema'

/** Reads and writes clients' config files; the desktop shell resolves each client's path. */
export interface MCPClientConfigStore {
  read: (client: MCPClientID) => Promise<unknown>
  /**
   * Writes `content` while the file still holds `expected` (`null`: no file yet) and differs from
   * it only by the entry being added (`enabled`) or removed, which the shell checks again.
   */
  write: (
    client: MCPClientID,
    enabled: boolean,
    content: string,
    expected: string | null
  ) => Promise<unknown>
}

export interface MCPClientStatus {
  id: MCPClientID
  name: string
  /** The file, home folder shortened to `~`; absent when it could not be read. */
  displayPath?: string
  /** The client's folder exists on this computer. */
  installed: boolean
  state: MCPClientEntryState | 'unreadable'
}

export type MCPClientChangeFailure = MCPClientFileError | MCPClientEditFailure

export type MCPClientChange =
  | {
      outcome: 'saved'
      enabled: boolean
      status: MCPClientStatus
      /** The copy of the original file this change made, if it made one. */
      backup: string | null
    }
  | { outcome: 'failed'; enabled: boolean; reason: MCPClientChangeFailure }

/** A file that changed under an edit is read and edited again once before giving up. */
const CHANGED_RETRIES = 1

/** The shell rejects with its reason as a string; an `Error` carries it as its message. */
function fileError(error: unknown, fallback: MCPClientFileError): MCPClientFileError {
  const result = v.safeParse(
    mcpClientFileErrorSchema,
    error instanceof Error ? error.message : error
  )
  return result.success ? result.output : fallback
}

type ConfigRead = { ok: true; config: MCPClientConfig } | { ok: false; reason: MCPClientFileError }

async function readConfig(store: MCPClientConfigStore, id: MCPClientID): Promise<ConfigRead> {
  try {
    const result = v.safeParse(mcpClientConfigSchema, await store.read(id))
    return result.success
      ? { ok: true, config: result.output }
      : { ok: false, reason: 'unreadable' }
  } catch (error) {
    return { ok: false, reason: fileError(error, 'unreadable') }
  }
}

function statusOf(client: MCPClient, config: MCPClientConfig, content = config.content) {
  return {
    id: client.id,
    name: client.name,
    displayPath: config.displayPath,
    installed: config.installed,
    state: inspectEntry(client, content)
  } satisfies MCPClientStatus
}

export async function inspectClient(
  store: MCPClientConfigStore,
  client: MCPClient
): Promise<MCPClientStatus> {
  const read = await readConfig(store, client.id)
  if (!read.ok) return { id: client.id, name: client.name, installed: true, state: 'unreadable' }
  return statusOf(client, read.config)
}

/** Adds or removes the entry in `client`'s file, changing nothing else in it. */
export async function setClientEntry(
  store: MCPClientConfigStore,
  client: MCPClient,
  enabled: boolean
): Promise<MCPClientChange> {
  for (let attempt = 0; ; attempt++) {
    const read = await readConfig(store, client.id)
    if (!read.ok) return { outcome: 'failed', enabled, reason: read.reason }
    const { config } = read
    if (!config.installed) return { outcome: 'failed', enabled, reason: 'not-installed' }
    const edit = editEntry(client, config.content, enabled)
    if (!edit.ok) return { outcome: 'failed', enabled, reason: edit.reason }
    if (edit.text === (config.content ?? '')) {
      return { outcome: 'saved', enabled, status: statusOf(client, config), backup: null }
    }
    try {
      const written = v.safeParse(
        mcpClientWriteSchema,
        await store.write(client.id, enabled, edit.text, config.content)
      )
      return {
        outcome: 'saved',
        enabled,
        status: statusOf(client, config, edit.text),
        backup: written.success ? written.output.backup : null
      }
    } catch (error) {
      const reason = fileError(error, 'write-failed')
      if (reason !== 'changed' || attempt >= CHANGED_RETRIES) {
        return { outcome: 'failed', enabled, reason }
      }
    }
  }
}
