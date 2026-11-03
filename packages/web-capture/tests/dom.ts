import { Window } from 'happy-dom'

/** happy-dom's documents implement the DOM the capturer reads, without lib.dom's declarations. */
function isDocument(value: unknown): value is Document {
  return typeof value === 'object' && value !== null && 'documentElement' in value
}

function isParser(value: unknown): value is DOMParser {
  return typeof value === 'object' && value !== null && 'parseFromString' in value
}

/** A page in happy-dom, which computes styles from stylesheets but lays nothing out. */
export function createPage(html: string, url = 'https://example.com/pricing/') {
  const window = new Window({ url })
  window.document.write(html)
  // Read as unknown, so the guards narrow to lib.dom's types rather than intersect with them.
  const document: unknown = window.document
  const parser: unknown = new window.DOMParser()
  if (!isDocument(document) || !isParser(parser)) throw new Error('happy-dom has no DOM')
  return { document, parser, close: () => window.happyDOM.close() }
}
