---
title: Canvas Navigation
description: Panning, zooming, ruler guides, snapping, and distance measurements in OpenPencil.
---

# Canvas Navigation

The canvas is your infinite workspace. You can pan and zoom freely to navigate your design.

## Panning

Move the visible area of the canvas without affecting any objects.

- <kbd>Space</kbd> + drag — hold Space and drag anywhere on the canvas
- **Middle mouse drag** — press and drag the middle mouse button
- **Two-finger trackpad** — swipe with two fingers on a trackpad
- <kbd>Shift</kbd> + mouse wheel — pan horizontally

## Hand Tool

Press <kbd>H</kbd> to activate the hand tool for continuous panning. Any drag on the canvas pans the viewport without needing to hold Space. Switch to another tool (e.g., **V** for Select) to deactivate.

## Zooming

Zoom in and out centered on your cursor position.

- <kbd>Ctrl</kbd> + scroll (or <kbd>⌘</kbd> + scroll on Mac) — scroll up to zoom in, scroll down to zoom out
- **Pinch gesture** — pinch on a trackpad to zoom in/out
- **Keyboard shortcuts** — see table below

For a mouse, turn on **Zoom with scroll wheel** in **Settings → Editor → Navigation** to zoom with the wheel alone; <kbd>Shift</kbd> + wheel still pans sideways. **Invert zoom direction** swaps which way the wheel zooms, while a trackpad pinch keeps its own direction.

Pinch-to-zoom on UI panels (layers, properties) is prevented so it doesn't accidentally change the browser zoom level.

## Keyboard Shortcuts

| Action | Mac | Windows / Linux |
|--------|-----|-----------------|
| Pan | <kbd>Space</kbd> + drag | <kbd>Space</kbd> + drag |
| Hand tool | <kbd>H</kbd> | <kbd>H</kbd> |
| Zoom in | <kbd>⌘</kbd><kbd>+</kbd> | <kbd>Ctrl</kbd> + <kbd>+</kbd> |
| Zoom out | <kbd>⌘</kbd><kbd>−</kbd> | <kbd>Ctrl</kbd> + <kbd>−</kbd> |
| Zoom in / out | <kbd>+</kbd> / <kbd>−</kbd> | <kbd>+</kbd> / <kbd>−</kbd> |
| Zoom to 100% | <kbd>⇧</kbd><kbd>0</kbd> or <kbd>⌘</kbd><kbd>0</kbd> | <kbd>Shift</kbd> + <kbd>0</kbd> or <kbd>Ctrl</kbd> + <kbd>0</kbd> |
| Zoom to fit | <kbd>⇧</kbd><kbd>1</kbd> | <kbd>Shift</kbd> + <kbd>1</kbd> |
| Zoom to selection | <kbd>⇧</kbd><kbd>2</kbd> | <kbd>Shift</kbd> + <kbd>2</kbd> |
| Zoom to next / previous frame | <kbd>N</kbd> / <kbd>⇧</kbd><kbd>N</kbd> | <kbd>N</kbd> / <kbd>Shift</kbd> + <kbd>N</kbd> |
| Next / previous page | <kbd>Page Down</kbd> / <kbd>Page Up</kbd> | <kbd>Page Down</kbd> / <kbd>Page Up</kbd> |
| Pixel grid | <kbd>⇧</kbd><kbd>'</kbd> | <kbd>Shift</kbd> + <kbd>'</kbd> |
| Snap to pixel grid | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>'</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>'</kbd> |
| Rulers | <kbd>⇧</kbd><kbd>R</kbd> | <kbd>Shift</kbd> + <kbd>R</kbd> |
| Multiplayer cursors | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>\\</kbd> | <kbd>Alt</kbd> + <kbd>Ctrl</kbd> + <kbd>\\</kbd> |

## Frames and Pages

<kbd>N</kbd> selects the next top-level frame on the page and zooms to it; <kbd>Shift</kbd> + <kbd>N</kbd> goes back. Frames inside sections count, hidden ones do not, and the order runs left to right, then top to bottom, wrapping at the ends. With a layer inside a frame selected, the step starts from that frame.

