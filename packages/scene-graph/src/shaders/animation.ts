import type { ShaderComponent, ShaderPreset } from './schema'

/**
 * What the library says of an effect's motion: whether it is driven by time, and whether a
 * `speed` prop of its own decides how fast it moves.
 */
export interface ShaderEffectMotion {
  animates: boolean
  speed: boolean
}

/** What the caller knows of an effect's motion, or undefined for an effect it does not know yet. */
export type ShaderMotion = (type: string) => ShaderEffectMotion | undefined

/**
 * Whether `component` draws a picture that changes with time. An effect missing from the
 * library's metadata counts as animated, so a newer effect plays rather than freezing; `speed: 0`
 * and an `animated` switch turned off stop it.
 */
function componentAnimates(component: ShaderComponent, motion: ShaderMotion): boolean {
  const props = component.props ?? {}
  if (props.animated === true) return true
  const known = motion(component.type)
  const moves =
    typeof props.speed === 'number'
      ? props.speed !== 0
      : known === undefined || known.animates || known.speed
  if (moves) return true
  return (component.children ?? []).some((child) => componentAnimates(child, motion))
}

/**
 * Whether `preset` changes between frames: any of its effects animates. A preset of still
 * effects, or one whose animated effects are all at `speed: 0`, draws one picture forever and
 * does not need a player.
 */
export function presetAnimates(preset: ShaderPreset, motion: ShaderMotion): boolean {
  return preset.components.some((component) => componentAnimates(component, motion))
}
