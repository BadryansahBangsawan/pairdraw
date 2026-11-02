/**
 * pen.dev accepts JSON with comments in `.pen` files. This turns such text into plain JSON: `//`
 * and block comments outside strings become spaces, keeping line breaks so a parse error still
 * points where it did, and a comma before a closing bracket or brace becomes a space, as readers
 * of JSON with comments allow. Text without comments or such commas comes back unchanged.
 */
export function stripJSONComments(text: string): string {
  if (!text.includes('/') && !text.includes(',')) return text
  const parts: string[] = []
  let copied = 0
  let index = 0
  const skipTo = (end: number, replacement: string) => {
    parts.push(text.slice(copied, index), replacement)
    copied = end
    index = end
  }
  while (index < text.length) {
    const char = text[index]
    const next = text[index + 1]
    if (char === '"') {
      index = stringEnd(text, index)
    } else if (char === '/' && next === '/') {
      const newline = text.indexOf('\n', index)
      const end = newline === -1 ? text.length : newline
      skipTo(end, blank(text.slice(index, end)))
    } else if (char === '/' && next === '*') {
      const close = text.indexOf('*/', index + 2)
      const end = close === -1 ? text.length : close + 2
      skipTo(end, blank(text.slice(index, end)))
    } else if (char === ',' && closesNext(text, index + 1)) {
      skipTo(index + 1, ' ')
    } else {
      index++
    }
  }
  parts.push(text.slice(copied))
  return parts.join('')
}

/** The end of the string literal opening at `start`, past its closing quote. */
function stringEnd(text: string, start: number): number {
  let index = start + 1
  while (index < text.length) {
    const char = text[index]
    if (char === '\\') index += 2
    else if (char === '"') return index + 1
    else index++
  }
  return text.length
}

/** Spaces in place of every character of `comment` but its line breaks. */
function blank(comment: string): string {
  return comment.replace(/[^\r\n]/g, ' ')
}

/** Whether a closing bracket or brace comes next, past whitespace and comments. */
function closesNext(text: string, from: number): boolean {
  let index = from
  while (index < text.length) {
    const char = text[index] ?? ''
    if (/\s/.test(char)) {
      index++
    } else if (char === '/' && text[index + 1] === '/') {
      const newline = text.indexOf('\n', index)
      if (newline === -1) return false
      index = newline
    } else if (char === '/' && text[index + 1] === '*') {
      const close = text.indexOf('*/', index + 2)
      if (close === -1) return false
      index = close + 2
    } else {
      return char === '}' || char === ']'
    }
  }
  return false
}
