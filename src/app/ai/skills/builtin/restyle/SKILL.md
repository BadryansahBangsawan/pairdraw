---
name: restyle
description: Restyle an existing screen or component in a new visual direction, such as a different brand, mood, or style, while keeping its content, structure, and behaviour. Use when the user asks to restyle, reskin, rebrand, modernize, make it look like a style or brand, or try a different look for an existing design.
---

# Restyle

A restyle changes how a design looks, not what it says or how it works. Content, hierarchy, layer structure, component links, and behaviours stay; color, type, shape, depth, and imagery change.

## Define the direction

1. Turn the request into concrete decisions before touching layers. For "make it feel premium", decide for example: near-black and warm off-white, one gold accent, a serif display face with a neutral sans for UI, larger margins, square-ish corners, no drop shadows.
2. If a `get_style` tool is available in this session, use it to read a style direction that matches the request, and adapt it to the design.
3. Write the decisions as a short list in your reply when the direction is open to interpretation, so the user can correct it early.

Cover these axes: palette (background, surface, text, accent, status), type (families, weights, scale, letter spacing, case), shape (corner radius, stroke widths), depth (flat, borders, or shadows), density (spacing scale), and imagery (photo treatment, icon style).

## Work on a copy

`clone_node` the original and restyle the copy beside it, unless the user asked to change it in place. Name the copy after the direction ("Pricing – Editorial"). This keeps a before-and-after the user can compare.

## Apply through tokens

- If the design binds to variables, the cleanest restyle is a new mode or new values: add a mode to the color collection (`create_variable` values per mode, or `defineMode` in `render`) and set the copy's mode to it, so the original and the restyle share one structure. Change type and radius variables the same way.
- If the design uses raw values, first map them: `analyze_colors` and `analyze_typography` list what is used. Then replace systematically with `replace_matching_properties` (every instance of the old blue becomes the new accent) rather than layer by layer. Create variables for the new values while you are at it when the user wants a reusable style.
- Edit main components, not their instances, so every use follows.

## Keep what must stay

- Text content, layer names, auto-layout structure, component properties, and behaviours remain unchanged. Do not re-render the whole tree with new JSX; edit properties in place so IDs, overrides, and bindings survive.
- Contrast stays at WCAG AA or better in the new palette. Dark or saturated restyles often break muted text; check it.
- Images that clash with the new direction can be replaced with `stock_photo` using queries that describe the new mood, on the same image layers.

## Check

Export the original and the restyled copy side by side with `export_image` and compare: the restyle should be unmistakably different in feel while every piece of content is still in place. `diff_jsx` between them should show only visual properties changing. Summarize the direction in two or three lines and name the variables or modes you added.
