---
title: Drawing Shapes
description: Creating rectangles, ellipses, lines, frames, sections, polygons, and stars in OpenPencil.
---

# Drawing Shapes

The bottom toolbar provides tools for creating shapes, frames, and sections. Select a tool, then click and drag on the canvas to draw.
## Toolbar Tools

| Tool | Shortcut | Description |
|------|----------|-------------|
| Rectangle | <kbd>R</kbd> | Draws a rectangle |
| Ellipse | <kbd>O</kbd> | Draws an ellipse |
| Line | <kbd>L</kbd> | Draws a line |
| Frame | <kbd>F</kbd> or <kbd>A</kbd> | Draws a frame (container for other nodes) |
| Section | <kbd>Shift</kbd> + <kbd>S</kbd> | Draws a section (takes in the siblings it fully covers) |

## Placing Images

Choose **File › Place Image…** (<kbd>⇧</kbd><kbd>⌘</kbd><kbd>K</kbd>, or <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>K</kbd> on Windows and Linux) or click the image button in the toolbar, then pick PNG, JPEG, WebP, GIF, AVIF, or SVG files. They land in the middle of the view, selected, as one step you can undo; an SVG becomes editable layers.

The **Sticky note** tool follows Text in the toolbar. It has no key, so <kbd>N</kbd> still zooms to the next frame.

## Shapes Flyout

The shapes flyout (accessible from the toolbar) includes additional shapes:

- **Polygon** — creates a polygon with 3 sides by default (triangle)
- **Star** — creates a 5-pointed star with 0.38 inner radius

Polygon and Star have no keyboard shortcut — access them from the shapes flyout in the toolbar.

## Customizing the Toolbar

Right-click the toolbar and choose **Customize toolbar…**, or open **Settings → Editor**, to change it:

- Turn a tool's switch off to hide it. Hidden tools keep their keyboard shortcuts. **Move** is always shown.
- Drag a tool to reorder it. Dropped inside a box it joins that flyout; dropped in the gap between boxes it becomes a button of its own; dropped onto another tool, the two share a flyout.
- A tool's **⋯** menu moves it up or down, groups it with the tool above, or ungroups it from its flyout. Its grip also moves it with <kbd>↑</kbd> and <kbd>↓</kbd>.
- **Insert icon** runs a command rather than picking a tool, so it can move and hide but not join a flyout.

**Reset to default** restores the original layout. Tools added in later versions join their default flyout, so a customized toolbar still gets them.

## Constrained Drawing

Hold <kbd>Shift</kbd> while dragging to constrain the shape:

- Rectangle → square (equal width and height)
- Ellipse → circle
- Line → snaps to 0°/45°/90° angles

## Shape Properties

After drawing a shape, select it to edit its properties in the Design tab of the properties panel.

### Fill

Every shape can have a fill. The fill section supports:

- **Solid color** — pick via the HSV color picker or type a hex value
- **Gradient** — Linear, Radial, Angular, or Diamond with editable gradient stops. While the gradient's picker is open, the canvas shows its handles: drag an end or a radius dot to move it, hold <kbd>Shift</kbd> to turn it in 15° steps, and drag a stop's square to slide the stop along the line
- **Mesh** — a grid of colored points that blends across the layer. The Mesh tab shows each point: select one to recolor it, or change **Columns** and **Rows** to resample the grid (up to 4 each way). Mesh paints on fills and strokes; `.fig` files keep the grid and show its own color elsewhere, and `.pen` `mesh_gradient` paints import
- **Image** — select an image file as the fill, or paste an address in **Image URL** and choose **Load** to fetch a PNG, JPEG, GIF, or WebP image from the web (or a `data:` URL) of up to 64 MB
- **Shader** — an animated GLSL shader: start from the gallery in the shader fill picker, add effects to it, or paste a preset copied from shaders.com

An image fill is placed in one of five modes: **Fill** covers the layer and crops the image, **Fit** shows the whole image inside the layer, **Stretch** stretches the whole image to the layer's proportions, **Crop** lets you choose the part of the image to show, and **Tile** repeats the image. Stretch is stored as a crop of the whole image, as `.pen` files store it and Figma reads it.

