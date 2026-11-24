import { readFile } from 'node:fs/promises'

import type { Root } from 'mdast'
import { fromMarkdown } from 'mdast-util-from-markdown'

import { headingText, sectionEnd } from './changelog/validate'

/**
 * The changelog section for `version`, as written: everything between its `## x.y.z — date`
 * heading and the next release's, Markdown and HTML comments in code spans included, which a
 * changelog parser that renders the section would strip.
 */
export async function readReleaseNotes(path: string, version: string): Promise<string> {
  const source = await readFile(path, 'utf8')
  const children = (fromMarkdown(source) as Root).children
  const index = children.findIndex(
    (node) =>
      node.type === 'heading' &&
      node.depth === 2 &&
      headingText(node).split(' — ')[0]?.trim() === version
  )
  if (index === -1) throw new Error(`Changelog section not found for ${version}`)
  const start = children[index]?.position?.end.offset
  const end = children[sectionEnd(children, index)]?.position?.start.offset
  const notes = source.slice(start, end).trim()
  if (!notes) throw new Error(`Changelog section is empty for ${version}`)
  return `${notes}\n`
}
