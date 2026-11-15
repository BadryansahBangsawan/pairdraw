export type DesignIssueSeverity = 'error' | 'warning' | 'info'

/** A layer the user is inspecting through an issue row. */
export interface DesignIssueHighlight {
  nodeId: string
  severity: DesignIssueSeverity
  /** Minimum size the layer should reach, drawn as a ghost target around it. */
  minSize?: { width: number; height: number }
}
