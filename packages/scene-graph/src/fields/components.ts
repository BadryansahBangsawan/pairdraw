import type { SceneNode } from '../types'

/**
 * What makes a layer a main component beyond its type: its key, its properties and variant
 * specs, and how it is published to libraries.
 */
export const MAIN_COMPONENT_FIELDS = [
  'componentKey',
  'componentPropertyDefinitions',
  'variantPropSpecs',
  'sourceLibraryKey',
  'publishId',
  'overrideKey',
  'sharedSymbolVersion',
  'publishedVersion',
  'librarySource',
  'isPublishable',
  'isSymbolPublishable',
  'symbolDescription',
  'symbolLinks'
] as const satisfies readonly (keyof SceneNode)[]
