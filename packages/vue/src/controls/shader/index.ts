export { loadShaderCatalog, shaderEffectLabel } from './catalog'
export { SHADER_GALLERY, shaderGalleryEntryOf, shaderPresetColors } from './gallery'
export { shaderEffectPreview, shaderGalleryPreview } from './preview'
export { SHADER_SHAPES, shaderShapeType, withShapeType } from './shapes'
export { addStop, removeStop, setStopColor, setStopPosition, shaderStops } from './stops'
export type { ShaderEffect, ShaderPropControl } from './catalog'
export type { ShaderGalleryEntry, ShaderGalleryId } from './gallery'
export type { ShaderStop } from './stops'
export type { ShaderShape } from './shapes'
export {
  addShaderEffect,
  DEFAULT_SHADER_EFFECT,
  DEFAULT_SHADER_PRESET,
  DEFAULT_SHADER_SOURCE,
  moveShaderEffect,
  parseShaderPreset,
  removeShaderEffect,
  setShaderEffectProp,
  shaderPresetJSON
} from './preset'
