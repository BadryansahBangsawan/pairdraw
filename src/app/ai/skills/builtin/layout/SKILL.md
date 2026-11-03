---
name: layout
description: Fix and tighten the layout of an existing design, converting hand-placed layers to auto-layout, putting spacing on one scale, aligning edges, and resolving overflow and clipping. Use when the user asks to clean up, tidy, align, fix spacing, make something responsive, or fix a layout that looks off or breaks.
---

# Layout

Most layout problems come from three causes: layers placed by coordinates instead of auto-layout, spacing values that do not belong to one scale, and sizing modes that fight each other (fixed where it should hug or fill). Fix the causes, not the symptoms.

## Diagnose first

1. Read the target subtree with `describe` (it reports layout issues) and `node_tree` or `get_jsx` for structure. If nothing is selected, ask which frame or use the current selection.
2. Look at it: `export_image` of the frame. Note what looks wrong before changing anything.
3. `analyze_spacing` lists the gaps and paddings in use; `analyze_overlaps` finds layers that collide. Many distinct near-equal values (14, 15, 16, 17) mean there is no scale.
4. Before a large change, `clone_node` the frame as a reference.

## Fix in this order

1. **Structure**: group layers that belong together into frames, outermost first. A card's image, title, and text are one frame; the cards in a row are another.
2. **Auto-layout**: give each container `set_layout` with a direction, gap, and padding that match the current visual result. Prefer this to moving layers by hand. Absolute positioning stays only for real overlays (badges, decorative shapes, floating buttons), set with `set_layout_child`.
3. **Sizing**: containers that wrap content hug; children that should stretch fill; only outer frames and fixed media get fixed sizes. Text in columns fills the width and grows in height, so it wraps instead of overflowing. Remove fixed heights that were guessed to fit text.
4. **Spacing scale**: move every gap and padding to one scale (4 or 8 based). Related items sit closer than unrelated ones: inside a card smaller than between cards, between cards smaller than between sections.
5. **Alignment**: align to a few shared edges. Text baselines in a row align; icons centre on the first line of their text; numbers right-align in columns.
6. **Overflow**: fix text overflow by giving text room (fill width, wrap, shorter copy), not by clipping. Use `overflow="hidden"` only where clipping is the design (image crops, scrolling areas).

Batch related property changes with `batch_update`. Re-render a subtree with `render` and `replace_id` only when its structure must change; otherwise edit in place so names, components, and bindings survive.

## Check

- `diff_visual` against the reference: the changed bounds should cover only what you meant to change. Look at the returned image.
- Test robustness: lengthen a title or narrow the frame with `node_resize` and confirm the layout adapts, then restore it.
- `describe` again: the layout issues it reported should be gone.
- Delete the reference clone.

## Report

Two or three lines: which containers now use auto-layout, the spacing scale applied, and anything left as is on purpose (an overlay that stays absolute, a fixed-size hero image).
