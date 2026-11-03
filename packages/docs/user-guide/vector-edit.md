---
title: Vector Object Editing
description: 'How to edit vector path geometry: anchors, bezier handles, modifiers, and Pen tool actions in edit mode.'
---

# Vector Object Editing

Vector Object Editing mode lets you change a curve's **geometry**: anchor positions, segment shape, and bezier handles.  
In this mode, you edit the path itself, not standard object transforms.

## Entering the Mode

- Select a vector object with the Select tool.
- **Double-click the curve**.

This activates geometry editing for the selected vector.

## Exiting the Mode

- Press <kbd>Escape</kbd>.
- Click empty space on the canvas.
- Or switch to another editing context.

## What Changes in This Mode

- The normal transform bounding box is disabled for the object.
- Anchor, segment, and handle editing becomes available.
- Cursor behavior does not switch to resize/rotate at the layer's bbox corners; it does over the transform box of selected points (see [Transform Selected Points](#transform-selected-points)).

## Basic Actions

### Move an Anchor

- Drag an anchor point.
- Connected segments and path shape update live in preview.

### Edit a Bezier Handle

- Drag a handle on the anchor.
- By default, behavior follows the anchor's current handle composition.

### Select and Move a Segment

- Click a segment to select it. The segment turns blue and shows a knob at its midpoint; its anchors stay unselected.
- <kbd>Shift</kbd> + click adds a segment to the selection, or removes a selected one.
- Drag a segment to move the two anchors it joins, along with the rest of the selection.

### Select with a Marquee

- Drag over empty space to select the anchors inside the rectangle and the segments between them.
- <kbd>Shift</kbd> + drag adds them to the selection.

### Select a Region

- Move the pointer inside a filled area: the region under it is hatched with diagonal lines.
- Click inside it to select the region and all of its points; drag to move it.
- <kbd>Shift</kbd> + click adds the region to the selection.

### Delete Anchors and Segments

- Press <kbd>Delete</kbd> or <kbd>Backspace</kbd> to delete the selection.
- A deleted anchor takes its segments with it.
- A deleted segment takes only the anchors it leaves unconnected, so deleting the middle segment of a path splits it in two.
- Deleting everything deletes the layer.

## Cut, Join, and Reshape

| Action                 | Mac                                       | Windows / Linux                         |
| ---------------------- | ----------------------------------------- | --------------------------------------- |
| Cut tool               | <kbd>X</kbd>                              | <kbd>X</kbd>                            |
| Smooth or corner point | Double-click a point                      | Double-click a point                    |
| Straighten a segment   | <kbd>Cmd</kbd> + double-click             | <kbd>Ctrl</kbd> + double-click          |
| Bend a segment         | <kbd>Cmd</kbd> + drag a segment           | <kbd>Ctrl</kbd> + drag a segment        |
| Bend, keep neighbours  | <kbd>Cmd</kbd> + <kbd>Option</kbd> + drag | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + drag |
| Join two end points    | <kbd>Cmd</kbd> + <kbd>J</kbd>             | <kbd>Ctrl</kbd> + <kbd>J</kbd>          |
| Duplicate points       | <kbd>Option</kbd> + drag                  | <kbd>Alt</kbd> + drag                   |
| Move points            | Arrow keys                                | Arrow keys                              |

- **Cut tool:** press <kbd>X</kbd>, then click a segment to cut it there, or click a point to separate the segments that meet at it. Curves keep their shape, and a closed shape that is cut stops filling. Press <kbd>X</kbd> again, <kbd>Escape</kbd>, or another tool key to put it down.
- **Smooth or corner:** double-click a corner point to give it handles along the line between its neighbours, and double-click a smooth point to remove its handles.
- **Straighten:** <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + double-click a curved segment to remove both of its handles.
- **Join:** select two end points and press <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + <kbd>J</kbd>. Points in the same place become one point; points apart are joined by a straight segment. Joining the two ends of one path closes and fills it. While a path is being edited, this shortcut joins points instead of opening the chat.
- **Duplicate:** hold <kbd>Option</kbd>/<kbd>Alt</kbd> and drag selected points or segments to drag a copy. A single point's copy stays joined to it, so the drag extends the path.
- **Nudge:** the arrow keys move the selected points by the nudge distance set in Settings → Editor, and <kbd>Shift</kbd> + arrow by the large nudge distance.
- **Bend:** <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + drag a segment to bend it so the place you grabbed follows the pointer. A smooth end point stays smooth and its other handle turns with it. Add <kbd>Option</kbd>/<kbd>Alt</kbd> to leave the handles of the neighbouring segments where they are; the end points then become corners.

## Transform Selected Points

When two points or segments are selected, a transform box surrounds them.

- Drag a corner or an edge to scale the selected points from the opposite side. Hold <kbd>Shift</kbd> to keep proportions and <kbd>Option</kbd>/<kbd>Alt</kbd> to scale from the centre.
- Drag just outside a corner to rotate them around the centre of the box. Hold <kbd>Shift</kbd> to rotate in 15° steps.
- Points and segments under the pointer stay draggable on top of the box, and each transform undoes in one step.

## Handle Drag Modifiers

| Action                           | Mac                      | Windows / Linux         |
| -------------------------------- | ------------------------ | ----------------------- |
| Continuous (Smooth / Continuous) | <kbd>Cmd</kbd> + drag    | <kbd>Ctrl</kbd> + drag  |
| Corner (Independent handles)     | <kbd>Option</kbd> + drag | <kbd>Alt</kbd> + drag   |
| Direction lock (length only)     | <kbd>Shift</kbd> + drag  | <kbd>Shift</kbd> + drag |

### Continuous: <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> + drag

- The active handle is constrained to the same line as the sister handle.
- Only the active handle length changes.
- Use this for smooth transitions without a corner break.

### Corner: <kbd>Option</kbd>/<kbd>Alt</kbd> + drag

- The active handle is edited independently.
- The sister handle stays in place.
- Use this to create a sharp corner transition.

### Direction Lock: <kbd>Shift</kbd> + drag

For anchors with **Continuous** or **Symmetric** composition:

- handle direction is locked to the value from **before the current drag started**;
- dragging changes only handle length (or lengths, depending on composition).

## Bend Override by Dragging an Anchor

When you drag an anchor while holding <kbd>Cmd</kbd>/<kbd>Ctrl</kbd>, the editor selects the target handle by **segment attachment direction** at that anchor (not by nearest neighbor-point distance).  
This also works on multi-branch vector-web anchors: once resolved, the target handle stays locked for the current drag.

## Using the Pen Tool in Edit Mode

With the Pen tool active:

- **Click a segment** to insert a new anchor (split segment).
- **Click an open-path endpoint** to resume drawing from that point.
- **Option/Alt + click an anchor** to delete it (when topology allows).

For path creation and closing behavior, see [Pen Tool](./pen-tool.md).

## Practical Workflow

1. Draw a shape with the Pen tool.
2. Double-click the curve to enter Vector Object Editing mode.
3. Move anchors to refine the silhouette.
4. Drag handles:
   - with <kbd>Cmd</kbd>/<kbd>Ctrl</kbd> for smooth continuous transitions,
   - with <kbd>Option</kbd>/<kbd>Alt</kbd> for independent edits,
   - with <kbd>Shift</kbd> for length-only edits.
5. Press <kbd>Escape</kbd> to exit.
