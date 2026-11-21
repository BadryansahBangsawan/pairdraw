import { describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  assembleUnreleased,
  parseFragmentBullets,
  readFragments
} from '#release/changelog/fragments'
import { validateChangelog } from '#release/changelog/validate'

describe('changelog fragments', () => {
  test('read bullets as written, with continuation lines and formatting', () => {
    const { bullets, errors } = parseFragmentBullets(
      '- Add **rich** notes,\n  wrapped over two lines.\n- Keep links like [docs](https://example.com).\n',
      'changes/12/added.md'
    )

    expect(errors).toEqual([])
    expect(bullets).toEqual([
      '- Add **rich** notes,\n  wrapped over two lines.',
      '- Keep links like [docs](https://example.com).'
    ])
  })

  test('refuse two bullets joined on one line', () => {
    const { errors } = parseFragmentBullets(
      '- Add the first note.\n- Add the second note.- Add the third note.\n',
      'changes/42/added.md'
    )

    expect(errors).toEqual([
      'changes/42/added.md line 2: two bullets are joined on one line; end a bullet with a newline.'
    ])
  })

  test('refuse a joined bullet that opens with inline code', () => {
    const { errors } = parseFragmentBullets(
      '- Keep `tree` honest.- `pairdraw export --page` keeps `--page-id`.\n',
      'changes/42/fixed.md'
    )

    expect(errors).toEqual([
      'changes/42/fixed.md line 1: two bullets are joined on one line; end a bullet with a newline.'
    ])
  })

  test('leave a bullet that quotes a joined marker as prose', () => {
    const { errors } = parseFragmentBullets(
      '- Keep `e.g.- ` inside code and prose like e.g.- as it is.\n',
      'changes/42/added.md'
    )

    expect(errors).toEqual([])
  })

  test('refuse headings, prose outside a list, and bullets without a closing period', () => {
    expect(
      parseFragmentBullets('### Added\n\n- Add it.\n', 'changes/1/added.md').errors
    ).toHaveLength(1)
    expect(parseFragmentBullets('Add it.\n', 'changes/1/added.md').errors).toHaveLength(1)
    expect(parseFragmentBullets('- Add it\n', 'changes/1/added.md').errors).toEqual([
      'changes/1/added.md: end every bullet with a period: - Add it'
    ])
  })

  test('assemble after existing bullets, in category order and by pull request', () => {
    const changelog =
      '# Changelog\n\n## Unreleased\n\n### Fixed\n\n- Keep user data.\n\n## 1.0.0 — 2026-01-01\n\n### Added\n\n- Ship it.\n'
    const assembled = assembleUnreleased(changelog, [
      { folder: '7', category: 'fixed', bullets: ['- Stop the crash.'] },
      { folder: '9', category: 'breaking', bullets: ['- Remove the old API.'] },
      { folder: '8', category: 'added', bullets: ['- Add export.', '- Add import.'] }
    ])

    expect(assembled).toBe(
      '# Changelog\n\n## Unreleased\n\n### Breaking changes\n\n- Remove the old API.\n\n### Added\n\n- Add export.\n- Add import.\n\n### Fixed\n\n- Keep user data.\n- Stop the crash.\n\n## 1.0.0 — 2026-01-01\n\n### Added\n\n- Ship it.\n'
    )
    expect(validateChangelog(assembled).errors).toEqual([])
  })

  test('refuse to assemble over Unreleased content it would drop', () => {
    const prose =
      '# Changelog\n\n## Unreleased\n\nA note.\n\n### Fixed\n\n- Keep user data.\n\n## 1.0.0 — 2026-01-01\n\n### Added\n\n- Ship it.\n'
    const uncategorized =
      '# Changelog\n\n## Unreleased\n\n- Loose bullet.\n\n## 1.0.0 — 2026-01-01\n\n### Added\n\n- Ship it.\n'

    expect(() => assembleUnreleased(prose, [])).toThrow('line 5: Unreleased holds content outside')
    expect(() => assembleUnreleased(uncategorized, [])).toThrow('line 5')
  })

  test('leave an empty Unreleased section as it is when nothing is pending', () => {
    const changelog =
      '# Changelog\n\n## Unreleased\n\n## 1.0.0 — 2026-01-01\n\n### Added\n\n- Ship it.\n'

    expect(assembleUnreleased(changelog, [])).toBe(changelog)
  })

  test('flag the same bullet added by two pull requests once assembled', () => {
    const changelog =
      '# Changelog\n\n## Unreleased\n\n## 1.0.0 — 2026-01-01\n\n### Added\n\n- Ship it.\n'
    const assembled = assembleUnreleased(changelog, [
      { folder: '3', category: 'fixed', bullets: ['- Stop the crash.'] },
      { folder: '4', category: 'fixed', bullets: ['- Stop the crash.'] }
    ])

    expect(validateChangelog(assembled).errors).toEqual([
      expect.stringContaining('duplicate Unreleased bullet')
    ])
  })
})

describe('readFragments', () => {
  test('treat a missing changes folder as nothing pending', async () => {
    const directory = join(await mkdtemp(join(tmpdir(), 'changes-')), 'absent')

    expect(await readFragments(directory)).toEqual({ fragments: [], errors: [] })
  })

  test('fail when the changes folder cannot be read', async () => {
    const file = join(await mkdtemp(join(tmpdir(), 'changes-')), 'not-a-folder')
    await writeFile(file, '')

    await expect(readFragments(file)).rejects.toThrow()
  })

  test('read pull request and topic folders and report anything that does not fit', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'changes-'))
    await mkdir(join(directory, '42'))
    await writeFile(join(directory, '42', 'fixed.md'), '- Stop the crash.\n')
    await writeFile(join(directory, '42', 'notes.md'), '- Not a category.\n')
    await mkdir(join(directory, 'omp-agent'))
    await writeFile(join(directory, 'omp-agent', 'added.md'), '- Use omp as the design agent.\n')
    await mkdir(join(directory, 'PR-draft'))
    await writeFile(join(directory, 'README.md'), '# Unreleased changes\n')

    const { fragments, errors } = await readFragments(directory)

    expect(fragments).toEqual([
      { folder: '42', category: 'fixed', bullets: ['- Stop the crash.'] },
      { folder: 'omp-agent', category: 'added', bullets: ['- Use omp as the design agent.'] }
    ])
    expect(errors).toEqual([
      expect.stringContaining('changes/42/notes.md: expected one of breaking.md'),
      'changes/PR-draft: expected a folder named after its pull request number or its topic in lowercase kebab-case.'
    ])
  })
})
