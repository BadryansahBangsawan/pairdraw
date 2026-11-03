import { describe, expect, test } from 'bun:test'

import dedent from 'dedent'

import { removeNestedMember, setNestedMember } from '@/app/automation/mcp/clients/json/edit'
import { parseJSONTree, treeValue } from '@/app/automation/mcp/clients/json/tree'

const ENTRY = { command: 'server' }

function valueOf(text: string): unknown {
  const tree = parseJSONTree(text)
  return tree ? treeValue(tree) : undefined
}

describe('JSON with comments tree', () => {
  test('reads comments, trailing commas, escapes, and a byte order mark', () => {
    const text = '﻿{ // servers\n "a": [1, -2.5e3, true, null,], /* x */ "b\\u0041\\n": "\\"q\\"", }'
    expect(valueOf(text)).toEqual({ a: [1, -2500, true, null], 'bA\n': '"q"' })
  })

  test('refuses text that is not JSON', () => {
    for (const text of ['{', '{"a" 1}', '{"a": 1} x', "{'a': 1}", '{"a": tru}', '/* open']) {
      expect(parseJSONTree(text)).toBeNull()
    }
  })

  test('keeps a key named like a prototype property as data', () => {
    const value = valueOf('{"__proto__": {"polluted": true}}')
    expect(Object.keys(value as object)).toEqual(['__proto__'])
    expect(Object.getPrototypeOf(value)).toBe(Object.prototype)
  })
})

describe('setting a nested member', () => {
  test('adds the member in the indentation the file uses and keeps comments', () => {
    const text = dedent`
      {
          // my servers
          "mcpServers": {
              "other": { "command": "x" } // keep me
          },
          "theme": "dark"
      }
    `
    expect(setNestedMember(text, 'mcpServers', 'open-pencil', ENTRY)).toBe(dedent`
      {
          // my servers
          "mcpServers": {
              "other": { "command": "x" }, // keep me
              "open-pencil": {
                  "command": "server"
              }
          },
          "theme": "dark"
      }
    `)
  })

  test('adds the servers object when the file has none', () => {
    const text = '{\n\t"theme": "dark"\n}\n'
    const edited = setNestedMember(text, 'servers', 'open-pencil', ENTRY)
    expect(edited).toBe(
      '{\n\t"theme": "dark",\n\t"servers": {\n\t\t"open-pencil": {\n\t\t\t"command": "server"\n\t\t}\n\t}\n}\n'
    )
  })

  test('fills an empty servers object and an empty document', () => {
    expect(valueOf(setNestedMember('{ "mcp": {} }', 'mcp', 'k', ENTRY) ?? '')).toEqual({
      mcp: { k: ENTRY }
    })
    expect(setNestedMember('', 'mcp', 'k', ENTRY)).toBe(
      '{\n  "mcp": {\n    "k": {\n      "command": "server"\n    }\n  }\n}\n'
    )
  })

  test('keeps a file on one line on one line', () => {
    expect(setNestedMember('{"mcpServers":{"a":{"command":"x"}}}', 'mcpServers', 'b', ENTRY)).toBe(
      '{"mcpServers":{"a":{"command":"x"}, "b": {"command":"server"}}}'
    )
  })

  test('keeps trailing commas and Windows line breaks', () => {
    const text = '{\r\n  "mcpServers": {\r\n    "a": 1,\r\n  },\r\n}\r\n'
    const edited = setNestedMember(text, 'mcpServers', 'b', 2)
    expect(edited).toBe('{\r\n  "mcpServers": {\r\n    "a": 1,\r\n    "b": 2,\r\n  },\r\n}\r\n')
  })

  test('replaces an existing member in place', () => {
    const text = '{\n  "s": {\n    "k": {"command": "old"},\n    "z": 1\n  }\n}'
    expect(valueOf(setNestedMember(text, 's', 'k', ENTRY) ?? '')).toEqual({ s: { k: ENTRY, z: 1 } })
  })

  test('refuses a document that is not an object of objects there', () => {
    expect(setNestedMember('[]', 's', 'k', ENTRY)).toBeNull()
    expect(setNestedMember('{"s": []}', 's', 'k', ENTRY)).toBeNull()
    expect(setNestedMember('{"s": ', 's', 'k', ENTRY)).toBeNull()
  })
})

describe('removing a nested member', () => {
  const servers = dedent`
    {
      "mcpServers": {
        "first": { "command": "a" },
        "open-pencil": {
          "command": "openpencil-mcp"
        },
        // about last
        "last": { "command": "b" }
      }
    }
  `

  test('removes a middle member with its lines and keeps the next comment', () => {
    expect(removeNestedMember(servers, 'mcpServers', 'open-pencil')).toBe(dedent`
      {
        "mcpServers": {
          "first": { "command": "a" },
          // about last
          "last": { "command": "b" }
        }
      }
    `)
  })

  test('removes the last member and the comma before it', () => {
    const text = '{\n  "s": {\n    "a": 1, // note\n    "k": 2\n  }\n}\n'
    expect(removeNestedMember(text, 's', 'k')).toBe('{\n  "s": {\n    "a": 1 // note\n  }\n}\n')
  })

  test('removes the only member and members on one line', () => {
    expect(removeNestedMember('{"s": {"k": 1}}', 's', 'k')).toBe('{"s": {}}')
    expect(removeNestedMember('{"s": {"a": 1, "k": 2, "b": 3}}', 's', 'k')).toBe(
      '{"s": {"a": 1, "b": 3}}'
    )
    expect(removeNestedMember('{"s": {"a": 1, "k": 2}}', 's', 'k')).toBe('{"s": {"a": 1}}')
  })

  test('removes the only member and keeps the comments in its object', () => {
    const text = dedent`
      {
        "mcpServers": {
          // keep me
          "open-pencil": {
            "command": "openpencil-mcp"
          } // ours
          /* and me */
        }
      }
    `
    expect(removeNestedMember(text, 'mcpServers', 'open-pencil')).toBe(dedent`
      {
        "mcpServers": {
          // keep me
          /* and me */
        }
      }
    `)
    expect(removeNestedMember('{\n  "s": {\n    "k": 1,\n  }\n}', 's', 'k')).toBe('{\n  "s": {}\n}')
    expect(removeNestedMember('{"s": { /* c */ "k": 1 }}', 's', 'k')).toBe('{"s": { /* c */ }}')
  })

  test('removes a repeated key everywhere it appears', () => {
    const edited = removeNestedMember('{"s": {"k": 1, "a": 2, "k": 3}}', 's', 'k')
    expect(valueOf(edited ?? '')).toEqual({ s: { a: 2 } })
  })

  test('leaves a document without the member unchanged', () => {
    expect(removeNestedMember('{"x": 1}', 's', 'k')).toBe('{"x": 1}')
    expect(removeNestedMember('nope', 's', 'k')).toBeNull()
  })
})
