/** How far an arrow key moves Shader Mode's clock, in seconds, and with Shift. */
export const SHADER_MODE_STEP_SECONDS = 0.1
export const SHADER_MODE_LARGE_STEP_SECONDS = 1

/**
 * What a key does in Shader Mode: Space plays or pauses, Home goes back to the start, and the
 * arrows step through the animation, which pauses it first so the frame stays to be looked at.
 */
export type ShaderModeKeyAction =
  | { kind: 'toggle' }
  | { kind: 'restart' }
  | { kind: 'step'; seconds: number }

type ShaderModeKey = Pick<KeyboardEvent, 'code' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey'>

/**
 * Shader Mode's keys, as a video player takes them: Space, K, Home, and the left and right
 * arrows, Shift making a step larger. Keys held with ⌘, Ctrl, or Alt belong to the app's own
 * shortcuts.
 */
export function shaderModeKeyAction(event: ShaderModeKey): ShaderModeKeyAction | null {
  if (event.metaKey || event.ctrlKey || event.altKey) return null
  const step = event.shiftKey ? SHADER_MODE_LARGE_STEP_SECONDS : SHADER_MODE_STEP_SECONDS
  switch (event.code) {
    case 'ArrowRight':
      return { kind: 'step', seconds: step }
    case 'ArrowLeft':
      return { kind: 'step', seconds: -step }
  }
  if (event.shiftKey) return null
  switch (event.code) {
    case 'Space':
    case 'KeyK':
      return { kind: 'toggle' }
    case 'Home':
      return { kind: 'restart' }
    default:
      return null
  }
}
