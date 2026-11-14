import { readFileSync } from 'node:fs'

import { defineConfig } from 'tsdown'
import type { Rolldown } from 'tsdown'

/** Embeds `?raw` imports as text, so the published server carries the agent skill it serves. */
function rawText(): Rolldown.Plugin {
  return {
    name: 'raw-text',
    load(id) {
      if (id.endsWith('?raw')) {
        const path = id.slice(0, -'?raw'.length)
        return `export default ${JSON.stringify(readFileSync(path, 'utf8'))}`
      }
    }
  }
}

export default defineConfig({
  entry: {
    index: './src/index.ts',
    connect: './src/connect.ts',
    server: './src/server.ts',
    stdio: './src/stdio.ts',
    transport: './src/transport/paths.ts',
    discovery: './src/transport/discovery.ts',
    tools: './src/tool/index.ts'
  },
  plugins: [rawText()],
  platform: 'node',
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: './dist',
  treeshake: false,
  deps: {
    neverBundle: [
      '@hono/node-server',
      '@modelcontextprotocol/server',
      '@pairdraw/core',
      /^@pairdraw\/core\//,
      'hono',
      /^hono\//,
      'package-manager-detector',
      /^package-manager-detector\//,
      'ws',
      'zod',
      /^node:/
    ],
    onlyBundle: false
  }
})
