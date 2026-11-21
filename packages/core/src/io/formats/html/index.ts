import { filename } from 'pathe/utils'

import {
  exportHTMLBundle,
  sceneNodesToDesignDocument,
  type DesignDocument
} from '@pairdraw/dom-css/export'
import type { SceneGraph } from '@pairdraw/scene-graph'

import type { ExportAsset, HTMLExportOptions, IOContext } from '#core/io/types'
import { exportWebFontFaceAssets } from '#core/text/web-font/assets'

import { vectorElement } from './vectors'

async function designDocument(
  graph: SceneGraph,
  nodeIds: string[],
  options: HTMLExportOptions,
  context?: IOContext
): Promise<DesignDocument> {
  const { booleanPathResolver, needsBooleanPaths } = await import('#core/io/formats/boolean-path')
  const booleanPath = needsBooleanPaths(graph)
    ? await booleanPathResolver(context?.canvasKit, context?.renderer)
    : undefined
  // Layer names help find a layer in the markup; IDs only matter to tools that link back.
  const projection = {
    vectorElement: (vectorGraph: SceneGraph, node: Parameters<typeof vectorElement>[1]) =>
      vectorElement(vectorGraph, node, booleanPath),
    includeLayerNames: options.layerNames ?? true,
    includeSourceIds: options.layerIds ?? false
  }
  return sceneNodesToDesignDocument(graph, nodeIds, projection)
}

/** `card.html` keeps its external files in `card.assets/` next to it, whatever the path style. */
function assetBasePath(fileName: string | undefined): string {
  const name = fileName && filename(fileName)
  return `${name || 'export'}.assets`
}

export async function renderNodesToHTML(
  graph: SceneGraph,
  nodeIds: string[],
  options: HTMLExportOptions = {},
  fileName?: string,
  context?: IOContext
): Promise<{ html: string; assets: ExportAsset[] }> {
  const bundle = await exportHTMLBundle(await designDocument(graph, nodeIds, options, context), {
    html: options.html,
    style: options.style,
    assets: options.assets,
    fonts:
      options.fonts === 'assets'
        ? async (fonts, basePath) =>
            (await exportWebFontFaceAssets({ fonts, assetBasePath: basePath })).assets
        : 'none',
    assetBasePath: assetBasePath(fileName),
    loadTailwindStylesheet: options.loadTailwindStylesheet
  })
  const page = bundle.files.find((file) => file.path === bundle.entrypoint)
  if (typeof page?.content !== 'string') throw new Error('HTML export produced no page')
  return { html: page.content, assets: bundle.files.filter((file) => file !== page) }
}
