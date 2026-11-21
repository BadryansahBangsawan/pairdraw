import { computed, ref, shallowRef, watch, watchEffect } from 'vue'

import { VIDEO_DEFAULTS, type VideoFormat } from '@pairdraw/core/io/formats/video'
import { framesOnPage } from '@pairdraw/core/prototype'

import { exportErrorDetail } from '@/app/document/export/errors'
import type { EditorStore } from '@/app/editor/active-store'

import { videoExportOpen } from './open'
import {
  exportPrototypeVideo,
  planVideoExport,
  videoExportDefaults,
  videoFormatsHere,
  type VideoExportSettings
} from './record'

/** Frame rates the dialog offers for each kind of file. */
export const VIDEO_FRAME_RATES: Record<VideoFormat, readonly number[]> = {
  mp4: [24, 30, 60],
  gif: [10, 15, 25],
  webm: [24, 30, 60]
}

/**
 * The Export prototype as video dialog's workflow: its choices, reset as it opens; the summary
 * of what it would record; the formats this browser can encode; and the recording, which closing
 * the dialog or Cancel stops.
 */
export function useVideoExport(store: EditorStore) {
  const open = videoExportOpen(store)
  const settings = ref<VideoExportSettings | null>(null)
  /** Follows the document's layers, which the frame list and the plan read. */
  const sceneComputed = <T>(read: () => T) =>
    computed(() => {
      void store.state.sceneVersion
      void store.state.currentPageId
      return read()
    })
  const frames = sceneComputed(() => framesOnPage(store.graph, store.state.currentPageId))
  const plan = sceneComputed(() => (settings.value ? planVideoExport(store, settings.value) : null))
  /** Formats this engine can encode at the planned size, GIF until the check answers. */
  const formats = shallowRef<readonly VideoFormat[]>(['gif'])
  const progress = ref<{ done: number; total: number } | null>(null)
  /** Why the last export failed, which the dialog shows until it opens again or retries. */
  const failure = ref<string | null>(null)
  let recording: AbortController | null = null

  watch(
    open,
    (isOpen) => {
      if (isOpen) {
        settings.value = videoExportDefaults(store)
        failure.value = null
      } else recording?.abort()
    },
    { immediate: true }
  )

  watchEffect((onCleanup) => {
    const chosen = settings.value
    if (plan.value?.kind !== 'ready' || !chosen) return
    // A check overtaken by another choice must not overwrite the newer answer.
    const request = { current: true }
    onCleanup(() => {
      request.current = false
    })
    void (async () => {
      const found = await videoFormatsHere(store, chosen)
      if (request.current) formats.value = found
    })()
  })

  function update(patch: Partial<VideoExportSettings>) {
    if (!settings.value) return
    settings.value = { ...settings.value, ...patch }
  }

  /** Another kind of file starts at that kind's usual frame rate. */
  function setFormat(format: VideoFormat) {
    update({ format, fps: VIDEO_DEFAULTS[format].fps })
  }

  async function record() {
    const chosen = settings.value
    if (!chosen || recording) return
    const controller = new AbortController()
    recording = controller
    failure.value = null
    progress.value = { done: 0, total: 0 }
    try {
      const saved = await exportPrototypeVideo(store, chosen, {
        signal: controller.signal,
        onProgress: (done, total) => {
          progress.value = { done, total }
        }
      })
      if (saved) open.value = false
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error('[Export] Could not export the video:', error)
        failure.value = exportErrorDetail(error)
      }
    } finally {
      recording = null
      progress.value = null
    }
  }

  function cancel() {
    if (recording) recording.abort()
    else open.value = false
  }

  return {
    open,
    settings,
    frames,
    plan,
    formats,
    progress,
    failure,
    update,
    setFormat,
    record,
    cancel
  }
}
