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

Pairdraw does not mark issues on the canvas, in the Layers panel, or in the page list: the Lint panel is the one place that lists them.

## In the Code Panel

While it is open, the Code tab checks the page too and underlines errors and warnings on the Design JSX, HTML, Vue, or React of their layers, on the property that causes the issue when there is one, such as `size={10}` for small text, or the class that styles the layer. Hover the underline to read the issue. The underlines follow your edits while you change the code live.

## Rules

The settings menu in the Lint panel switches between rule presets:

- **Recommended** — balanced defaults for everyday work.
- **Strict** — every rule as a warning or error.
- **Accessibility** — contrast, touch target size, and text size only.

Turn off a single rule from its group's menu. **Turn on turned-off rules** in the settings menu brings them back. Presets and turned-off rules are saved between sessions.

The same rules run from the command line with `pairdraw lint`; see [Inspecting Files](/programmable/cli/inspecting).
