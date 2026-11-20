---
title: Checking Designs
description: Find accessibility, consistency, and structure issues with the Lint panel.
---

# Checking Designs

While the Lint tab is open, Pairdraw checks the current page as you work and points out layers that break common design rules: text that is hard to read, controls that are too small to tap, colors that should use a variable, and spacing off the scale. Nothing is checked while the Lint and Code tabs are closed, so a long agent run is not slowed down by checks after every edit.

## Lint Panel

Open the **Lint** tab in the right panel. Its badge shows how many errors and warnings the page has.

- **Page** lists every issue on the current page; **Selection** narrows the list to the selected layers and everything inside them; **Document** lists every page's issues, tagging the ones on other pages. Clicking one of those switches to its page. Pages of a large `.fig` file that have not been opened yet are checked once you open them.
- Issues are grouped by rule, most severe first. Errors and warnings start expanded; suggestions start collapsed.
- The severity buttons under the scope switch filter errors, warnings, and suggestions on and off.
- Hover a group title to read what the rule checks and why.

Hover an issue to highlight its layer on the canvas. Click it to select the layer; if it is off screen, the canvas pans to it, and zooms out only when the layer does not fit.

## Fixing Issues

Rows that can be fixed in one step show a button on hover:

- A hardcoded color that matches one of the document's color variables binds to it (link button). The row names the variable.
- Subpixel positions and sizes round to whole pixels. Values that auto layout or text resizing sets, and vector artwork and the parts of groups, are left alone.
- Off-scale corner radius and spacing change to the nearest scale value, and text below the minimum size grows to it (wand button). These change the design, so they apply one row at a time.
- A group converts to a frame in place, keeping its layers, position, and look (frame button), and a hidden layer can be deleted (trash button). Neither is offered for locked layers or layers inside a component or instance, whose structure belongs to the component.

Binding colors and rounding pixels keep the design as it looks, so their groups also offer **Bind all** or **Fix all**. Every fix is a single undo step.

Other issues show the value that needs attention, such as a contrast ratio or a touch target size, so you can fix them in the Design panel.

Issues appear only in the Lint panel and as underlines in the Code tab. The canvas shows nothing for them beyond the highlight of the issue you hover, and the Layers panel and page list show none.

## In the Code Panel

While it is open, the Code tab checks the page too and underlines errors and warnings on the Design JSX, HTML, Vue, or React of their layers, on the property that causes the issue when there is one, such as `size={10}` for small text, or the class that styles the layer. Hover the underline to read the issue. The underlines follow your edits while you change the code live.

## Rules

The settings menu in the Lint panel switches between rule presets:

- **Recommended** — balanced defaults for everyday work.
- **Strict** — every rule as a warning or error.
- **Accessibility** — contrast, touch target size, and text size only.

Turn off a single rule from its group's menu. **Turn on turned-off rules** in the settings menu brings them back. Presets and turned-off rules are saved between sessions.

The same rules run from the command line with `pairdraw lint`; see [Inspecting Files](/programmable/cli/inspecting).

## Design Memory

A design memory keeps a document's design rules for the agents that work in it: the colors, fonts, font sizes, spacing, and corner radii they may use, decisions written down about them, and frames pinned as examples to follow. With nothing selected, the **Design memory** section of the Design panel shows what it holds; **Create from this document** starts one that allows the document's variables and styles and proposes the values its pages use most.

In the dialog, each group can include the document's variables and styles, add values of its own, and choose what happens when an agent uses another value:

- **Undo the edit** — the agent's edit is put back and it is told the nearest allowed values, so it tries again. Colors and fonts start here.
- **Warn** — the edit goes through and the agent is told which values are off. Font sizes, spacing, and radii start here, since they have real exceptions such as hairlines.
- **Off** — the group is not checked.

Your own edits are never undone. Values outside the memory show in the Lint panel, whoever made them, with a fix to the nearest allowed value and **Allow**, which adds the value to the memory. An edit an agent had undone shows the same **Allow** in the chat.

Agents are judged on the values they write: a color or font outside the memory is undone even when your layers already use it. Duplicating, grouping, flattening, or converting layers that already exist keeps their values, and the colors Pairdraw gives a new layer by default only warn. A variable or style an agent creates, changes, or rescopes is judged on every value it would then let in, and an agent cannot change, switch off, or remove the memory itself.

With a frame selected, the **Design memory** section learns values from it and pins it as an example. Agents read the memory in the chat, through MCP with `get_design_memory`, and from the command line with `pairdraw design-memory`; they can write decisions down and pin examples. This covers agents working through Pairdraw's chat, MCP server, and `pairdraw agent`. A program that writes through CLI commands such as `pairdraw tool call` or `pairdraw eval` counts as you and is only warned.

The memory is kept in `.fig` files. Saving as `.pen` drops it, as Pencil.dev has no place for it.
