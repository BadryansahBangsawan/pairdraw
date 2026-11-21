---
title: Variations
description: Ask for several versions of a layer, compare them side by side, and keep one in place of the original.
---

# Variations

Variations are copies of one layer, side by side in a section beside it, for comparing directions before you commit to one. Each version is an ordinary frame you can select, edit, and comment on. When you keep one, the original takes its look and stays where it was.

## Asking for Versions

- **With AI** — right-click a layer and choose **Variations…**. It turns on **Let it cook** in the chat with its count and its axis (layout or style) as you last set them; say what to explore, such as "calmer, more white space", and send. The agent copies the layer into a section named `Variations · <layer>`, names each version by the idea it tries (`V2 · Calmer palette`), and changes each one. Let it cook does the same whenever a message starts from a layer, by naming it or by having it selected.
- **By hand** — right-click a layer and choose **Duplicate as variation**. It adds one plain copy to the layer's set, making the set the first time, and selects it. On a version, it copies that version into the same set.

Let it cook asks for 2 to 6 versions at a time; agents and scripts may make up to 8 per request. Pages, sections, component sets, and layers inside an instance cannot be varied; select the frame, the variant, or the instance itself.

## Comparing and Keeping One

Select the section or any version and the design panel shows a **Variations** section:

- **‹ ›** step through the versions and bring each into view; the list jumps straight to one.
- **Use this** replaces the original with the selected version in one undo step. The original keeps its id, name, position, and its place in an auto layout parent, so comments, prototype links, and instances of a main component keep pointing at it. Layers the two share by name and type keep their ids too. The section and the other versions are removed. A comment pinned on a version stays where it was pinned: once that version is removed, the pin shows at its last position, as for any deleted layer, and Undo brings the version back under it.
- **Go to original** selects the layer the versions vary.
- **Discard all** removes the section and every version, in one undo step.

When the original was edited after the newest versions were made, the section says so when you select the set; **Use this** still replaces it, and **Undo** brings the edited original back. **Use this** is unavailable, with the reason shown, when the original was deleted, is locked, belongs to a library, or is a different kind of layer than the version (for example an instance whose version was rebuilt as a frame); **Discard all** still works.

A main component stays a main component when you use a version: its properties and publishing are kept, and its instances update. Versions never add components: a main component's versions are frames, and main components inside a varied layer are copied as instances of themselves. **Use this** keeps those main components, and every instance of them, as they were; swapping such a stand-in instance to another component inside a version is not carried into the original.

## Files and Agents

A set of variations is saved in `.fig` files and reopens as a set. A `.pen` file keeps the versions as plain frames in a frame, without the set.

Agents use the same feature through `create_variations`, `list_variations`, and `pick_variation`, and scripts through `pairdraw.createVariations` (see [Scripting](/programmable/cli/scripting)). An agent changes the layers inside each version and keeps the version's own root layer, so the version can still replace the original; it leaves the choice to you unless you ask it to pick or discard.
