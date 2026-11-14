import type { DesignDocument } from '@pairdraw/dom-css'
import { designDocumentToSceneGraph } from '@pairdraw/dom-css/scene-graph'
import type { SceneGraph } from '@pairdraw/scene-graph'

import { layoutAuthoredNodes } from '#core/layout'

export interface StyleHTMLOptions {
  /** A stylesheet applied after the document's own `<style>` blocks. */
  cssText?: string
  /** Compile the Tailwind utilities the markup's classes name into the stylesheet. */
  tailwind?: boolean
}

/**
 * Styles HTML with the CSS runtime a host has: the browser's in the app, the headless runtime
 * in the CLI. Hosts hand it to tools, which build the layers with `sceneGraphFromStyledHTML`.
 */
export type HTMLStyler = (html: string, options: StyleHTMLOptions) => Promise<DesignDocument>

/**
 * A `class` or JSX `className` attribute with a double-quoted, single-quoted, or unquoted value.
 * The name must follow whitespace, so `data-class` and similar attributes do not count.
 */
const CLASS_ATTRIBUTE = /(?:^|\s)class(?:Name)?\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g

/**
 * The class names `class` attributes in `html` use, as Tailwind candidates, for hosts without a
 * DOM parser; a browser reads them from each element's `classList` instead.
 */
export function htmlClassNames(html: string): string[] {
  const names = new Set<string>()
  for (const match of html.matchAll(CLASS_ATTRIBUTE)) {
    // Only one alternative matches; `join` reads the others, which are undefined, as empty.
    const value = match.slice(1).join('')
    for (const name of value.split(/\s+/)) if (name) names.add(name)
  }
  return [...names]
}

/**
 * The layers a styled DOM describes, with the sizes and positions its layout implies. Styling
 * belongs to whoever has a CSS runtime, such as a browser or the headless runtime; building and
 * laying out the layers happens here for every caller. Safe to bundle for the browser.
 */
export function sceneGraphFromStyledHTML(
  styled: DesignDocument,
  options: { pageName?: string } = {}
): SceneGraph {
  const graph = designDocumentToSceneGraph(styled, { pageName: options.pageName })
  layoutAuthoredNodes(
    graph,
    graph.getPages().map((page) => page.id)
  )
  return graph
}
