// SceneGraph → HTML and JSX without the CSS runtimes, so browsers can bundle it.
export {
  designNodeDraws,
  paintsSomething,
  sceneGraphToDesignDocument,
  sceneNodeToDesignDocument,
  sceneNodesToDesignDocument,
  type SceneGraphToDesignOptions,
  type VectorElementRenderer
} from './projection'
export { exportHTMLBundle } from './bundle'
export {
  designDocumentToTailwindJSX,
  sceneNodesToTailwindJSX,
  sceneNodesToTailwindJSXWithLayers,
  type TailwindJSXWithLayers
} from './tailwind-jsx'
export { serializeHTML } from './html'
export {
  LAYER_COMPONENT_FRAMEWORKS,
  layerComponents,
  layerMarkup,
  type LayerComponent,
  type LayerComponentFramework,
  type LayerMarkup
} from './components/layers'
export { COMPONENT_STYLINGS, type ComponentStyling } from './components/styling'
export {
  ICON_PACKAGES,
  iconPackagesFor,
  isIconPackage,
  type IconFramework,
  type IconPackage
} from './components/icons'
export * from '../tokens'
export * from '../behaviours'
export type {
  ExportHTMLBundle,
  ExportHTMLBundleOptions,
  ExportHTMLFile,
  TailwindStylesheetId,
  TailwindStylesheetLoader,
  WebFontFaceAsset,
  WebFontFaceRequest,
  WebFontFaceResolver
} from './bundle'
export type { DesignDocument, DesignElement, DesignNode } from '../types'
