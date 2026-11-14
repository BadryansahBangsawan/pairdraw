import { expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { desktopReleasePaths } from '#release/native/context'
import { minisignKeyLine, updaterFeed } from '#release/native/updater'
import * as v from 'valibot'

import { resolveWorkspaceRoot } from '@pairdraw/package-artifacts-tools'

import { minisignPublicKey, UPSTREAM_PUBLIC_KEY } from '../helpers/minisign.ts'

const REPOSITORY = 'BadryansahBangsawan/pairdraw'

test('defaults the feed to the latest release of the publishing repository', () => {
  const pubkey = minisignPublicKey()

  expect(updaterFeed({ UPDATER_PUBLIC_KEY: pubkey }, REPOSITORY)).toEqual({
    endpoint:
      'https://github.com/BadryansahBangsawan/pairdraw/releases/latest/download/latest.json',
    pubkey
  })
  expect(
    updaterFeed(
      {
        UPDATER_PUBLIC_KEY: ` ${pubkey}\n`,
        UPDATER_ENDPOINT: 'https://updates.example.com/x.json'
      },
      REPOSITORY
    ).endpoint
  ).toBe('https://updates.example.com/x.json')
})

test('refuses a release without its own updater key', () => {
  expect(() => updaterFeed({}, REPOSITORY)).toThrow('UPDATER_PUBLIC_KEY')
  expect(() => updaterFeed({ UPDATER_PUBLIC_KEY: '  ' }, REPOSITORY)).toThrow('UPDATER_PUBLIC_KEY')
  expect(() => updaterFeed({ UPDATER_PUBLIC_KEY: UPSTREAM_PUBLIC_KEY }, REPOSITORY)).toThrow(
    'upstream'
  )
  expect(() => updaterFeed({ UPDATER_PUBLIC_KEY: 'not base64!' }, REPOSITORY)).toThrow('not base64')
  expect(() =>
    updaterFeed({ UPDATER_PUBLIC_KEY: 'dW50cnVzdGVkIGNvbW1lbnQ6IG5vdGhpbmc=' }, REPOSITORY)
  ).toThrow('not a minisign public key')
})

test('refuses an insecure feed or one that serves upstream releases', () => {
  const UPDATER_PUBLIC_KEY = minisignPublicKey()

  expect(() =>
    updaterFeed({ UPDATER_PUBLIC_KEY, UPDATER_ENDPOINT: 'http://updates.example.com' }, REPOSITORY)
  ).toThrow('https')
  expect(() => updaterFeed({ UPDATER_PUBLIC_KEY }, 'open-pencil/open-pencil')).toThrow('upstream')
  // GitHub ignores case in owner and repository names and also serves www.github.com.
  for (const UPDATER_ENDPOINT of [
    'https://github.com/Open-Pencil/open-pencil/releases/latest/download/latest.json',
    'https://www.github.com/open-pencil/OPEN-PENCIL/releases/latest/download/latest.json'
  ]) {
    expect(() => updaterFeed({ UPDATER_PUBLIC_KEY, UPDATER_ENDPOINT }, REPOSITORY)).toThrow(
      'upstream'
    )
  }
  // Another repository whose name only starts the same is a different feed.
  expect(
    updaterFeed(
      {
        UPDATER_PUBLIC_KEY,
        UPDATER_ENDPOINT:
          'https://github.com/open-pencil/open-pencil-fork/releases/latest/download/latest.json'
      },
      REPOSITORY
    ).endpoint
  ).toContain('open-pencil-fork')
})

test('reads the key line of a minisign public key', () => {
  expect(minisignKeyLine(UPSTREAM_PUBLIC_KEY)).toBe(
    'RWQB7eR4Dr/AWHKhBOxnmEwlZHPXWDkEqpKMGZ5KeIxiJSUCNWPN/pbw'
  )
})

const tauriConfigSchema = v.object({
  bundle: v.object({ createUpdaterArtifacts: v.boolean() }),
  plugins: v.object({
    updater: v.object({
      pubkey: v.string(),
      endpoints: v.array(v.string()),
      requireSignedVersion: v.boolean()
    })
  })
})

test('the checked-in desktop config names no update feed, so only release builds check', async () => {
  const root = await resolveWorkspaceRoot(resolve(import.meta.dir))
  const text = await readFile(desktopReleasePaths(root).tauriConfig, 'utf8')
  const config = v.parse(v.pipe(v.string(), v.parseJson(), tauriConfigSchema), text)

  expect(config.plugins.updater).toEqual({
    pubkey: '',
    endpoints: [],
    requireSignedVersion: true
  })
  expect(config.bundle.createUpdaterArtifacts).toBe(false)
})
