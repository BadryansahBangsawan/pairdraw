import { describe, expect, test } from 'bun:test'

import { parseShellLine } from '#cli/shell/parse'

describe('shell line parsing', () => {
  test('reads a tool call with no arguments, JSON after a space, or JSON in parentheses', () => {
    expect(parseShellLine('list_pages')).toEqual({ kind: 'call', name: 'list_pages', args: {} })
    expect(parseShellLine('create_page {"name": "Home"}')).toEqual({
      kind: 'call',
      name: 'create_page',
      args: { name: 'Home' }
    })
    expect(parseShellLine('  create_page({"name": "Home"});  ')).toEqual({
      kind: 'call',
      name: 'create_page',
      args: { name: 'Home' }
    })
    expect(parseShellLine('list_pages()')).toEqual({ kind: 'call', name: 'list_pages', args: {} })
  })

  test('refuses tool arguments that are not one JSON object', () => {
    expect(() => parseShellLine('create_page [1]')).toThrow('Tool arguments must be a JSON object')
    expect(() => parseShellLine('create_page {"name": ')).toThrow(
      'Tool arguments must be a JSON object'
    )
    expect(() => parseShellLine('create_page "Home"')).toThrow(
      'Tool arguments must be a JSON object'
    )
  })

  test('reads the session commands with an optional quoted or bare argument', () => {
    expect(parseShellLine('save()')).toEqual({ kind: 'save', path: undefined })
    expect(parseShellLine('save("out/design.fig")')).toEqual({
      kind: 'save',
      path: 'out/design.fig'
    })
    expect(parseShellLine('save design.fig')).toEqual({ kind: 'save', path: 'design.fig' })
    expect(parseShellLine('preview("page.png")')).toEqual({ kind: 'preview', path: 'page.png' })
    expect(parseShellLine('help("set_fill")')).toEqual({ kind: 'help', topic: 'set_fill' })
    expect(parseShellLine('help')).toEqual({ kind: 'help', topic: undefined })
    expect(parseShellLine('tools()')).toEqual({ kind: 'tools' })
    expect(parseShellLine('exit()')).toEqual({ kind: 'exit' })
    expect(parseShellLine('.exit')).toEqual({ kind: 'exit' })
    expect(parseShellLine('quit')).toEqual({ kind: 'exit' })
  })

  test('refuses a session argument that is not one path or name', () => {
    expect(() => parseShellLine('save(two words.fig)')).toThrow('in double quotes')
    expect(() => parseShellLine("save('single.fig')")).toThrow('in double quotes')
  })

  test('skips blank lines and comments', () => {
    expect(parseShellLine('')).toEqual({ kind: 'empty' })
    expect(parseShellLine('   ')).toEqual({ kind: 'empty' })
    expect(parseShellLine('# make the hero')).toEqual({ kind: 'empty' })
    expect(parseShellLine('// make the hero')).toEqual({ kind: 'empty' })
  })

  test('names a line that is not a command', () => {
    expect(() => parseShellLine('{"name": "Home"}')).toThrow('Type help for the syntax')
  })
})
