import { describe, expect, test } from 'bun:test'

import { buildComponent, createElement, resolveToTree } from '#design-jsx/index'

function root(source: string): { props: Record<string, unknown>; children: unknown[] } {
  const tree = resolveToTree(createElement(buildComponent(source), null))
  if (!tree || typeof tree !== 'object' || !('children' in tree) || !('props' in tree)) {
    throw new Error('expected an element')
  }
  return { props: tree.props, children: tree.children }
}

describe('buildComponent HTML comments', () => {
  test('keeps comment markup inside attribute strings', () => {
    expect(root('<Text content="<!-- hi -->" />').props.content).toBe('<!-- hi -->')
    expect(root("<Text name='<!-- n -->'>x</Text>").props.name).toBe('<!-- n -->')
  })

  test('keeps comment markup inside string literals in expressions', () => {
    expect(root("<Text>{'<!-- x -->'}</Text>").children).toEqual(['<!-- x -->'])
    expect(root('<Text>{"<!-- y -->"}</Text>').children).toEqual(['<!-- y -->'])
    expect(root('<Text>{`<!-- z -->`}</Text>').children).toEqual(['<!-- z -->'])
    expect(root("const label = '<!-- s -->'\nreturn <Text>{label}</Text>").children).toEqual([
      '<!-- s -->'
    ])
  })

  test('drops comments in JSX text that contains quotes or apostrophes', () => {
    expect(root('<Text>Note: "a <!-- c --> b"</Text>').children.join('')).toBe('Note: "a  b"')
    expect(root("<Text>Don't <!-- it's --> stop</Text>").children.join('')).toBe("Don't  stop")
  })

  test('drops comments between elements and statements', () => {
    expect(
      root("<!-- top -->\n<Frame>\n  <!-- note -->\n  <Text>Don't</Text> <!-- it's -->\n</Frame>")
        .children
    ).toHaveLength(1)
  })
})
