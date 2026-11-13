import { expect, test } from 'bun:test'

import { readStoredPlugins } from '@/app/plugins/storage'

function entry(id: string) {
  return {
    id,
    name: 'Marks',
    version: '1.0.0',
    source: 'return 1',
    command: 'Mark',
    capabilities: ['document:read'],
    enabled: true,
    grants: [],
    asked: true
  }
}

test('a stored catalog keeps one entry per plugin id', () => {
  const plugins = readStoredPlugins(
    JSON.stringify({ version: 1, plugins: [entry('marks'), entry('marks')] })
  )
  expect(plugins.map((plugin) => plugin.id)).toEqual(['marks'])
})
