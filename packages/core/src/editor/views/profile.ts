import type { DocumentKind } from '@open-pencil/scene-graph'

import { BOARD_GRID } from '#core/constants'
import { BOARD_TOOL_SHORTCUTS, BOARD_TOOLS, TOOL_SHORTCUTS } from '#core/editor/tool-registry'
import type { Tool } from '#core/editor/types'

import type { CanvasView, EditorProfile, EditorProfileInputs, EditorRestrictions } from './types'

export const EDIT_VIEW: CanvasView = { id: 'edit' }

/**
 * The tools a read-only document keeps, as Figma's toolbar shows while a version is viewed, and
 * the zoom tool, which only navigates.
 */
export const READ_ONLY_TOOLS: ReadonlySet<Tool> = new Set<Tool>(['SELECT', 'HAND', 'ZOOM'])

/** What the document's kind decides: the tools and keys it offers and the grid it snaps to. */
type DocumentBehaviour = Pick<EditorProfile, 'edits' | 'tools' | 'toolKeys' | 'snapGrid'>

/** What the canvas's view decides: how the pointer, keys, chrome, and panels behave. */
type ViewBehaviour = Omit<EditorProfile, keyof DocumentBehaviour>

const DOCUMENT_BEHAVIOURS: Readonly<Record<DocumentKind, DocumentBehaviour>> = {
  design: { edits: true, tools: null, toolKeys: TOOL_SHORTCUTS, snapGrid: 1 },
  board: { edits: true, tools: BOARD_TOOLS, toolKeys: BOARD_TOOL_SHORTCUTS, snapGrid: BOARD_GRID }
}

const EDIT_BEHAVIOUR: ViewBehaviour = {
  pointer: 'tools',
  shortcuts: 'all',
  editChrome: true,
  live: null,
  panels: true,
  leaveTo: null
}

/** A preview runs the design: the canvas only pans, and its controls take the pointer. */
function playBehaviour(revision: number): ViewBehaviour {
  return {
    pointer: 'pan',
    shortcuts: 'view',
    editChrome: false,
    live: { revision },
    panels: false,
    leaveTo: EDIT_VIEW
  }
}

/**
 * Shader Mode shows one shader on its own, which plays in its own preview, so the canvas runs
 * nothing live; the panels give way to the shader's settings, and only the view's keys run.
 */
const SHADER_BEHAVIOUR: ViewBehaviour = {
  pointer: 'pan',
  shortcuts: 'view',
  editChrome: false,
  live: null,
  panels: false,
  leaveTo: EDIT_VIEW
}

function viewBehaviour(view: CanvasView): ViewBehaviour {
  // A presentation is a preview shown a slide at a time; the front end keeps it on its slide.
  if (view.id === 'present') return playBehaviour(view.revision)
  if (view.id === 'shader') return SHADER_BEHAVIOUR
  return view.id === 'play' ? playBehaviour(view.revision) : EDIT_BEHAVIOUR
}

/** Narrows a profile by the host's restrictions; a restriction only ever takes away. */
function restrict(profile: EditorProfile, restrictions: EditorRestrictions): EditorProfile {
  if (!restrictions.readOnly) return profile
  const kept = (tool: Tool) =>
    READ_ONLY_TOOLS.has(tool) || (restrictions.comments === true && tool === 'COMMENT')
  const offered = profile.tools ?? new Set<Tool>([...READ_ONLY_TOOLS, 'COMMENT'])
  const tools = new Set([...offered].filter(kept))
  return { ...profile, edits: false, tools }
}

/**
 * The profile a canvas behaves by: what its document is for, then the view it shows, narrowed by
 * the host's restrictions. Pass the pane's own state, since each pane shows its own view.
 */
export function resolveEditorProfile(state: EditorProfileInputs): EditorProfile {
  const profile = { ...DOCUMENT_BEHAVIOURS[state.documentKind], ...viewBehaviour(state.canvasView) }
  return restrict(profile, state.hostRestrictions)
}

/**
 * The tool, if the profile offers it, or Move: a tool the profile stops offering, as when a
 * document opens as a board, turns into one, or goes read-only, gives way to Move.
 */
export function offeredTool(state: EditorProfileInputs, tool: Tool): Tool {
  const { tools } = resolveEditorProfile(state)
  return !tools || tools.has(tool) ? tool : 'SELECT'
}
