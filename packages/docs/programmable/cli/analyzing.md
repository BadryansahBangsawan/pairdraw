---
title: Analyzing Designs
description: Audit colors, typography, spacing, and repeated patterns in .fig files.
---

# Analyzing Designs

The `analyze` commands audit an entire design system from the terminal — find inconsistencies, extract the real palette, spot components waiting to be extracted.

## Colors

```sh
pairdraw analyze colors design.fig
```

Finds every color in the file, counts usage, and shows a visual histogram:

```
#1d1b20  ██████████████████████████████ 17155×
#49454f  ██████████████████████████████ 9814×
#ffffff  ██████████████████████████████ 8620×
#6750a4  ██████████████████████████████ 3967×
```

## Typography

```sh
pairdraw analyze typography design.fig
```

Lists every font family, size, and weight combination with usage counts. Useful for spotting one-off text styles that should be consolidated.

## Spacing

```sh
pairdraw analyze spacing design.fig
```

Audits gap and padding values across auto-layout frames. Helps identify spacing scale inconsistencies — e.g. a stray `13px` gap among otherwise `8/16/24` values.

## Clusters

```sh
pairdraw analyze clusters design.fig
```

Finds repeated node patterns that could be extracted into components:

```
3771× frame "container" (100% match)
     size: 40×40, structure: Frame > [Frame]

2982× instance "Checkboxes" (100% match)
     size: 48×48, structure: Instance > [Frame]
```

## Design Memory

A document's design memory lists the colors, fonts, font sizes, spacing, and corner radii agents may use there, whether an edit with another value is undone or warned about, the decisions written down, and the frames pinned as examples. People set it in the Design panel with nothing selected:

```sh
pairdraw design-memory design.fig
pairdraw design-memory design.fig --json
```

`pairdraw lint` reports layers whose values break it. A person runs the CLI, so `pairdraw tool call` and `pairdraw eval` never undo an edit for the memory: values outside it come back as `design_memory` warnings (for `eval`, on stderr), and the command exits 0. Pass `--enforce-design-memory` to fail the call and write nothing when it uses a color or font the memory refuses, as in a CI check. `pairdraw agent` runs refuse such edits, as agents in the app are refused.

## JSON Output

All analyze commands support `--json` for machine-readable output:

```sh
pairdraw analyze colors design.fig --json
```

Pipe into `jq`, feed into CI checks, or use in scripts that enforce design token budgets.
