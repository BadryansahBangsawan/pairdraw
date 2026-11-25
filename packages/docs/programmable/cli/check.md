---
title: CI Checks on a Pull Request
description: Run Pairdraw's design checks on the .fig and .pen files a pull request changes, and keep the result in one comment.
---

# CI Checks on a Pull Request

`pairdraw check` runs the three checks a design change needs on a list of documents and writes one report: a frame
laid out at several widths, the variables compared with the stylesheet they come from, and the design memory's
findings. It reads the files and never writes a design document, so a pull request can run it on every push.

The repository ships a GitHub Action around it: `.github/actions/pairdraw-check`.

## The command

```sh
pairdraw check designs/home.pen designs/settings.fig \
  --out pairdraw-report \
  --base .pairdraw-base
```

| Option               | Meaning                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `--config <path>`    | Settings file, default `.pairdraw/check.json`                                              |
| `--base <dir>`       | The base revision's copies at the same paths, so only findings this change introduced fail |
| `--out <dir>`        | Report folder, default `pairdraw-report`                                                   |
| `--image-base <url>` | Prefix for the render images in `report.md`, where they are hosted                         |
| `--fail-on <level>`  | `error`, `warning`, or `never`; overrides the settings file                                |
| `--json`             | Print `report.json` to stdout                                                              |

Exit codes: `0` when nothing fails at the configured level (including a run with no design files), `1` when
findings do, `2` when the check could not run — a bad settings file, an unreadable document, or a frame that could
not be rendered. A run that could not finish is never reported as a pass.

## What it checks

- **Responsive renders.** Each frame on each page — and frames directly inside sections — is laid out at 375, 768
  and 1280 px and rendered to a PNG, with text overflow, layers outside their frame, and overlapping siblings listed
  per width. Instances, invisible layers, and the layers inside a frame are skipped; the report counts what the frame
  limit left out.
- **Token drift.** The document's variables are compared with `tokens.source` (a stylesheet, a project folder, or W3C
  token files) through the same link `pairdraw tokens --check` uses.
- **Design memory.** The document's allowed colors, fonts, sizes, spacing, and radii are checked against every layer,
  exactly as the app's lint does. With `--base`, a finding the base revision already had is counted but does not
  fail, so a repository can adopt the check before cleaning old layers.

## Settings

`.pairdraw/check.json`, every field optional, unknown keys refused:

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

## The report

`--out` holds `report.json` (every finding, every render's path), `report.md` (the same as a pull-request comment),
and `renders/` with one PNG per frame and width. The report's first Markdown line is the marker
`<!-- pairdraw-check -->`, which the action uses to update its own comment instead of adding another.

## In GitHub Actions

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
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: BadryansahBangsawan/pairdraw/.github/actions/pairdraw-check@v0.20.0
```

The action installs the CLI, finds the pull request's changed `.fig` and `.pen` files, reads the merge base's copies
from git, runs the command, uploads the report and renders as an artifact, and posts or updates one comment. Pin the
action to a release tag so it installs the CLI of the same release. The action's README covers inputs, permissions,
fork pull requests, and what the comment contains.
