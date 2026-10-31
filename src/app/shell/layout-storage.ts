import { clamp } from 'es-toolkit'
import * as v from 'valibot'

import { IS_BROWSER } from '@open-pencil/core/constants'

const EDITOR_LAYOUT_KEY = 'open-pencil:editor-layout'

/** How wide each side panel is, in pixels; the canvas takes what is left of the window. */
export interface EditorLayout {
  layers: number
  properties: number
  /** The AI chat column's width while it is open. */
  chat: number
}

export type EditorSidePanel = keyof EditorLayout

/** How narrow and wide a person can make each side panel, in pixels. */
export const EDITOR_PANEL_LIMITS: Readonly<Record<EditorSidePanel, { min: number; max: number }>> =
  {
    layers: { min: 160, max: 480 },
    properties: { min: 200, max: 480 },
    chat: { min: 280, max: 640 }
  }

/** The layers panel's share of the window when the editor first opens. */
const DEFAULT_LAYERS_SHARE = 0.18
/**
 * How wide the properties panel opens, whatever the window's width: wide enough for its fields,
 * without growing on a large screen as a share of the window would.
 */
const DEFAULT_PROPERTIES_WIDTH = 256
/** How wide the chat column opens: room for a message and the changes it made. */
const DEFAULT_CHAT_WIDTH = 360
/** The window width a layout is made for before there is a window, as in tests. */
const NOMINAL_WINDOW_WIDTH = 1280

function clampWidth(panel: EditorSidePanel, width: number): number {
  const { min, max } = EDITOR_PANEL_LIMITS[panel]
  return clamp(width, min, max)
}

export function defaultEditorLayout(windowWidth: number): EditorLayout {
  return {
    layers: clampWidth('layers', windowWidth * DEFAULT_LAYERS_SHARE),
    properties: DEFAULT_PROPERTIES_WIDTH,
    chat: DEFAULT_CHAT_WIDTH
  }
}

const widthSchema = v.pipe(v.number(), v.finite(), v.minValue(0))
/** A width that is missing or broken is left out, so the panel opens at its default. */
const savedWidthSchema = v.fallback(v.optional(widthSchema), undefined)

const storedEditorLayoutSchema = v.pipe(
  v.string(),
  v.parseJson(),
  v.union([
    // Saved before the chat column: layers, canvas, and properties in percent of the window.
    v.strictTuple([widthSchema, widthSchema, widthSchema]),
    v.object({ layers: savedWidthSchema, properties: savedWidthSchema, chat: savedWidthSchema })
  ])
)

/**
 * Reads a saved layout for a window `windowWidth` pixels wide, keeping each valid width and
 * defaulting the rest. A layout saved in percent by earlier versions becomes the pixels it had.
 */
export function parseEditorLayout(text: string | null, windowWidth: number): EditorLayout {
  const fallback = defaultEditorLayout(windowWidth)
  const parsed = v.safeParse(storedEditorLayoutSchema, text)
  if (!parsed.success) return fallback
  const stored = Array.isArray(parsed.output)
    ? {
        layers: (parsed.output[0] / 100) * windowWidth,
        properties: (parsed.output[2] / 100) * windowWidth
      }
    : parsed.output
  return {
    layers: clampWidth('layers', stored.layers ?? fallback.layers),
    properties: clampWidth('properties', stored.properties ?? fallback.properties),
    chat: clampWidth('chat', stored.chat ?? fallback.chat)
  }
}

function windowWidth(): number {
  return IS_BROWSER && window.innerWidth > 0 ? window.innerWidth : NOMINAL_WINDOW_WIDTH
}

export function loadEditorLayout(): EditorLayout {
  if (!IS_BROWSER) return defaultEditorLayout(NOMINAL_WINDOW_WIDTH)
  try {
    return parseEditorLayout(window.localStorage.getItem(EDITOR_LAYOUT_KEY), windowWidth())
  } catch {
    return defaultEditorLayout(windowWidth())
  }
}

export function saveEditorLayout(layout: EditorLayout): void {
  if (!IS_BROWSER) return
  window.localStorage.setItem(EDITOR_LAYOUT_KEY, JSON.stringify(layout))
}
