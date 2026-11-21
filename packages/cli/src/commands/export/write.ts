import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

import { writeFileAtomic } from '@pairdraw/core/node/fs'

import { ok } from '#cli/format'

/** Writes an export, making its folder first, and says where it went and how large it is. */
export async function writeAndLog(path: string, content: string | Uint8Array): Promise<void> {
  // The files an export names sit next to its own, so its folder has to exist before the file.
  await mkdir(dirname(path), { recursive: true })
  await writeFileAtomic(path, content, { symlink: 'follow' })
  const size = typeof content === 'string' ? Buffer.byteLength(content, 'utf8') : content.length
  console.log(ok(`Exported ${path} (${(size / 1024).toFixed(1)} KB)`))
}
