// The app's tour, prebuilt from `tools/generate/demo`; the docs config ensures it exists.
import demoFigURL from '#app-public/demo.fig?url'

import { CHAPTERS, sectionName, type TourChapter } from '@pairdraw/demo-tools/chapters'
import type { SceneNode } from '@pairdraw/scene-graph'

import { followAppTheme } from '@/app/demo/theme'
import type { EditorStore } from '@/app/editor/active-store'
import { resolvedAppTheme } from '@/app/shell/theme'

/** One download of the tour for every stage that shows a chapter of it. */
let tourBytes: Promise<ArrayBuffer> | null = null

function fetchTour(): Promise<ArrayBuffer> {
  if (tourBytes) return tourBytes
  const request = fetch(demoFigURL).then((response) => {
    if (!response.ok) throw new Error(`The tour is unavailable (${response.status})`)
    return response.arrayBuffer()
  })
  // A failed download is tried again by the next stage rather than shared.
  request.catch(() => {
    if (tourBytes === request) tourBytes = null
  })
  tourBytes = request
  return request
}

/** Opens the tour like any `.fig` file, in the theme the docs site shows, as `/demo` does. */
async function openTour(store: EditorStore): Promise<void> {
  // A File copies the bytes, so every stage decodes its own.
  await store.openFigFile(new File([await fetchTour()], 'Demo.fig'))
  followAppTheme(store, resolvedAppTheme)
}

function chapterSection(store: EditorStore, chapter: TourChapter): SceneNode {
  const name = sectionName(chapter)
  const section = store.graph
    .getChildren(store.state.currentPageId)
    .find((node) => node.name === name)
  if (!section) throw new Error(`The tour has no "${name}" chapter`)
  return section
}

/** The layer a chapter is about, by the name the tour gives it. */
function chapterSubject(store: EditorStore, chapter: TourChapter): SceneNode {
  const section = chapterSection(store, chapter)
  const subject = store.graph.getChildren(section.id).find((node) => node.name === chapter.subject)
  if (!subject) throw new Error(`"${section.name}" has no "${chapter.subject}"`)
  return subject
}

// Room around a framed layer, above it for the preview's workspace pill, and below it for the
// toolbar of stages that show one.
const FRAME_MARGIN = 24
const PREVIEW_PILL_INSET = 56
const TOOLBAR_INSET = 64
/** Small subjects are enlarged to fill the canvas, up to this zoom. */
const MAX_FRAME_ZOOM = 2

/** What sits over the canvas of a stage, and so the room a framed layer leaves for it. */
interface FrameInsets {
  /** The preview's workspace pill sits above the canvas. */
  preview?: boolean
  /** The tools sit along the bottom of the canvas. */
  toolbar?: boolean
}

/**
 * Fill the canvas with `node`, past the 100% that fitting stops at, so the rest of the tour,
 * its prose and its tip cards, stays out of view; the landing says those things itself.
 */
function frameNode(store: EditorStore, node: SceneNode, insets: FrameInsets = {}): void {
  const { x, y } = store.graph.getAbsolutePosition(node.id)
  const { width, height } = store.getViewportSize()
  const top = insets.preview ? PREVIEW_PILL_INSET : 0
  const bottom = insets.toolbar ? TOOLBAR_INSET : 0
  const zoom = Math.min(
    (width - FRAME_MARGIN * 2) / node.width,
    (height - FRAME_MARGIN * 2 - top - bottom) / node.height,
    MAX_FRAME_ZOOM
  )
  store.centerOn(x + node.width / 2, y + node.height / 2 + (bottom - top) / 2 / zoom, zoom)
}

/**
 * Leave the stage only what it shows. The chapter's heading and tip card beside `subject` are
 * hidden, since the landing says those things in its own words and language, and so are the other
 * chapters, which a stage that grows its subject would otherwise bring into view. Instances draw
 * from their own layers, so hiding the chapters that hold their main components changes nothing
 * they show. Like the tour's theme, none of this is an edit, so the stage opens with nothing to
 * undo or save.
 */
function isolateChapter(store: EditorStore, tourChapter: TourChapter, subject: SceneNode): void {
  const { graph } = store
  const section = chapterSection(store, tourChapter)
  const around = graph.getChildren(section.id).filter((node) => node.id !== subject.id)
  const others = graph
    .getChildren(store.state.currentPageId)
    .filter((node) => node.id !== section.id)
  graph.applyImportedStateDuring(() => {
    for (const node of [...around, ...others]) graph.updateNode(node.id, { visible: false })
  })
}

/** Opens the tour on one chapter's subject, with nothing else in view. */
async function chapter(
  store: EditorStore,
  tourChapter: TourChapter,
  options: FrameInsets & { select?: (subject: SceneNode) => string | undefined } = {}
): Promise<void> {
  await openTour(store)
  const subject = chapterSubject(store, tourChapter)
  isolateChapter(store, tourChapter, subject)
  frameNode(store, subject, { preview: options.preview, toolbar: options.toolbar })
  const selected = options.select?.(subject)
  if (selected) store.select([selected])
  if (options.preview) store.startPlay()
}

/** The first layer named `name` among `roots` and their layers, searching breadth first. */
function layerNamed(store: EditorStore, roots: readonly string[], name: string): string | null {
  const pending = [...roots]
  // The loop also reaches the layers it appends.
  for (const id of pending) {
    const node = store.graph.getNode(id)
    if (!node) continue
    if (node.name === name) return node.id
    pending.push(...node.childIds)
  }
  return null
}

/** The first layer under `node` with `name`. */
function descendant(store: EditorStore, node: SceneNode, name: string): string | undefined {
  return layerNamed(store, node.childIds, name) ?? undefined
}

export type SceneBuilder = (store: EditorStore) => Promise<void>

export const SCENES = {
  // The hero in preview: its background moves and the player is a working control.
  hero: (store) =>
    chapter(store, CHAPTERS.hello, {
      preview: true,
      select: (s) => descendant(store, s, 'Player')
    })
} satisfies Record<string, SceneBuilder>