To crop or reframe an image on the canvas, double-click the layer, press <kbd>Enter</kbd> with it selected, or choose **Crop image** from its context menu or its image fill. The whole image shows, faded outside the layer. Drag the layer's corner brackets or edge bars to crop it over the still image, drag the image to move it behind the layer, and drag the image's corner dots to scale it. Hold <kbd>Shift</kbd> to keep proportions or move along one axis and <kbd>Alt</kbd> to work from the centre. Each drag is one undo step and stores the fill as a crop; <kbd>Enter</kbd>, <kbd>Esc</kbd>, a double-click, or a click outside the image finishes. Vectors, layers with children, and layers placed by auto layout keep their edges, so on those you can only move and scale the image.

### Shader Mode

Shader Mode shows a shader fill large on its own, with play and pause, a phase scrubber, and the shader's settings beside it. Open it with **Open in Shader Mode** in the shader fill picker, or with **View → Shader Mode** while the selection has a shader fill.

### Stroke

Add an outline to any shape. Stroke properties include:

- **Width** — uniform or per-side (Top/Right/Bottom/Left) via the side selector dropdown
- **Color** — solid color with opacity
- **Alignment** — Inside, Center, or Outside the shape boundary (clip-based rendering matches Figma behavior)
- **Cap style** — None, Round, Square, Arrow Lines, Arrow Equilateral (for open paths)
- **Join style** — Miter, Bevel, Round
- **Dash pattern** — dash-on/dash-off

### Corner Radius

Available for rectangles, frames, components, instances, polygons, and stars. Click the independent corners toggle to set each corner (top-left, top-right, bottom-left, bottom-right) separately; a polygon's or star's corners share one radius, which rounds its inner corners too.

On the canvas, hover a selected rectangle to show a handle inside each corner and drag one to round the corners. Equal corners change together and differing ones one at a time; hold <kbd>⌥</kbd> to swap the two and <kbd>⇧</kbd> to round to tens. A polygon or star has one radius handle, below its top point, which rounds all of its corners; drag the handle on its next point around the centre to change the point count, and a star's handle on its first inner point towards or away from the centre to change its ratio. The handles hide while the shape is under 108 pixels across on screen; zoom in to reach them.

### Ellipse Arcs

Select an ellipse to see its arc in the Appearance section: **Start** is the angle the arc starts at, in degrees; **Sweep** is how much of the full turn it covers, in percent; and **Ratio** is the size of the hole in the middle, as a percentage of the ellipse, for rings and donut charts. Type a value or drag the field; the canvas handles of the ellipse change the same three values.

### Effects

Add visual effects from the Effects section:

- **Drop Shadow** — offset, blur radius, spread, color
- **Inner Shadow** — same controls, rendered inside the shape
- **Layer Blur** — blurs the entire node
- **Background Blur** — blurs content behind the node
- **Foreground Blur** — blurs content in front

Click **+** to add an effect. Each effect row is collapsible with inline controls. Toggle the eye icon to enable/disable an effect.

## Frames and Sections

**Frames** are containers. Drag shapes into a frame to make them children, or start drawing inside one: a new shape goes into the frame under the point where you start, except locked frames, and joins the end of an auto-layout flow. Drawing a frame over existing nodes puts the unlocked ones it fully covers inside it. New frames clip their content, as in Figma (turn off **Clip content** to let children show outside), and frames support [auto layout](./auto-layout).

Select the Frame tool to browse collapsible presets for phones, tablets, desktops, presentations, watches, paper, social media, Figma Community assets, and archived devices in the Design panel. Choosing a preset creates a named frame centered in the viewport and returns to the Select tool. With an existing frame selected, use its Frame preset dropdown to resize it without changing its name.

**Sections** are top-level containers that take in the sibling nodes they fully cover when drawn, moved, or resized. They're useful for organizing large canvases into logical areas. Sections display a title pill that you can drag.

## Keyboard Shortcuts

| Action | Mac | Windows / Linux |
|--------|-----|-----------------|
| Rectangle tool | <kbd>R</kbd> | <kbd>R</kbd> |
| Ellipse tool | <kbd>O</kbd> | <kbd>O</kbd> |
| Line tool | <kbd>L</kbd> | <kbd>L</kbd> |
| Frame tool | <kbd>F</kbd> or <kbd>A</kbd> | <kbd>F</kbd> or <kbd>A</kbd> |
| Section tool | <kbd>⇧</kbd><kbd>S</kbd> | <kbd>Shift</kbd> + <kbd>S</kbd> |
| Constrain to square/circle | <kbd>Shift</kbd> + drag | <kbd>Shift</kbd> + drag |

## Tips

- Sections can only exist at the top level — they can't be nested inside frames.
- Use frames with [auto layout](./auto-layout) to build responsive layouts.
- [Export](./exporting) individual shapes or groups as images via the properties panel or context menu.
