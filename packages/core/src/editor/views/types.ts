import type { Vector } from '@open-pencil/scene-graph/primitives'

import type { EditorState, Tool } from '#core/editor/types'
import type { ViewportTransform } from '#core/geometry/types'

/**
 * What the host takes away from every view, whatever the canvas shows: a read-only document, as
 * for a viewer or an earlier version, can be looked at, selected in, and copied from, not changed.
 */
export interface EditorRestrictions {
  readOnly: boolean
  /**
   * Whether a read-only document still takes comments, as for someone who can comment on a shared
   * document: the Comment tool stays on offer.
   */
  comments?: boolean
}

/**
 * How a presentation sizes its slide: fitted whole to the screen, or at 100% so a long page
 * scrolls, as a website does.
 */
export type PresentationScale = 'fit' | 'actual'

/** The world point at the screen's center and the zoom, as a presentation places the canvas. */
export type ViewportCenter = Vector & { zoom: number }

/** The canvas's pan and zoom, which a presentation returns to. */
export type ViewportPlace = ViewportTransform

/**
 * A presentation: the design running as a preview, one slide (a top-level frame of the page) at a
 * time. It keeps the pan and zoom the canvas had, so leaving it returns there, however the
 * screen changed size meanwhile.
 */
export interface PresentView {
  id: 'present'
  revision: number
  slideId: string
  scale: PresentationScale
  returnTo: ViewportPlace
}

/**
 * Shader Mode: one shader paint of a layer shown large on its own, to play, scrub, and tune. The
 * paint is named by its image, which stays with the shader however the layer's paints move.
 */
export interface ShaderView {
  id: 'shader'
  nodeId: string
  image: string
}

/**
 * What a canvas pane shows: the design being edited, the design running as a preview whose
 * controls respond to the pointer, that preview presented a slide at a time, or one shader in
 * Shader Mode. Each pane has its own.
 */
export type CanvasView =
  | { id: 'edit' }
  | { id: 'play'; revision: number }
  | PresentView
  | ShaderView

/**
 * How the editor behaves for a canvas, resolved from what the document is for and the view it
 * shows. Front ends read these values
 * rather than asking which view is showing, so a new view is a new profile, not a new branch at
 * every place that behaves differently.
 */
export interface EditorProfile {
  /** What the pointer does on the canvas: every tool, or only panning and zooming. */
  pointer: 'tools' | 'pan'
  /** Which shortcuts run: every one, or only those that switch or leave the view. */
  shortcuts: 'all' | 'view'
  /** Whether the canvas draws what editing needs: selection, hover, pixel grid, and rulers. */
  editChrome: boolean
  /**
   * The run of layers that hold controls as live components, and of animated shaders; a new
   * revision starts them afresh. Null while layers draw as designed.
   */
  live: { revision: number } | null
  /** Whether the editor's panels stay beside a canvas shown on its own. */
  panels: boolean
  /** The view leaving this one returns to, as Escape does, or null when there is none. */
  leaveTo: CanvasView | null
  /**
   * Whether the document can change: actions that edit it, undo, and the canvas's edit handles,
   * text editing, value scrubbing, guide editing, and layer drags.
   */
  edits: boolean
  /** The tools on offer, or null for every tool. */
  tools: ReadonlySet<Tool> | null
  /** Which tool each key picks, by key code (`KeyR`, `Shift+KeyS`). */
  toolKeys: Readonly<Partial<Record<string, Tool>>>
  /**
   * The grid moves, resizes, and placements land on while Snap to pixel grid is on, in canvas
   * units: whole pixels in a design, FigJam's 16 on a board.
   */
  snapGrid: number
}

/** The state a profile resolves from: the document's kind, the pane's view, and the host's limits. */
export type EditorProfileInputs = Pick<
  EditorState,
  'documentKind' | 'canvasView' | 'hostRestrictions'
>
