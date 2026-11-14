import type { CommentThread, SceneGraph } from '@pairdraw/scene-graph'
import { byCreatedAt, liveReplies } from '@pairdraw/scene-graph/comments'
import { aiMessages } from '@pairdraw/vue/i18n'

import { referenceLink } from '@/app/ai/chat/references/link'

type CommentPromptMessages = Pick<
  ReturnType<typeof aiMessages.get>,
  | 'commentPromptApply'
  | 'commentPromptApplyAll'
  | 'commentPromptThread'
  | 'commentPromptThreadOnLayer'
>

/** Threads the AI chat can still act on: not deleted and not resolved. */
export function openCommentThreads(threads: readonly CommentThread[]): CommentThread[] {
  return threads.filter((thread) => !thread.deleted && !thread.resolved)
}

/** One message of a thread as a Markdown quote that names its author, line by line. */
function quote(author: string, text: string): string {
  const [first = '', ...rest] = text.trim().split('\n')
  return [`> **${author}:** ${first}`, ...rest.map((line) => `> ${line}`)].join('\n')
}

/**
 * A thread as the chat sends it: its ID, which the agent's comment tools take, a reference to the
 * layer it is pinned to while that layer exists, and the comment and its replies quoted in order.
 */
function threadSection(
  graph: SceneGraph,
  thread: CommentThread,
  messages: CommentPromptMessages
): string {
  const node = thread.nodeId ? graph.getNode(thread.nodeId) : undefined
  const heading = node
    ? messages.commentPromptThreadOnLayer({
        id: thread.id,
        layer: referenceLink({ kind: 'node', id: node.id, label: node.name })
      })
    : messages.commentPromptThread({ id: thread.id })
  const messagesInThread = [thread, ...liveReplies(thread)].map((entry) =>
    quote(entry.author, entry.text)
  )
  return [heading, messagesInThread.join('\n>\n')].join('\n')
}

/**
 * The prompt that asks the AI chat to act on comment threads: apply each one's feedback, reply
 * saying what changed, and resolve it, through the comment tools the agent already has. Threads
 * go oldest first; deleted and resolved ones are left out. Null when none is left.
 */
export function commentThreadsPrompt(
  graph: SceneGraph,
  threads: readonly CommentThread[],
  messages: CommentPromptMessages = aiMessages.get()
): string | null {
  const open = openCommentThreads(threads).toSorted(byCreatedAt)
  if (open.length === 0) return null
  const ask = open.length === 1 ? messages.commentPromptApply : messages.commentPromptApplyAll
  return [ask, ...open.map((thread) => threadSection(graph, thread, messages))].join('\n\n')
}
