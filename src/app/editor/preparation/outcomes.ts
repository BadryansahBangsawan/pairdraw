import { recordPreparationOutcome } from '@/app/diagnostics'
import type { EditorPreparationEventEmitter } from '@/app/editor/preparation/events'
import type { AppEditorState } from '@/app/editor/session/types'

/** Records each preparation's outcome, phase reached, and duration for diagnostics. */
export function recordPreparationOutcomes(preparationEvents: EditorPreparationEventEmitter): void {
  const preparationLifecycle = new Map<
    number,
    {
      kind: NonNullable<AppEditorState['preparation']>['kind']
      phase: NonNullable<AppEditorState['preparation']>['phase']
      startedAt: number
    }
  >()
  preparationEvents.on('preparation:started', (preparation) => {
    preparationLifecycle.set(preparation.id, {
      kind: preparation.kind,
      phase: preparation.phase,
      startedAt: preparation.startedAt
    })
  })
  preparationEvents.on('preparation:updated', (preparation) => {
    const lifecycle = preparationLifecycle.get(preparation.id)
    if (lifecycle) lifecycle.phase = preparation.phase
  })
  preparationEvents.on('preparation:finished', (result) => {
    const lifecycle = preparationLifecycle.get(result.id)
    if (!lifecycle) return
    recordPreparationOutcome({
      kind: result.kind,
      outcome: result.status,
      cancellationReason: result.status === 'cancelled' ? result.reason : null,
      failureCode: null,
      terminalPhase: lifecycle.phase,
      durationMs: performance.now() - lifecycle.startedAt
    })
    preparationLifecycle.delete(result.id)
  })
  preparationEvents.on('preparation:failed', (failure) => {
    const lifecycle = preparationLifecycle.get(failure.id)
    if (!lifecycle) return
    recordPreparationOutcome({
      kind: failure.kind,
      outcome: 'failed',
      cancellationReason: null,
      failureCode: failure.code,
      terminalPhase: lifecycle.phase,
      durationMs: performance.now() - lifecycle.startedAt
    })
    preparationLifecycle.delete(failure.id)
  })
}
