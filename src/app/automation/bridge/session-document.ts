import { MCP_AGENT_GONE_MS } from '@/app/automation/lifetime'
import { getTabById, type Tab } from '@/app/tabs'

export type UnknownRecord = { [key: string]: unknown }

export function isUnknownRecord(value: unknown): value is UnknownRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

/** Why an untargeted call refused a document, so a test can tell the cases apart. */
export type DocumentFailureReason = 'closed' | 'not-writable' | 'not-owned'

/**
 * The call cannot use the document it resolved. `reason` is the case; the message says what
 * happened.
 */
export class AutomationDocumentError extends Error {
  readonly reason: DocumentFailureReason

  constructor(reason: DocumentFailureReason, message: string) {
    super(message)
    this.name = 'AutomationDocumentError'
    this.reason = reason
  }
}

type SessionMemory = { state: 'open'; tabId: string; owns: boolean } | { state: 'closed' }

/** The document each MCP session last edited. The person's tab switches do not write it. */
const sessions = new Map<string, SessionMemory>()
/** Dropped with the agent when a session never says goodbye. */
const expiries = new Map<string, ReturnType<typeof setTimeout>>()

function scheduleExpiry(sessionId: string): void {
  const pending = expiries.get(sessionId)
  if (pending !== undefined) clearTimeout(pending)
  const timer = setTimeout(() => {
    expiries.delete(sessionId)
    sessions.delete(sessionId)
  }, MCP_AGENT_GONE_MS)
  // Bun's test process would wait out the quiet period. A browser timer has no unref.
  if (isTimer(timer)) timer.unref()
  expiries.set(sessionId, timer)
}

function isTimer(value: unknown): value is { unref: () => void } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'unref' in value &&
    typeof value.unref === 'function'
  )
}

export type SessionDocument = { tab: Tab; owns: boolean }

/**
 * The document this session is editing, when it is still open. A tab the person has closed is
 * remembered as closed, so the next call can say so instead of sliding onto another document.
 */
export function sessionDocument(sessionId: string): SessionDocument | 'closed' | 'none' {
  const memory = sessions.get(sessionId)
  if (!memory) return 'none'
  // A call is the session still being here, so the quiet period starts again.
  scheduleExpiry(sessionId)
  if (memory.state === 'closed') return 'closed'
  const tab = getTabById(memory.tabId)
  if (tab?.kind !== 'document') {
    sessions.set(sessionId, { state: 'closed' })
    return 'closed'
  }
  return { tab, owns: memory.owns }
}

/** Remember the document this session just edited. `owns` is set when this session opened it. */
export function rememberSessionDocument(sessionId: string, tabId: string, owns: boolean): void {
  const current = sessions.get(sessionId)
  const kept = owns || (current?.state === 'open' && current.tabId === tabId && current.owns)
  sessions.set(sessionId, { state: 'open', tabId, owns: kept })
  scheduleExpiry(sessionId)
}

/** The session's document is gone. Later untargeted calls fail until it opens another. */
export function markSessionDocumentClosed(sessionId: string): void {
  sessions.set(sessionId, { state: 'closed' })
  scheduleExpiry(sessionId)
}

/** The MCP session ended, so its document memory ends with it. */
export function forgetSessionDocument(sessionId: string): void {
  const pending = expiries.get(sessionId)
  if (pending !== undefined) clearTimeout(pending)
  expiries.delete(sessionId)
  sessions.delete(sessionId)
}

/** Argument and result fields that name the layers a tool works on. */
export const NODE_ID_FIELDS = [
  'id',
  'ids',
  'node_id',
  'node_ids',
  'parent_id',
  'root_id',
  'target_id'
]

function recordNamesNode(record: UnknownRecord): boolean {
  for (const field of NODE_ID_FIELDS) {
    const entry = record[field]
    if (typeof entry === 'string' && entry.length > 0) return true
    if (Array.isArray(entry) && entry.some((item) => typeof item === 'string' && item.length > 0)) {
      return true
    }
  }
  return false
}

/** True when the call names a layer that already has to exist. A new document has none. */
export function callNamesNode(command: string, args: UnknownRecord): boolean {
  if (command === 'tool' && isUnknownRecord(args.args)) return recordNamesNode(args.args)
  return recordNamesNode(args)
}
