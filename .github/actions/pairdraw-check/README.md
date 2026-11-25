# Pairdraw design check

One composite action for a pull request that changes `.fig` or `.pen` files. It runs
`pairdraw check` on the changed documents and keeps one comment up to date with the result:

- **Responsive renders** — each top-level frame laid out at 375, 768 and 1280 px (configurable) with
  text-overflow, layer-outside-frame and sibling-overlap warnings per width.
- **Token drift** — the document's variables compared with the stylesheet or project folder they come from,
  listing every token that differs.
- **Design memory** — the colors, fonts, sizes, spacing and radii the document allows, with only the findings
  the base revision did not already have counted as failures.

The report, `report.json`, and every PNG render are uploaded as a workflow artifact.

## Use it

```yaml
name: Design checks
on: pull_request

permissions:
  contents: read
  pull-requests: write

jobs:
  pairdraw:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - uses: BadryansahBangsawan/pairdraw/.github/actions/pairdraw-check@v0.20.0
```

Pin the action to a release tag: the tag names the app release whose `@pairdraw/cli` the action installs, so the
check and the action stay in step. `version: latest` follows npm and can change behaviour without a commit here.

## Inputs

| Input | Default | Meaning |
| --- | --- | --- |
| `version` | `latest` | `@pairdraw/cli` version to install |
| `files` | `` | Design files to check, newline- or space-separated. Empty uses the pull request's changed `.fig` and `.pen` files |
| `config` | `.pairdraw/check.json` | Settings file; used only when it exists |
| `base` | `` | Git ref to compare with. Empty uses the pull request's merge base |
| `fail-on` | `` | `error`, `warning`, or `never`; empty keeps the config file's level |
| `comment` | `true` | Post or update the one comment |
| `node-version` | `22` | Node version for the CLI |

## Settings file

`.pairdraw/check.json`, every field optional:

```json
{
  "checks": { "responsive": true, "designMemory": true, "tokens": true },
  "responsive": {
    "widths": [375, 768, 1280],
    "maxFrames": 8,
    "maxWarnings": 20,
    "scale": 1,
    "maxEdge": 1280
  },
  "tokens": { "source": "src/styles/globals.css" },
  "failOn": "error"
}
```

Unknown keys are refused, so a typo cannot silently turn a check off. `failOn` decides what fails the job:

| `failOn` | Fails on |
| --- | --- |
| `error` | a new design-memory finding the memory refuses, or token drift |
| `warning` | the above, plus new warnings (including responsive ones and text overflow) |
| `never` | nothing; the comment is still written |

Adopting the check on a repo with older findings: leave `failOn` at `error` — findings the base revision already
had are listed but never fail. Token drift is not baselined: drift means the design and the code disagree now.

## What it needs

- A `pull_request` workflow checkout with history (`fetch-depth: 0` or at least the merge base) so the baseline
  can be read from git.
- `contents: read` and `pull-requests: write` for the comment. Without the write permission the check still runs,
  the artifact is still uploaded, and the comment step prints a warning.
- Design files in Git LFS are pulled for the change being checked.

A pull request from a fork gets a read-only token, so its comment is skipped with a warning; the check result is
still in the job log and the artifact.

## Renders in the comment

GitHub comments cannot host image files, so the comment lists every finding and links the run artifact where the
PNGs are. Publishing the renders to a branch so they can be embedded inline is a possible follow-up; it needs
`contents: write` and a hosting decision for private repositories.

## Limits

- The design-memory check applies to `.fig` documents. A `.pen` file does not carry the memory yet, and the comment
  says "no memory in this file" rather than passing silently.
- Responsive rendering fetches web fonts on the runner; a network failure falls back and can change a text-overflow
  warning.
- The comment is cut to fit GitHub's 65,536-byte limit, leaving room for the artifact line the action appends: the
  writer lists as many findings as fit, then says so, and `report.json` always holds every finding.
- A pull request that changes no design files gets no new comment; an existing Pairdraw comment is replaced with
  "No design files changed" so a stale red gate does not survive.
