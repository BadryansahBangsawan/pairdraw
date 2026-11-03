/** Where an element sat on the page, in CSS pixels from the top left of the captured root. */
export interface WebCaptureBox {
  x: number
  y: number
  width: number
  height: number
}

/** A run of text as the page held it; the importer collapses whitespace as CSS does. */
export interface WebCaptureText {
  type: 'text'
  text: string
}

/**
 * An element with the styles the page computed for it. The shape is the styled DOM that
 * `@open-pencil/dom-css` builds layers from, so a capture needs no CSS runtime to import.
 */
export interface WebCaptureElement {
  type: 'element'
  tagName: string
  attrs: Record<string, string>
  computedStyle: Record<string, string>
  box?: WebCaptureBox
  children: WebCaptureNode[]
}

export type WebCaptureNode = WebCaptureElement | WebCaptureText
