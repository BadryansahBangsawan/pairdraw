import type { TestId } from '@pairdraw/vue/testing'

export type CanvasContextActionId =
  | 'copy-as-text'
  | 'copy-as-svg'
  | 'copy-as-png'
  | 'copy-as-jsx'
  | 'copy-as-html'
  | 'copy-node-id'
  | 'copy-xpath'
  | 'copy-properties'
  | 'paste-properties'

type CanvasContextLabelKey =
  | 'copyAsText'
  | 'copyAsSVG'
  | 'copyAsPNG'
  | 'copyAsJSX'
  | 'copyAsHTML'
  | 'copyNodeId'
  | 'copyXPath'
  | 'copyProperties'
  | 'pasteProperties'

export type CanvasContextActionMeta = {
  id: CanvasContextActionId
  labelKey: CanvasContextLabelKey
  shortcut?: string
  testId?: TestId
}

export const CANVAS_COPY_AS_GROUP_TEST_ID = 'context-copy-paste-as' satisfies TestId
export const CANVAS_VECTORIZE_TEST_ID = 'context-vectorize' satisfies TestId
export const CANVAS_IMAGE_AI_TEST_ID = 'context-image-ai' satisfies TestId
export const CANVAS_REMOVE_BACKGROUND_TEST_ID = 'context-remove-background' satisfies TestId
export const CANVAS_REPLACE_BACKGROUND_TEST_ID = 'context-replace-background' satisfies TestId
export const CANVAS_GENERATE_IMAGE_FILL_TEST_ID = 'context-generate-image-fill' satisfies TestId
export const CANVAS_RUN_STICKY_PROMPT_TEST_ID = 'context-run-sticky-prompt' satisfies TestId
export const COPY_AS_PNG_SHORTCUT = 'MOD+SHIFT+C'

export const CANVAS_COPY_AS_ACTIONS = [
  { id: 'copy-as-text', labelKey: 'copyAsText' },
  { id: 'copy-as-svg', labelKey: 'copyAsSVG', testId: 'context-copy-as-svg' },
  { id: 'copy-as-png', labelKey: 'copyAsPNG', shortcut: COPY_AS_PNG_SHORTCUT },
  { id: 'copy-as-jsx', labelKey: 'copyAsJSX', testId: 'context-copy-as-jsx' },
  // No shortcut: Cmd+Alt+C stays Copy properties, as in Figma.
  { id: 'copy-as-html', labelKey: 'copyAsHTML', testId: 'context-copy-as-html' },
  { id: 'copy-node-id', labelKey: 'copyNodeId' },
  { id: 'copy-xpath', labelKey: 'copyXPath' }
] satisfies CanvasContextActionMeta[]

/** Figma lists these under Copy/Paste as, after the copy formats. */
export const CANVAS_PROPERTIES_ACTIONS = [
  {
    id: 'copy-properties',
    labelKey: 'copyProperties',
    shortcut: 'MOD+ALT+C',
    testId: 'context-copy-properties'
  },
  {
    id: 'paste-properties',
    labelKey: 'pasteProperties',
    shortcut: 'MOD+ALT+V',
    testId: 'context-paste-properties'
  }
] satisfies CanvasContextActionMeta[]
