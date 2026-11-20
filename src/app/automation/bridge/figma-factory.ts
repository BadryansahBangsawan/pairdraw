import { FigmaAPI, MAX_IMAGE_FETCH_BYTES } from '@pairdraw/core/figma-api'
import { createCanvasKitRasterCodec } from '@pairdraw/core/io/formats/raster'
import {
  registerHTMLToolHost,
  registerImageAIService,
  type HTMLToolHost
} from '@pairdraw/core/tools'

import { renderAutomationImage } from '@/app/automation/bridge/export-handlers'
import { automationRenderKit } from '@/app/automation/bridge/render-kit'
import { styleHTMLInBrowser } from '@/app/code/html-styler'
import { bindScriptToolHost } from '@/app/code/script/tool-host'
import { loadTailwindStylesheet } from '@/app/document/export/html'
import type { EditorStore } from '@/app/editor/active-store'
import { listFonts } from '@/app/editor/fonts'
import { bindAgentImageAIService } from '@/app/editor/image-ai/agent'
import { bindAgentImageVectorizer } from '@/app/editor/vectorize/agent'
import { createTauriFetch } from '@/app/tauri/http'
import { IS_TAURI } from '@/constants'

// Figma loads `createImageAsync` URLs through its own server; on desktop the native proxy does
// the same, past CORS, which a browser cannot.
const imageFetch = IS_TAURI
  ? createTauriFetch({ maxResponseBytes: MAX_IMAGE_FETCH_BYTES })
  : undefined

/**
 * The HTML tools style markup with the browser's own CSS engine, as the code preview does, and
 * read Tailwind's stylesheets from the bundle, as the export dialog does.
 */
const htmlToolHost: HTMLToolHost = { style: styleHTMLInBrowser, loadTailwindStylesheet }

export function makeFigmaFromStore(
  store: EditorStore,
  pageId = store.state.currentPageId
): FigmaAPI {
  const middle = store.viewportCanvasCenter()
  const api = new FigmaAPI(store.graph, {
    fetch: imageFetch,
    // The page, view, and selection the editor already shows are seeded, so a tool that only
    // reads or draws leaves them alone; one that switches page, sets the viewport, or selects
    // layers moves the editor.
    pageId,
    // A page not yet visited has no layers until the editor prepares it, as it does a page it
    // switches to: with its fonts and layout.
    loadPage: async (id) => {
      if (!(await store.preparePageNodes(id)))
        throw new Error(`Page "${id}" was closed before it finished loading`)
    },
    selection: pageId === store.state.currentPageId ? [...store.state.selectedIds] : [],
    viewport: {
      center: {
        x: (middle.x - store.state.panX) / store.state.zoom,
        y: (middle.y - store.state.panY) / store.state.zoom
      },
      zoom: store.state.zoom
    },
    onPageChange: (id) => (id === store.state.currentPageId ? undefined : store.switchPage(id)),
    onViewportChange: ({ center, zoom }) => store.centerOn(center.x, center.y, zoom),
    onSelectionChange: (ids, selectedPageId) => {
      // The selection on screen belongs to the page on screen. A call aimed at another page
      // must not replace it.
      if (selectedPageId !== store.state.currentPageId) return
      store.select([...ids])
    },
    // The editor syncs instances after edits; a script's reads sync them at once, as in Figma.
    flushComponentSync: () => store.flushComponentSync(),
    pageOfNode: (id) => store.pageHoldingNode(id)
  })
  // `vectorize_image` runs on the service and key set up in Settings, which stay in the app.
  bindAgentImageVectorizer(store)
  // The image AI tools run on the image services and keys set up in Settings, as vectorizing does.
  bindAgentImageAIService(store, registerImageAIService)
  registerHTMLToolHost(store.graph, htmlToolHost)
  // Code layers run in the sandbox, which the app has and a headless host does not.
  bindScriptToolHost(store)
  api.setRenderer(store.renderer ?? null)
  api.icons = store.iconProvider
  api.theme = store.state.theme ?? 'light'
  api.exportImage = async (nodeIds, opts) =>
    renderAutomationImage(
      store,
      nodeIds,
      opts.scale ?? 1,
      opts.format ?? 'PNG',
      opts.pageId ?? pageId,
      opts.quality
    )
  // A document in a background tab has no canvas; its codec comes from the app's CanvasKit, which
  // `prepareAutomationRendering` has already loaded before a command runs.
  const canvasKit = store.renderer?.ck ?? automationRenderKit()
  if (canvasKit) api.rasterCodec = createCanvasKitRasterCodec(canvasKit)
  // The font manager lists the installed families once the host has read them.
  const listAvailableFonts = api.listAvailableFontsAsync.bind(api)
  api.listAvailableFontsAsync = async () => {
    await listFonts()
    return listAvailableFonts()
  }
  return api
}
