import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: './src/index.ts',
    'commands/index': './src/commands/index.ts',
    'library/index': './src/library/index.ts'
  },
  platform: 'node',
  format: ['esm'],
  sourcemap: true,
  clean: true,
  outDir: './dist',
  treeshake: false,
  deps: {
    alwaysBundle: ['@pairdraw/mcp', /^@pairdraw\/mcp\//],
    neverBundle: ['@pairdraw/core', /^@pairdraw\/core\//, 'canvaskit-wasm', /^node:/],
    onlyBundle: false
  }
})
