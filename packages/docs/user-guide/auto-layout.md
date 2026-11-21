---
title: Auto Layout
description: Flex and grid layout in Pairdraw — direction, gap, padding, alignment, child sizing, and CSS Grid tracks.
---

# Auto Layout

Auto layout positions children automatically within a frame. It supports two modes: **flex** (horizontal/vertical flow) and **grid** (rows and columns with track sizing).
## Enabling Auto Layout

- Select a frame and press <kbd>⇧</kbd><kbd>A</kbd> (<kbd>Shift</kbd> + <kbd>A</kbd>) to toggle auto layout on or off
- Select loose nodes (without a parent frame) and press <kbd>⇧</kbd><kbd>A</kbd> to wrap them in a new auto-layout frame

When wrapping a selection, nodes are sorted by visual position: left-to-right for horizontal layout, top-to-bottom for vertical.

## Layout Direction

Choose how children are arranged:

- **Horizontal** — children flow left to right
- **Vertical** — children flow top to bottom
- **Wrap** — children wrap to the next row/column when they run out of space

## Spacing

### Gap

The space between adjacent children. Set a single value that applies between all children.

### Padding

The space between the frame edge and its children. Set a uniform value for all sides, or expand to set each side independently (top, right, bottom, left).

## Alignment

### Justify (main axis)

Controls how children are distributed along the layout direction:

- **Start** — children pack to the beginning
- **Center** — children are centered
- **End** — children pack to the end
- **Space between** — children spread with equal space between them
- **Space around** — each child gets an equal share of the free space, half on each side, on top of the gap; choose it from the gap field's menu

### Align (cross axis)

Controls how children are positioned perpendicular to the layout direction:

- **Start** — children align to the start
- **Center** — children are centered
- **End** — children align to the end
- **Stretch** — children stretch to fill the cross axis

## Child Sizing

Each child in an auto-layout frame can have its own sizing mode:

- **Fixed** — uses the child's explicit width/height
- **Fill** — stretches to fill available space in the parent
- **Hug** — shrinks to fit the child's content

## Include Strokes in Layout

By default an auto layout frame lays its content out as if no layer had a stroke, as Figma does. Turn on **Include strokes in layout** in the Layout section to make room for strokes: the frame's own stroke pushes its content inward, and the outside strokes of its children take up space between them.

A fixed auto-layout frame is never smaller than the room its padding takes, plus the inside strokes it counts when **Include strokes in layout** is on. Setting it smaller grows it to that room, as Figma does. A frame saved smaller than its padding before this change keeps its saved size when the file opens, and grows to its padding on the next edit.

## Drag Reordering

Within an auto-layout frame, drag a child to reorder it among its siblings. A visual insertion indicator shows where the child will be dropped. Dragging a node from elsewhere into an auto-layout frame inserts it the same way; in a wrapping frame, it goes into the line under the cursor. Drawing inside an auto-layout frame adds the new node to the end of its flow.

Hold <kbd>⌃</kbd> (<kbd>Ctrl</kbd> on Windows and Linux) while dragging to ignore auto layout: the node is dropped where you release it as an absolute-positioned child.

## Properties Panel

When an auto-layout frame is selected, the Layout section in the properties panel shows all auto-layout controls: direction, gap, padding, justify, and align.

## Keyboard Shortcuts

| Action | Mac | Windows / Linux |
|--------|-----|-----------------|
| Toggle auto layout | <kbd>⇧</kbd><kbd>A</kbd> | <kbd>Shift</kbd> + <kbd>A</kbd> |

## CSS Grid

Grid layout arranges children in rows and columns with explicit track sizing.

### Enabling Grid

Select a frame with auto layout enabled and click the grid icon in the layout toolbar to switch from flex to grid.

### Track Sizing

Define column and row tracks with three sizing modes:

- **fr** — fractional unit, divides available space proportionally
- **px** — fixed pixel size
- **auto** — sizes to fit content

Example: three columns of `1fr 200px 1fr` creates a layout with a fixed center column and flexible sides.

Set a grid frame to **Hug** to size it to its tracks and gaps. On a hugged axis a fractional (`fr`) track takes its content's size instead of sharing space, and the frame's minimum and maximum still apply.

### Grid Gaps

Set separate horizontal (column) and vertical (row) gaps between cells.

### Child Positioning

Children are placed into grid cells automatically in row order. You can override placement with column/row start and span values in the child's layout properties.

### JSX and Tailwind Export

Grid layouts export to JSX with Tailwind classes: `grid grid-cols-3`, `gap-x-4 gap-y-2`, `col-start-2 row-span-2`.

## Tips

- Auto layout recomputes immediately after creation, so the selection bounds update right away.
- Nest auto-layout frames for complex responsive layouts (e.g., a vertical frame containing horizontal rows).
- Use "Fill" sizing to make a child take up remaining space, like a flex-grow: 1 in CSS.
- Use grid for dashboard layouts, galleries, and forms — anything with a two-dimensional structure.
- See [Drawing Shapes](./drawing-shapes) for creating the frames that auto layout applies to.
- See [Components](./components) for using auto layout within reusable components.
