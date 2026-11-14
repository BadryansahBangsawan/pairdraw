import fsd from '@feature-sliced/steiger-plugin'
import { defineConfig } from 'steiger'

import { pairdrawArchitecturePlugin } from './tools/checks/architecture/src/steiger-rules/index.ts'

// Pairdraw is not laid out as canonical Feature-Sliced Design layers.
// Keep Steiger focused on project-specific architecture boundaries instead of
// enabling fsd.configs.recommended, which treats src/ and packages/ as FSD layer typos.
export default defineConfig([
  fsd.plugin,
  pairdrawArchitecturePlugin,
  {
    ignores: [
      '.claude/**',
      'node_modules/**',
      'dist/**',
      'desktop/**',
      'public/**',
      'scratch/**',
      'demo-recordings/**'
    ]
  },
  {
    rules: {
      'pairdraw/prefer-domain-folders-over-filename-prefixes': 'error',
      'pairdraw/strict-test-file-placement': 'error',
      'pairdraw/no-engine-only-assertions-in-e2e': 'error',
      'pairdraw/no-e2e-imports-in-engine-tests': 'error',
      'pairdraw/no-root-markdown-clutter': 'error',
      'pairdraw/no-prototype-or-generated-imports': 'error',
      'pairdraw/no-property-panel-imports-in-canvas': 'error',
      'pairdraw/no-app-imports-in-workspace-packages': 'error',
      'pairdraw/no-package-internals-in-app': 'error',
      'pairdraw/no-foreign-package-local-aliases': 'error',
      'pairdraw/no-app-imports-components-or-views': 'error',
      'pairdraw/no-components-import-views': 'error',
      'pairdraw/no-views-imported-outside-entry': 'error',
      'pairdraw/no-editor-imports-in-cloud-portal': 'error',
      'pairdraw/no-tailwind-variants-in-themes': 'error',
      'pairdraw/no-non-ui-imports-in-shared-ui': 'error',
      'pairdraw/no-app-imports-in-shared-ui': 'error',
      'pairdraw/no-property-panel-internals-outside-panel': 'error',
      'pairdraw/no-production-test-ids-in-shared-layers': 'error',
      'pairdraw/no-native-title-attributes-in-vue': 'error',
      'pairdraw/no-ui-imports-in-core': 'error',
      'pairdraw/no-graph-builders-in-front-ends': 'error',
      'pairdraw/scripts-are-entrypoint-shims': 'error',
      'pairdraw/strict-tools-layout': 'error',
      'pairdraw/unique-component-names': 'error',
      'pairdraw/multi-word-component-names': 'error'
    }
  }
])
