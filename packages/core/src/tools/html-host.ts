import type { TailwindStylesheetLoader } from '@pairdraw/dom-css/export'

import type { HTMLStyler } from '#core/io/formats/html/layers'

/**
 * What `import_html` and `export_html` need from the host's CSS runtime: the browser's in the
 * app, the headless one in the CLI.
 */
export interface HTMLToolHost {
  /** Styles HTML so `import_html` can build layers from it. */
  style: HTMLStyler
  /**
   * Reads Tailwind's stylesheets for a standalone Tailwind `export_html` page. Hosts without
   * Node's file system, such as browsers, must provide it.
   */
  loadTailwindStylesheet?: TailwindStylesheetLoader
}

const hosts = new WeakMap<object, HTMLToolHost>()

/** Lets the HTML tools run for the documents of `owner`, a document's graph. */
export function registerHTMLToolHost(owner: object, host: HTMLToolHost): () => void {
  hosts.set(owner, host)
  return () => {
    if (hosts.get(owner) === host) hosts.delete(owner)
  }
}

export function getHTMLToolHost(owner: object): HTMLToolHost | undefined {
  return hosts.get(owner)
}
