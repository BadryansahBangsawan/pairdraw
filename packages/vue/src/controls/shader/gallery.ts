import { isEqual, uniq } from 'es-toolkit'

import type { ShaderPreset } from '@open-pencil/scene-graph/shaders'

/**
 * Complete shaders a shader paint can start from in one click: each stacks a texture with the
 * filters and overlays that finish it, flat at the top level so the picker lists and edits every
 * effect. Colors are written out rather than left to the library's defaults, so a gallery that
 * cannot draw shaders still shows each one's palette.
 */

/** The shaders the gallery offers, by the name the app translates. */
export type ShaderGalleryId =
  | 'sunset'
  | 'northernLights'
  | 'retroScreen'
  | 'halftonePrint'
  | 'ditheredDusk'
  | 'glassOrb'
  | 'marble'
  | 'neonGrid'
  | 'velvet'

export interface ShaderGalleryEntry {
  id: ShaderGalleryId
  preset: ShaderPreset
}

/** The gallery in the order it is shown. */
export const SHADER_GALLERY: readonly ShaderGalleryEntry[] = [
  {
    id: 'sunset',
    preset: {
      components: [
        {
          type: 'MeshGradient',
          props: {
            stops: [
              { color: '#1b0b3a', position: 0 },
              { color: '#7b2cbf', position: 0.3 },
              { color: '#ff5b2e', position: 0.6 },
              { color: '#ff9e44', position: 0.8 },
              { color: '#ffd98e', position: 1 }
            ],
            seed: 12
          }
        },
        { type: 'FilmGrain', props: { strength: 0.2 } }
      ]
    }
  },
  {
    id: 'northernLights',
    preset: {
      components: [
        { type: 'SolidColor', props: { color: '#04101f' } },
        {
          type: 'Aurora',
          props: { colorA: '#7c3aed', colorB: '#22ee88', colorC: '#1694e8', intensity: 85 }
        },
        { type: 'FilmGrain', props: { strength: 0.15 } }
      ]
    }
  },
  {
    id: 'retroScreen',
    preset: {
      components: [
        { type: 'Plasma', props: { colorA: '#ff2e88', colorB: '#120024' } },
        { type: 'CRTScreen', props: { pixelSize: 96, scanlineIntensity: 0.45 } }
      ]
    }
  },
  {
    id: 'halftonePrint',
    preset: {
      components: [
        { type: 'Swirl', props: { colorA: '#1d4ed8', colorB: '#f97316' } },
        { type: 'Halftone', props: { style: 'cmyk', frequency: 80 } }
      ]
    }
  },
  {
    id: 'ditheredDusk',
    preset: {
      components: [
        {
          type: 'FlowingGradient',
          props: { colorA: '#0b1026', colorB: '#3b1d6e', colorC: '#ff5b2e', colorD: '#ffc46b' }
        },
        { type: 'Dither', props: { pattern: 'bayer8', pixelSize: 3, colorMode: 'source' } }
      ]
    }
  },
  {
    id: 'glassOrb',
    preset: {
      components: [
        {
          type: 'MeshGradient',
          props: {
            stops: [
              { color: '#0f172a', position: 0 },
              { color: '#2563eb', position: 0.4 },
              { color: '#22d3ee', position: 0.75 },
              { color: '#a7f3d0', position: 1 }
            ],
            seed: 4
          }
        },
        { type: 'Glass', props: { refraction: 1.2, aberration: 0.6 } }
      ]
    }
  },
  {
    id: 'marble',
    preset: {
      components: [
        { type: 'Marble', props: { colorA: '#f5f5f4', colorB: '#57534e', colorC: '#0c0a09' } },
        { type: 'Vignette', props: { intensity: 0.6 } }
      ]
    }
  },
  {
    id: 'neonGrid',
    preset: {
      components: [
        { type: 'SolidColor', props: { color: '#0a0614' } },
        { type: 'Grid', props: { color: '#ff2ea6', cells: 12, thickness: 2, softness: 0.2 } },
        { type: 'Glow', props: { intensity: 6, threshold: 0.3, size: 30 } }
      ]
    }
  },
  {
    id: 'velvet',
    preset: {
      components: [
        { type: 'Satin', props: { color: '#7f1d3a', highlightColor: '#e8798f' } },
        { type: 'LightLeak', props: { intensity: 0.25 } },
        { type: 'FilmGrain', props: { strength: 0.2 } }
      ]
    }
  }
]

/** The gallery shader `preset` is, unchanged; null once any of its effects was edited. */
export function shaderGalleryEntryOf(preset: ShaderPreset): ShaderGalleryEntry | null {
  return SHADER_GALLERY.find((entry) => isEqual(entry.preset, preset)) ?? null
}

const HEX_COLOR = /^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i

function colorsIn(value: unknown): string[] {
  if (typeof value === 'string') return HEX_COLOR.test(value) ? [value.toLowerCase()] : []
  if (Array.isArray(value)) return value.flatMap(colorsIn)
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(colorsIn)
  return []
}

/**
 * The colors `preset` sets, in the order its effects draw, without repeats and at most `limit` of
 * them: a palette that stands in for the shader where it cannot be drawn.
 */
export function shaderPresetColors(preset: ShaderPreset, limit = 4): string[] {
  const colors = preset.components.flatMap((component) => colorsIn(component.props))
  return uniq(colors).slice(0, limit)
}
