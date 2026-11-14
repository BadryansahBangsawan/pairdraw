import { clamp, mapValues } from 'es-toolkit'
import * as v from 'valibot'

import { IS_BROWSER } from '@pairdraw/core/constants'

const EDITOR_LAYOUT_KEY = 'pairdraw:editor-layout'

/**
 * How wide each side panel is, in pixels, with the inset that keeps its card off the window's edge;
 * the canvas takes what is left of the window.
 */
export interface EditorLayout {
  layers: number
  properties: number
  /** The AI chat column's width while it is open. */
  chat: number
}

export type EditorSidePanel = keyof EditorLayout

/**
 * The backdrop between a side panel's card and the window's edge, in pixels, which every width
 * here includes (`src/theme/editor/workspace.ts`).
 */
export const EDITOR_PANEL_INSET = 10

/** How narrow and wide a person can make each side panel, in pixels. */
export const EDITOR_PANEL_LIMITS: Readonly<Record<EditorSidePanel, { min: number; max: number }>> =
  {
    layers: { min: 160 + EDITOR_PANEL_INSET, max: 480 + EDITOR_PANEL_INSET },
    properties: { min: 200 + EDITOR_PANEL_INSET, max: 480 + EDITOR_PANEL_INSET },
    chat: { min: 280 + EDITOR_PANEL_INSET, max: 640 + EDITOR_PANEL_INSET }
  }

/**
 * How wide each panel opens, whatever the window's width: the layers panel room for a nested
 * tree, the properties panel for its fields, and the chat column for a message and the changes
 * it made. None grows on a large screen as a share of the window would.
 */
const DEFAULT_CARD_WIDTHS: Readonly<EditorLayout> = { layers: 240, properties: 256, chat: 320 }
/** The window width an old percent layout is read for before there is a window, as in tests. */
const NOMINAL_WINDOW_WIDTH = 1280

function clampWidth(panel: EditorSidePanel, width: number): number {
  const { min, max } = EDITOR_PANEL_LIMITS[panel]
  return clamp(width, min, max)
}

export function defaultEditorLayout(): EditorLayout {
  return mapValues(DEFAULT_CARD_WIDTHS, (width) => width + EDITOR_PANEL_INSET)
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
  const fallback = defaultEditorLayout()
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
  if (!IS_BROWSER) return defaultEditorLayout()
  try {
    return parseEditorLayout(window.localStorage.getItem(EDITOR_LAYOUT_KEY), windowWidth())
  } catch {
    return defaultEditorLayout()
  }
}

export function saveEditorLayout(layout: EditorLayout): void {
  if (!IS_BROWSER) return
  window.localStorage.setItem(EDITOR_LAYOUT_KEY, JSON.stringify(layout))
}
