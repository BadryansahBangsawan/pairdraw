import { tool } from 'ai'
import { isPlainObject } from 'es-toolkit'

import { graphFromPageSnapshot } from '@pairdraw/core'
import { registerComponentCatalog, isAtomicTool, toolsToAI } from '@pairdraw/core/tools'

import {
  currentRun,
  markRunWork,
  runBaseline,
  runPageId,
  stepBudget,
  takeRunUndoNote
} from '@/app/ai/reply/run'
import { makeFigmaFromStore } from '@/app/automation/bridge/figma-factory'
import { recordToolCompleted, type AIDiagnosticContext } from '@/app/diagnostics/events/ai'
import type { EditorStore } from '@/app/editor/active-store'
import { useLibraryService } from '@/app/libraries'

import { actionRefusal, type ActionApproval } from './approval'
import { aiToolDefinitions } from './catalog'
import { runEditorTool } from './runner'

export {
  currentRun,
  didHitStepLimit,
  endRun,
  markRunPreview,
  recordStep,
  runAgentId,
  runPageId,
  startRun
} from '@/app/ai/reply/run'

/**
 * A result with the run's note about edits the user undid meanwhile, so the model does not
 * build on them; other results stay as they are.
 */
function withUndoNote(result: unknown, note: string): unknown {
  if (!note) return result
  return isPlainObject(result) ? { ...result, undoNote: note } : { result, undoNote: note }
}

export interface AIToolOptions {
  /** Asks the person before a call runs, when Settings → AI wants each change approved. */
  approve?: ActionApproval['approve']
}

export function createAITools(
  store: EditorStore,
  diagnosticContext?: AIDiagnosticContext,
  { approve }: AIToolOptions = {}
) {
  const libraryService = useLibraryService()
  libraryService.bindEditor(store)
  registerComponentCatalog(store.graph, libraryService)

  return toolsToAI(
    aiToolDefinitions,
    {
      getFigma: () => {
        const figma = makeFigmaFromStore(store, runPageId(store))
        figma.changeBaseline = (pageId) => {
          const baseline = runBaseline(store, pageId)
          return baseline ? graphFromPageSnapshot(store.graph, baseline) : null
        }
        return figma
      },
      executeTool: async (def, figma, args, { toolCallId }) => {
        // The call belongs to the reply that made it, even if a later one starts meanwhile.
        const run = currentRun(store)
        const approval = approve ? await approve(def, args, toolCallId) : 'allowed'
        if (approval !== 'allowed') return { error: actionRefusal(approval) }
        return withUndoNote(
          await runEditorTool({ store, figma, def, args, reply: { run, toolCallId } }),
          takeRunUndoNote(store)
        )
      },
      onAfterExecute: (def) => {
        if (def.mutates && !isAtomicTool(def)) store.requestRender()
      },
      onFlashNodes: (nodeIds) => {
        markRunWork(store, nodeIds)
        store.renderer?.aiClearActive()
        if (nodeIds.length > 0) {
          store.aiFlashDone(nodeIds)
        }
      },
      onToolLog: (entry) => {
        recordToolCompleted(
          {
            tool: entry.tool,
            durationMs: entry.durationMs,
            mutates: entry.mutates,
            failed: Boolean(entry.error)
          },
          diagnosticContext,
          entry.cause
        )
      },
      getStepBudget: () => stepBudget(store)
    },
    { tool }
  )
}
