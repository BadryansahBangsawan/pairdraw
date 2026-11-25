import type { CommentRegion } from '@pairdraw/scene-graph'

import type { PagePoint } from '@/app/editor/pages/point'

/**
 * A comment being written: where its pin goes, and the stroke the person drew around the area,
 * kept with the thread once it is sent.
 */
export interface CommentDraft extends PagePoint {
  region?: CommentRegion
}
