# Release packages and native artifacts

`src/workflow.ts` owns npm release policy and reuses package-artifacts/package-quality mechanics. `src/native/` owns desktop release orchestration. Cross-directory imports within this package use `#release/*`; sibling modules remain relative.

## Canonical release workflow

`.github/workflows/build.yml` runs on a new release tag, or through `workflow_dispatch` with an existing one. Release tags are stable `vX.Y.Z` or beta pre-releases `vX.Y.Z-beta.N` (`src/version.ts`). A dispatch uses the selected workflow revision but builds the immutable application commit resolved from that tag. The source must be an ancestor of the repository's default branch on GitHub.

1. **Plan:** refuse a release without its own update feed (see below), resolve the source commit, and generate the native matrix from `native/catalog.ts`.
2. **Frontend:** build packages and the desktop frontend once; prepare and pack npm archives without rebuilding. Archive `dist`, desktop icons, and generated menus together and record its SHA-256.
3. **Native:** six independent jobs (macOS arm64 and x64, Windows x64 and arm64, Linux x64 and arm64) check out that same source, verify and extract the shared inputs, then build through Node's Tauri CLI launcher. A generated config sets `build.beforeBuildCommand` to `null`, turns on signed updater artifacts with the release's update feed, and, for a beta, sets the numeric MSI version `X.Y.Z.N`; the checked-in local build hook is unchanged. Collection then packs the archives Tauri does not bundle. No native job uploads release assets.
4. **Publish:** require the complete matrix with identical source/workflow/run/attempt/frontend identity. Verify file inventories, hashes, every updater signature and the release version it records (the desktop updater sets `requireSignedVersion`), and exact source changelog notes. Generate the updater JSON, source/workflow manifest, and checksums; attest and verify the complete output set. Verify npm consumers and publish the original tarballs with npm provenance. Replace every expected draft asset, then download and verify all uploaded bytes.

Workflow tooling is checked out separately in `.pipeline` and installed from its own frozen lockfile where it runs. Application dependency installation and builds remain owned by the tagged checkout; rebuilding an older tag must not accidentally execute its older release orchestration. Dependency installation is not frontend/package compilation.

## npm manifests

`src/publish-dirs.ts` prepares each package's publish directory from its workspace manifest. Workspace manifests point their `bun` export and import conditions at TypeScript source, so the workspace runs packages from `src`; an installed copy cannot, because source modules import each other through `#` aliases that only the workspace tsconfig resolves. `publishPackageJSON` therefore drops every `bun` condition whose target starts with `./src/`, so Bun reads the built `dist` files as Node does, and replaces `workspace:` ranges with the release version. The consumer checks then install the packed tarballs under Node and Bun.

`@pairdraw/vue` compiles its components with the Vue plugin in production mode (`packages/vue/tsdown.config.ts`), so the published files carry no absolute source paths from the build machine.

## Update feed

The checked-in `desktop/tauri.conf.json` names no update feed: its updater `endpoints` and `pubkey` are empty and `createUpdaterArtifacts` is off, so local and fork builds never check for updates and never offer Pairdraw releases. Only the release config adds a feed, from two repository variables read by `native/updater.ts`:

- `UPDATER_PUBLIC_KEY` (required): the base64 minisign public key, the same text `tauri signer generate` writes to its `.pub` file. It must pair with the `TAURI_SIGNING_PRIVATE_KEY` secret; the publish job verifies every updater signature against it. The upstream project's updater keys are refused.
- `UPDATER_ENDPOINT` (optional): where installed apps fetch `latest.json`; an `https` URL. It defaults to `https://github.com/<repository>/releases/latest/download/latest.json`, where this workflow publishes it. A feed serving the upstream project's releases is refused.

Changing either after a release strands installed apps on the old feed or key, so generate the key once and keep the private half safe.

## Pre-releases

A `vX.Y.Z-beta.N` tag runs the same workflow. npm packages publish under the `next` dist-tag, so `latest` stays on the last stable release, and the draft is marked pre-release and never latest. The desktop updater and download links follow GitHub's latest release, so neither picks up a beta. The changelog section is headed `## X.Y.Z-beta.N — YYYY-MM-DD` like any release.

## Draft publication

The workflow leaves the GitHub Release **draft**. After successful verification, publish it with the exact tagged changelog body and publish any accompanying security advisory separately. Never move a release tag to repair CI.

## Artifact policy and provenance

`native/catalog.ts` is Pairdraw's required asset/naming policy, not a replacement for Tauri artifact discovery. Tauri names bundles after `productName`, which is `Pairdraw`; every published file is named `Pairdraw_*`. Collection consumes `tauri-action`'s `artifactPaths` output and refuses missing, duplicate, unexpected, empty, or escaping files. Two archives are packed rather than copied (`native/pack.ts`): the signed macOS `.app` as `Pairdraw_<version>_<arch>.zip` with `ditto`, and on Linux the Debian package's files as `Pairdraw_<version>_<arch>.tar.gz`, which runs from any folder on a system with WebKitGTK. Packed archives are unsigned download-only files covered by the manifest, checksums, and attestations; the updater keeps using the macOS `.app.tar.gz`, the Windows installers, and the Linux packages. A copy run from the `.tar.gz` does not update itself: its binary carries the `.deb` bundle type, so `tauri-plugin-updater` would install the `.deb` system-wide. The archive always holds `usr/lib/Pairdraw`, which makes Tauri resolve that copy's resources outside `/usr/lib/`, and `src/app/shell/updater/feed.ts` then skips the update check and says updates aren't set up.

GitHub's default provenance identifies the **workflow execution revision**, which can differ from the tagged application source in a manual rebuild. The independently attested `release-manifest.json` records both commits, the workflow run/attempt, shared frontend digest, target file digests, and npm tarball digests. Do not describe the default workflow provenance alone as proof of the application's checked-out source. npm also emits its own provenance from the same workflow execution; the signed manifest binds its exact tarballs to the application source.

Verify downloaded release files with:

```sh
gh attestation verify release-manifest.json --repo BadryansahBangsawan/pairdraw \
  --signer-workflow BadryansahBangsawan/pairdraw/.github/workflows/build.yml \
  --deny-self-hosted-runners
sha256sum --check SHA256SUMS
```

Each release asset, including `SHA256SUMS`, also has its own attestation. For a pinned audit, pass the independently obtained workflow commit to `--signer-digest`; compare the attested manifest's source commit with the immutable tag. Do not treat an unverified manifest as trusted configuration.

## Failure and recovery

- There are explicit job/build/startup/command deadlines. Native builds do not silently retry or upload partial release outputs.
- Missing or mixed matrix identities stop publication. Rerun **all jobs**, not only failed jobs, to obtain a single new run-attempt identity.
- Existing published GitHub releases, moved tags, unexpected draft assets, or already-published npm versions stop preflight. Already-published npm versions require an explicit provenance/recovery review; they are never silently mixed with this run. After that review, dispatch Build for the same tag with `npm_published_reviewed`: preflight then accepts the existing versions, publication skips them, and the run still attests, verifies, and uploads the draft assets.
- npm publication and GitHub multi-asset uploads are not atomic. A mid-publication failure requires review; the draft is not automatically published or deleted. A failed upload can leave a partial draft, not a successful canonical release.
- Caches improve repeat installs/builds but do not establish provenance. Their scope and writer limits are documented in `.github/actions/setup-bun/README.md`.
