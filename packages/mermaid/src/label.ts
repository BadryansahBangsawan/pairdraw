import { decodeHTML } from 'entities'
import { parseFragment, type DefaultTreeAdapterTypes } from 'parse5'

import type { FlowLabel } from './flowchart/model'
import { decodeEntities } from './upstream/preprocess'

/** A label as Mermaid's grammar hands it over: its text, and how that text is to be read. */
export interface GrammarText {
  text: string
  type: string
}

type HTMLNode = DefaultTreeAdapterTypes.ChildNode

/** The text HTML shows: its text nodes, and a line break for each `<br>`. */
function shownText(nodes: HTMLNode[]): string {
  let text = ''
  // A label can nest more tags than the call stack holds, so walk them with a stack of our own.
  const stack = nodes.toReversed()
  for (let node = stack.pop(); node; node = stack.pop()) {
    if (node.nodeName === '#text' && 'value' in node) text += node.value
    else if (node.nodeName === 'br') text += '\n'
    else if ('childNodes' in node)
      for (const child of node.childNodes.toReversed()) stack.push(child)
  }
  return text
}

/**
 * A label's text as plain text and its format. Mermaid draws a label as HTML, so its tags only
 * style the text, `<br>` breaks the line, and entities stand for characters. Markdown, written
 * in backticks, keeps its marks for whoever draws it.
 */
export function readLabel(label: GrammarText): FlowLabel {
  let text = decodeEntities(label.text.trim())
  // Mermaid drops the quotes around a label written in them.
  if (text.length >= 2 && text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1)
  if (label.type === 'markdown') return { text: decodeHTML(text), format: 'markdown' }
  return { text: shownText(parseFragment(text).childNodes), format: 'text' }
}
