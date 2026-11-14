import { writeReferences } from '#authoring-reference/artifacts'

import { resolveWorkspaceRoot } from '@pairdraw/package-artifacts-tools'

await writeReferences(await resolveWorkspaceRoot(process.cwd()))
