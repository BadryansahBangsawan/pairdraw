import { createDesignGuard } from '@pairdraw/core/design-memory'
import type { FigmaAPI } from '@pairdraw/core/figma-api'
import { compileScript } from '@pairdraw/core/tools'

import type { AutomationTarget } from '@/app/automation/bridge/target'
import { automationUndoLabel, executeWithDocumentUndo } from '@/app/automation/execution/editor'
import { ensureGraphFonts } from '@/app/editor/fonts'

type FigmaFactory = (store: AutomationTarget['store'], pageId?: string) => FigmaAPI

export function createAutomationEvalHandler(makeFigma: FigmaFactory) {
  return async function handleEval(target: AutomationTarget, args: unknown): Promise<unknown> {
    const code = (args as { code?: string }).code
    if (!code) throw new Error('Missing "code" in args')
    const figma = makeFigma(target.store, target.pageId)
    const run = compileScript(code)
    // A person runs `pairdraw eval`, so the design memory warns about what the script brought in
    // rather than undoing it.
    const guard = createDesignGuard(target.store.graph, { mode: 'warn' })
    const result = await executeWithDocumentUndo(
      target.store,
      target.pageId,
      automationUndoLabel('eval'),
      () =>
        target.store.runMutationWithLayout(
          () => run(figma),
          target.pageId,
          async () => {
            const page = target.store.graph.getNode(target.pageId)
            if (page)
              await ensureGraphFonts(target.store.graph, page.childIds, target.store.renderer)
          }
        ),
      guard.verifyChange
    )
    target.store.requestRender()
    const designMemory = guard.report()
    return designMemory
      ? { ok: true, result: result ?? null, designMemory }
      : { ok: true, result: result ?? null }
  }
}
