/** A timer a prototype test armed through its window probe, as the probe records it. */
export interface ArmedTimer {
  fn: () => void
  ms: number
  cleared: boolean
}
