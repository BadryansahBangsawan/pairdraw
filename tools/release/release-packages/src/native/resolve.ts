import { appendFile } from 'node:fs/promises'

import * as v from 'valibot'

import { desktopBuilds } from './catalog.ts'
import { releaseCommands } from './commands.ts'
import { commitSchema, releaseVersion } from './context.ts'
import { updaterFeed } from './updater.ts'

const tag = process.env.RELEASE_TAG ?? ''
const version = releaseVersion(tag)
// Refuse before any build: native jobs need the update feed, the publish job its key.
updaterFeed(process.env, v.parse(v.string(), process.env.GITHUB_REPOSITORY))
const { git } = releaseCommands(process.cwd())
const sourceCommit = v.parse(
  commitSchema,
  await git('rev-parse', '--verify', `refs/tags/${tag}^{commit}`)
)

// Release signing/publishing never checks out a caller-supplied arbitrary branch: the source must
// be on the repository's default branch, which only an administrator can change.
const releaseBranch = v.parse(v.pipe(v.string(), v.nonEmpty()), process.env.RELEASE_BRANCH)
await git('merge-base', '--is-ancestor', sourceCommit, `origin/${releaseBranch}`)

const output = process.env.GITHUB_OUTPUT
if (!output) throw new Error('Missing GITHUB_OUTPUT')

await appendFile(
  output,
  [
    `tag=${tag}`,
    `version=${version}`,
    `source=${sourceCommit}`,
    `matrix=${JSON.stringify({ include: desktopBuilds })}`,
    ''
  ].join('\n')
)

console.log(`Release ${tag}: source ${sourceCommit}; workflow ${process.env.WORKFLOW_COMMIT}`)
