import { recordRuntimeError } from '@/app/diagnostics/events/runtime'

/** One skipped layer, recorded once per layer and error message. */
export function reportCanvasDrawFailure(nodeId: string, error: unknown): void {
  recordRuntimeError(error, 'canvas', nodeId)
}
