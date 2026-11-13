import { prepareForClose } from '@/app/tabs'

/** Shared approval so the window close handler and the Quit item cannot prompt twice. */
export function createExitApproval(confirmDocuments: () => Promise<boolean>) {
  let approved = false
  let confirmation: Promise<boolean> | null = null

  return {
    isApproved: () => approved,
    confirm: async (): Promise<boolean> => {
      if (approved) return true
      confirmation ??= confirmDocuments()
        .then((agreed) => {
          if (agreed) approved = true
          return agreed
        })
        .finally(() => {
          confirmation = null
        })
      return confirmation
    }
  }
}

const approval = createExitApproval(prepareForClose)

/** True once every open document agreed to close, so later requests skip the prompt. */
export function isExitApproved(): boolean {
  return approval.isApproved()
}

export function confirmAppExit(): Promise<boolean> {
  return approval.confirm()
}

let quitConfirmation: Promise<boolean> | null = null

/**
 * This window's documents, asked once while a quit is pending. A quit is the app's, not the
 * window's, so it does not set the window-close approval: another window may still decline, and
 * this window must ask again before it closes.
 */
function confirmQuitDocuments(): Promise<boolean> {
  quitConfirmation ??= prepareForClose().finally(() => {
    quitConfirmation = null
  })
  return quitConfirmation
}

/**
 * Quit across every window. This window confirms only its own documents and reports the answer;
 * the shell exits once the last window agrees, or cancels the quit when one declines. The native
 * Quit item and the platform's exit request both arrive here as a `quit` menu event.
 */
export async function requestAppExit(): Promise<void> {
  const approved = await confirmQuitDocuments()
  const { invoke } = await import('@tauri-apps/api/core')
  await invoke('answer_quit', { approved })
}
