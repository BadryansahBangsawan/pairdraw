import { describe, expect, setDefaultTimeout, test } from 'bun:test'
import { join } from 'node:path'

import { FIXTURES } from '#cli-tests/helpers/paths'

import { imageSize } from '@open-pencil/scene-graph/images'

import { openHeadlessSession } from '#cli/session/open'
import { findCLITool } from '#cli/session/tools'

setDefaultTimeout(60_000)

const FIXTURE = join(FIXTURES, 'gold-preview.fig')

describe('headless tool session', () => {
  test('a preview of a large page stays within the export_image edge limit', async () => {
    const session = await openHeadlessSession(FIXTURE)
    await session.call(findCLITool('create_page'), { name: 'Big' })
    await session.call(findCLITool('switch_page'), { page: 'Big' })
    const shape = { type: 'RECTANGLE', x: 0, y: 0, width: 5000, height: 5000 }
    await session.call(findCLITool('create_shape'), shape)

    const size = imageSize(await session.preview(4))
    expect(size).toEqual({ width: 1280, height: 1280 })
  })

  test('reports an empty page as having nothing to preview', async () => {
    const session = await openHeadlessSession(FIXTURE)
    await session.call(findCLITool('create_page'), { name: 'Empty' })
    await session.call(findCLITool('switch_page'), { page: 'Empty' })
    await expect(session.preview(1)).rejects.toThrow('No visible nodes to export')
  })
})
