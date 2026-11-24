import type { Editor, EditorState } from '@pairdraw/core'
import { sceneGraphFromStyledHTML } from '@pairdraw/core/io/formats/html/layers'
import { fontManager } from '@pairdraw/core/text'
import { browserHTMLToDesignDocument, resolveFontFamilyStack } from '@pairdraw/dom-css/browser'
import { DEFAULT_FONT_FAMILY } from '@pairdraw/scene-graph/constants'
import { nextFrame } from '@pairdraw/vue/shared/frame'

import { describeDiagnosticError, recordDocumentFailure } from '@/app/diagnostics'
import { applyImportedDocument } from '@/app/document/io/imported-document'
import type { EditorPreparationController } from '@/app/editor/preparation/controller'
import type { EditorPreparationHandle } from '@/app/editor/preparation/types'
import { notificationMessages } from '@/app/i18n/notifications'
import { toast } from '@/app/shell/ui'

type OpenDOMDocumentState = EditorState & {
  documentName: string
}

type OpenDOMFileOptions = {
  editor: Editor
  state: OpenDOMDocumentState
  setDocumentSource: (
    fileName: string,
    sourceFormat: string,
    handle?: FileSystemFileHandle,
    path?: string
  ) => void
  fitCurrentPageToViewport: (signal?: AbortSignal) => Promise<void>
  preparationController: EditorPreparationController
}

type DOMImportOptions = {
  cssText?: string
  handle?: FileSystemFileHandle
  path?: string
  preparation?: EditorPreparationHandle
}

type DOMTextImportOptions = {
  cssText?: string
  documentName?: string
}

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** The family an imported CSS stack draws: its first face the font service knows, else its class default. */
function resolveImportedFontFamily(value: string): string | null {
  return resolveFontFamilyStack(value, {
    // A family the catalog has not looked up is left to the editor, which can load it; one it
    // knows is empty cannot be drawn.
    isAvailable: (family) =>
      family === DEFAULT_FONT_FAMILY || fontManager.familyFacesSync(family)?.length !== 0
  })
}

function documentNameFor(file: File): string {
  return file.name.replace(/\.(html?|xhtml)$/i, '')
}

export function createDOMOpenActions({
  editor,
  state,
  setDocumentSource,
  fitCurrentPageToViewport,
  preparationController
}: OpenDOMFileOptions) {
  async function applyDOMText(
    html: string,
    options: DOMTextImportOptions,
    load: ReturnType<EditorPreparationController['begin']>
  ) {
    await nextFrame()
    const pageName = options.documentName ?? 'DOM Import'
    load.update({ phase: 'decoding', detail: pageName })
    const styled = await browserHTMLToDesignDocument(html, {
      cssText: options.cssText,
      signal: load.signal
    })
    load.signal.throwIfAborted()
    const graph = sceneGraphFromStyledHTML(styled, {
      pageName,
      resolveFontFamily: resolveImportedFontFamily
    })
    await nextFrame()
    await applyImportedDocument(editor, graph, load)
    state.documentName = pageName
    // A later open supersedes this one while it waits for a hidden tab to be shown.
    await fitCurrentPageToViewport(load.signal)
    load.signal.throwIfAborted()
    editor.requestRender()
    return pageName
  }

  async function importDOMText(html: string, options: DOMTextImportOptions = {}) {
    const load = preparationController.begin({
      kind: 'dom-import',
      subject: options.documentName ?? 'DOM Import'
    })
    let succeeded = false
    try {
      const pageName = await applyDOMText(html, options, load)
      setDocumentSource(`${pageName}.html`, 'html')
      toast.info(notificationMessages.get().importedDOMCSS)
      succeeded = true
    } catch (e) {
      if (load.signal.aborted) throw e
      const diagnostic = describeDiagnosticError(e)
      load.fail({
        code: 'decode-failed',
        message: errorDetail(e),
        retryable: diagnostic.retryable ?? true
      })
      recordDocumentFailure({
        operation: 'import',
        format: 'dom-css',
        ...diagnostic,
        retryable: diagnostic.retryable
      })
      console.error('Failed to import DOM/CSS:', e)
      toast.error(notificationMessages.get().importDOMCSSFailed({ error: errorDetail(e) }))
      throw e
    } finally {
      if (succeeded) load.complete()
    }
  }

  async function openDOMFile(file: File, options: DOMImportOptions = {}) {
    const load =
      options.preparation ?? preparationController.begin({ kind: 'dom-import', subject: file.name })
    const ownsLoad = options.preparation === undefined
    let succeeded = false
    try {
      const html = await file.text()
      await applyDOMText(
        html,
        {
          cssText: options.cssText,
          documentName: documentNameFor(file)
        },
        load
      )
      setDocumentSource(file.name, 'html', options.handle, options.path)
      succeeded = true
    } catch (e) {
      if (load.signal.aborted || !ownsLoad) throw e
      const diagnostic = describeDiagnosticError(e)
      load.fail({
        code: 'decode-failed',
        message: errorDetail(e),
        retryable: diagnostic.retryable ?? true
      })
      recordDocumentFailure({
        operation: 'open',
        format: 'dom-css',
        ...diagnostic,
        retryable: diagnostic.retryable
      })
      console.error('Failed to open DOM/CSS file:', e)
      toast.error(notificationMessages.get().openDOMCSSFailed({ error: errorDetail(e) }))
    } finally {
      if (ownsLoad && succeeded) load.complete()
    }
  }

  return { openDOMFile, importDOMText }
}
