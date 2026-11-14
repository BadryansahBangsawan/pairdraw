import type { HTMLStyler } from '@pairdraw/core/io/formats/html/layers'
import {
  browserHTMLToDesignDocument,
  browserTailwindHTMLToDesignDocument
} from '@pairdraw/dom-css/browser'

/** Every class the markup names, which Tailwind builds its utilities for. */
function classNames(html: string): string[] {
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  return [...parsed.querySelectorAll('[class]')].flatMap((element) => [...element.classList])
}

/** Tailwind's own stylesheet, loaded with the first Tailwind styling rather than with the app. */
async function loadTailwindStylesheet(): Promise<string> {
  const { default: css } = await import('tailwindcss/index.css?raw')
  return css
}

/**
 * Styles HTML with the browser's own CSS engine, for the code preview and `import_html`. The
 * Tailwind compiler gets its stylesheet from the bundle, since the browser has no file system.
 */
export const styleHTMLInBrowser: HTMLStyler = (html, { cssText, tailwind }) =>
  tailwind
    ? browserTailwindHTMLToDesignDocument(html, classNames(html), {
        css: cssText,
        loadStylesheet: loadTailwindStylesheet
      })
    : browserHTMLToDesignDocument(html, { cssText })
