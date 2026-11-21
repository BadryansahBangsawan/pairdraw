---
title: Inspecting Files
description: Browse node trees, search by name or type, and dig into properties from the terminal.
---

# Inspecting Files

The CLI lets you explore design documents without opening the editor. Every command also works on the live app — just omit the file argument.

::: tip Install

```sh
npm install -g @pairdraw/cli
# or
bun add -g @pairdraw/cli
```

:::

## Document Info

Get a quick overview — page count, total nodes, fonts used, file size:

```sh
pairdraw info design.fig
```

## Font Diagnostics

Report requested font faces, available sources, substitutions, and affected layers:

```sh
pairdraw fonts design.fig
pairdraw fonts design.fig --json
pairdraw fonts --document-id tab-123 --page-id 0:1
```

File mode checks all document pages using the CLI host's available fonts without downloading online fonts. Live mode reports the targeted app document/page, whose loaded fonts may differ from the CLI host. Faces are reported as `available`, `substituted`, or `unresolved`; JSON output includes `faithful`, `faces`, and `issues`.

Use [export font policies](./exporting#font-substitution-policy) to warn about or reject substitutions during file-backed raster and PDF exports.

## Node Tree

Print the full node hierarchy:

```sh
pairdraw tree design.fig
```

```
[0] [page] "Getting started" (0:46566)
  [0] [section] "" (0:46567)
    [0] [frame] "Body" (0:46568)
      [0] [frame] "Introduction" (0:46569)
        [0] [frame] "Introduction Card" (0:46570)
          [0] [frame] "Guidance" (0:46571)
```

## Find Nodes

Search by type:

```sh
pairdraw find design.fig --type TEXT
```

Search by name:

```sh
pairdraw find design.fig --name "Button"
```

Both flags can be combined to narrow results further.

## Query with XPath

Use XPath selectors to find nodes by type, attributes, and tree structure:

```sh
pairdraw query design.fig "//FRAME"
```

### Useful patterns

**By type:**

```sh
pairdraw query design.fig "//TEXT"                    # All text nodes
pairdraw query design.fig "//COMPONENT"               # All components
pairdraw query design.fig "//INSTANCE"                # All instances
```

**By attributes:**

```sh
pairdraw query design.fig "//FRAME[@width < 300]"                # Frames under 300px wide
pairdraw query design.fig "//*[@cornerRadius > 0]"               # Rounded corners
pairdraw query design.fig "//*[@visible = false]"                # Hidden nodes
pairdraw query design.fig "//TEXT[@fontSize >= 24]"              # Large text
pairdraw query design.fig "//*[@opacity < 1]"                    # Semi-transparent nodes
```

**By name and text content:**

```sh
pairdraw query design.fig "//TEXT[contains(@name, 'Button')]"    # Name contains 'Button'
pairdraw query design.fig "//TEXT[contains(@text, 'Hello')]"     # Text content contains 'Hello'
```

**By hierarchy:**

```sh
pairdraw query design.fig "//SECTION//TEXT"            # Text inside sections
pairdraw query design.fig "//FRAME/TEXT"               # Direct text children of frames
pairdraw query design.fig "//COMPONENT_SET//INSTANCE"  # Instances inside component sets
```

### Queryable attributes

`name`, `width`, `height`, `x`, `y`, `visible`, `opacity`, `cornerRadius`, `fontSize`, `fontFamily`, `fontWeight`, `layoutMode`, `itemSpacing`, `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`, `strokeWeight`, `rotation`, `locked`, `blendMode`, `text`, `lineHeight`, `letterSpacing`

### Example output

```
  Found 5 nodes

[0] [frame] "Logo  92×32" (0:9)
[1] [frame] "logo-short-6  31×32" (0:10)
[2] [frame] "wrapper  128×73" (0:20)
[3] [frame] "pen-drawing  148×52" (0:21)
[4] [frame] "surprised-emoji  32×32" (0:26)
```

## Node Details

Inspect all properties of a specific node by its ID:

```sh
pairdraw node design.fig --id 1:23
```

## Pages

List all pages in the document:

```sh
pairdraw pages design.fig
```

Commands that work on one page — `tree`, `find`, `query`, `analyze overlaps`, `export`, `eval`, `tool call`, and the `diff` commands that compare layers — take it as `--page` with its name or `--page-id` with its ID from `pairdraw pages`, but not both. Both mean the same with a file and with the running app:

```sh
pairdraw tree design.fig --page "Components"
pairdraw find design.fig --page-id 0:46566 --type TEXT
```

## Variables

List design variables and their collections:

```sh
pairdraw variables design.fig
```

## Live App Mode

When the desktop app is running, omit the file argument — the CLI connects via RPC and operates on the live canvas:

```sh
pairdraw documents list    # list open document/page IDs
pairdraw tree              # inspect the active live document
pairdraw tree --document-id tab-123 --page-id 0:1
pairdraw eval --document-id tab-123 --page-id 0:1 -c "..."
```

Use `pairdraw documents list --json` in agent workflows, then pass `--document-id` and `--page-id` explicitly instead of relying on the visible active tab/page. To open, save, switch, and close documents, undo, change settings, or call any editor tool, see [Controlling the App](/programmable/cli/app-control).

## Lint Designs

Check documents for naming, layout, structure, and accessibility issues:

```sh
pairdraw lint design.fig
pairdraw lint design.pen --preset strict
pairdraw lint design.fig --rule color-contrast
pairdraw lint design.fig --list-rules
pairdraw lint design.fig --fix -o fixed.fig
```

Use `--json` for machine-readable output; each message carries its `fix` and `suggestions` as data. `--fix` applies the safe fixes — binding colors to the color variable they match and rounding geometry to whole pixels — and writes the result to the `.fig` file given with `-o`.

## Import Warnings

When a command opens a `.pen` file that names something it cannot resolve, it prints a warning on stderr and keeps stdout for the result: variables the file does not define (read as their fallbacks), image files it cannot read (their fills are left out), and node types this reader does not know (read as placeholder frames). The command still succeeds, so check stderr when a file renders differently than expected.

```sh
pairdraw info design.pen 2>warnings.txt
```

## JSON Output

All commands support `--json` for machine-readable output — pipe into `jq`, feed to CI scripts, or process with other tools:

```sh
pairdraw tree design.fig --json | jq '.[] | .name'
```
