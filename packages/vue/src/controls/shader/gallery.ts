import { isEqual, uniq } from 'es-toolkit'

import type { ShaderPreset } from '@pairdraw/scene-graph/shaders'

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
  | 'liquidChrome'
  | 'flutedGlass'
  | 'paperStock'
  | 'godRays'
  | 'thermal'
  | 'voronoiCells'
  | 'deepWater'
  | 'smokePlume'
  | 'neonPulse'
  | 'grainWash'
  | 'obsidian'
  | 'marbleInk'

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
  },
  {
    id: 'liquidChrome',
    preset: {
      components: [
        {
          type: 'LiquidMetal',
          props: {
            lightColor: '#f5f7fa',
            darkColor: '#1c1f26',
            turbulence: 0.55,
            ripple: 1.2,
            sharpness: 0.8,
            dispersion: 0.25,
            speed: 0.35
          }
        },
        { type: 'FilmGrain', props: { strength: 0.08, bias: 0.04 } }
      ]
    }
  },
  {
    id: 'flutedGlass',
    preset: {
      components: [
        {
          type: 'FlowingGradient',
          props: {
            colorA: '#0f1b2d',
            colorB: '#1f4b6e',
            colorC: '#8fd3ff',
            colorD: '#f5f9ff',
            distortion: 0.7,
            speed: 0.2
          }
        },
        {
          type: 'FlutedGlass',
          props: {
            frequency: 18,
            refraction: 0.6,
            aberration: 0.3,
            highlight: 0.5,
            edges: 'mirror',
            speed: 0.2
          }
        }
      ]
    }
  },
  {
    id: 'paperStock',
    preset: {
      components: [
        {
          type: 'FlowingGradient',
          props: { colorA: '#efe7d8', colorB: '#e2d6c2', distortion: 0.2, speed: 0 }
        },
        {
          type: 'Paper',
          props: { roughness: 0.65, grainScale: 0.8, displacement: 0.25, seed: 7 }
        }
      ]
    }
  },
  {
    id: 'godRays',
    preset: {
      components: [
        {
          type: 'Godrays',
          props: {
            rayColor: '#ffe9b0',
            backgroundColor: '#0b0a12',
            density: 0.7,
            intensity: 0.9,
            spotty: 0.3,
            speed: 0.15
          }
        },
        { type: 'FilmGrain', props: { strength: 0.12 } }
      ]
    }
  },
  {
    id: 'thermal',
    preset: {
      components: [
        {
          type: 'Heatmap',
          props: {
            colorA: '#08131f',
            colorB: '#f7f3cf',
            stops: [
              { color: '#08131f', position: 0 },
              { color: '#1d6fb8', position: 0.3 },
              { color: '#f2d21a', position: 0.55 },
              { color: '#f08a24', position: 0.78 },
              { color: '#e0212f', position: 1 }
            ],
            innerGlow: 0.6,
            outerGlow: 0.4,
            contour: 0.2,
            speed: 0.3
          }
        },
        { type: 'FilmGrain', props: { strength: 0.06 } }
      ]
    }
  },
  {
    id: 'voronoiCells',
    preset: {
      components: [
        {
          type: 'Voronoi',
          props: {
            colorA: '#101820',
            colorB: '#3fb6a8',
            colorBorder: '#e8fff9',
            scale: 9,
            edgeIntensity: 0.7,
            edgeSoftness: 0.15,
            seed: 21,
            speed: 0.1
          }
        },
        { type: 'FilmGrain', props: { strength: 0.08 } }
      ]
    }
  },
  {
    id: 'deepWater',
    preset: {
      components: [
        {
          type: 'Water',
          props: {
            waterColor: '#0a2a43',
            clarity: 0.55,
            depth: 0.8,
            shallows: 0.35,
            caustics: 0.6,
            causticScale: 2.4,
            choppiness: 0.35,
            waveScale: 1.2,
            reflection: 0.4,
            foam: 0.15,
            speed: 0.25
          }
        },
        {
          type: 'LightLeak',
          props: {
            colorHot: '#9fe2ff',
            colorMid: '#1f4b6e',
            intensity: 0.25,
            spread: 0.6,
            speed: 0.15
          }
        },
        { type: 'FilmGrain', props: { strength: 0.06 } }
      ]
    }
  },
  {
    id: 'smokePlume',
    preset: {
      components: [
        {
          type: 'SmokeFill',
          props: {
            colorA: '#ffffff',
            colorB: '#6d6a75',
            direction: 90,
            speed: 0.25,
            spread: 0.5,
            emitRadius: 0.2,
            intensity: 0.8,
            dissipation: 0.55,
            detail: 0.6,
            gravity: 0.05,
            colorDecay: 0.4
          }
        },
        { type: 'FilmGrain', props: { strength: 0.05 } }
      ]
    }
  },
  {
    id: 'neonPulse',
    preset: {
      components: [
        {
          type: 'LightEdge',
          props: {
            colorA: '#ff2fb3',
            colorB: '#22d3ee',
            stops: [
              { color: '#ff2fb3', position: 0 },
              { color: '#22d3ee', position: 1 }
            ],
            thickness: 0.35,
            softness: 0.5,
            intensity: 0.9,
            bloom: 0.7,
            spots: 3,
            pulse: 0.6,
            smoke: 0.2,
            speed: 0.5
          }
        },
        { type: 'FilmGrain', props: { strength: 0.06 } }
      ]
    }
  },
  {
    id: 'grainWash',
    preset: {
      components: [
        {
          type: 'FlowingGradient',
          props: {
            colorA: '#0b1026',
            colorB: '#243b80',
            colorC: '#7c5cff',
            colorD: '#ffb86b',
            distortion: 0.7,
            speed: 0.25
          }
        },
        { type: 'FilmGrain', props: { strength: 0.18, bias: 0.05 } }
      ]
    }
  },
  {
    id: 'obsidian',
    preset: {
      components: [
        {
          type: 'Obsidian',
          props: {
            bodyColor: '#0a0b0f',
            colorA: '#3b0f52',
            colorB: '#0f6b6b',
            iridescence: 0.5,
            rimWidth: 0.25,
            rimSoftness: 0.3,
            flowScale: 1.6,
            gloss: 0.7,
            bevelWidth: 0.2,
            speed: 0.2
          }
        },
        { type: 'FilmGrain', props: { strength: 0.06 } }
      ]
    }
  },
  {
    id: 'marbleInk',
    preset: {
      components: [
        {
          type: 'Marble',
          props: {
            colorA: '#f7f4ee',
            colorB: '#20232b',
            colorC: '#8a8f9a',
            turbulence: 8,
            scale: 1.4,
            speed: 0.05
          }
        },
        {
          type: 'Halftone',
          props: {
            style: 'cmyk',
            frequency: 70,
            paperColor: '#f7f4ee',
            cyanColor: '#00a6c9',
            magentaColor: '#e0218a',
            yellowColor: '#f2d21a',
            blackColor: '#111111',
            misprint: 0.005
          }
        }
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