<kbd>Page Down</kbd> and <kbd>Page Up</kbd> open the next and previous page in the Pages panel's order.

## Pixel Grid

Zoomed in far enough that each document pixel covers eight screen pixels (800% on a standard display, 400% on a Retina one), the canvas shows a line at every pixel, as in Figma. Turn it off or on with **View → Pixel Grid**, <kbd>Shift</kbd> + <kbd>'</kbd>, or **Show pixel grid** in **Settings → Editor**; the choice applies to every open document and is kept between sessions.

## Side Panels

The panel buttons at the end of the top bar close and reopen the layers panel and the properties panel one at a time. The canvas takes the room of a closed panel, which reopens at the width it had, and each panel stays open or closed between sessions. <kbd>⌘</kbd><kbd>\\</kbd> (<kbd>Ctrl</kbd> + <kbd>\\</kbd>) still hides every panel at once. The comments list and version history show in the properties panel, so the comment tool and version history open it while you use them and close it again afterwards.

## Ultralight Mode

On a slow or battery-powered computer, turn on **Ultralight mode** in **Settings → Editor → Rendering**. It turns off interface animations at once and, after a reload, renders the canvas in tiles at one device pixel per screen pixel and leaves out background blurs and noise, drawing shadows at a lower resolution when zoomed in. Progressive rendering stays on while Ultralight is on. Exported images keep every effect.

## Ruler Guides

Rulers are hidden until you turn them on with **View → Rulers** or <kbd>Shift</kbd> + <kbd>R</kbd>. Then drag from the top ruler for a horizontal guide or the left ruler for a vertical guide. Drop onto the page for a canvas guide, or onto a frame for a guide in that frame's coordinates.

- Click a guide to select it; drag it to reposition it or transfer it between the page and a frame.
- Hold <kbd>Option</kbd> / <kbd>Alt</kbd> while dragging an existing guide to duplicate it.
- Drag a guide back onto a ruler to remove it, or use its context menu's **Remove guide** action.
- Guide changes support undo/redo and are preserved in `.fig` files.

## Snapping

Under **View → Preferences**, toggle **Snap to Geometry**, **Snap to Objects**, and **Snap to Pixel Grid** independently. Preferences are saved between sessions.

Geometry and object snapping help align vector points, moved layers, and resized edges with nearby geometry, objects, guides, and frame bounds. Alignment lines appear for those targets; pixel-grid rounding does not draw an alignment line for every pixel.

With **Snap to Pixel Grid** on, moved layers, resized edges, and drawn layers land on whole pixels at any zoom, even when they started between pixels. A snap to an object or guide wins over the grid. Arrow-key nudges and values typed in the properties panel keep their fractions.

Turn on **Snap to half pixels** in **Settings → Editor** to let the pixel grid snap land on half pixels as well, so a 1 px stroke can sit centered on a pixel edge. A board keeps its 16-unit grid.

Hold <kbd>Control</kbd> during a layer drag to temporarily bypass object and pixel snapping, including on macOS where this is Control, not Command.

## Distance Measurements

Select a layer, hold <kbd>Option</kbd> on macOS or <kbd>Alt</kbd> on Windows/Linux, and hover another layer to see temporary distance measurements. Releasing the modifier clears the overlay; it does not add guides or change the document.

## Command Palette

Press <kbd>⌘</kbd><kbd>K</kbd> on macOS or <kbd>Ctrl</kbd> + <kbd>K</kbd> on Windows/Linux to search editor and application actions. Select a result to run it; unavailable actions remain subject to the current selection and document state.

The palette also moves between pages. Before you type, it lists the pages you visited recently in this tab, most recent first, and **Go to page…** opens a list of every page. Typing a page name finds it too. Pages where collaborators or AI agents are working list their names; the Pages panel marks the same pages with their colors.

## Tips

- Zooming always targets the cursor position, so point at what you want to see closer.
- The hand tool is useful when you need to pan frequently — it stays active until you switch tools.
- See [Selection & Manipulation](./selection-and-manipulation) for how to work with objects on the canvas.
