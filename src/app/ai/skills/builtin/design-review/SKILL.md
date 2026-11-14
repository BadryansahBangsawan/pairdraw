---
name: design-review
description: Review a design for hierarchy, layout, consistency, accessibility, and content problems, and report prioritized findings with the layers they concern, fixing them only when asked. Use when the user asks for a review, critique, feedback, audit, QA pass, or "what's wrong with this design".
---

# Design review

A good review is specific, prioritized, and actionable. Each finding names the layer, says what is wrong and why it matters to the person using the design, and proposes a concrete fix. Do not change the design unless the user asked you to fix things.

## Gather

1. Scope: the selection, the frame the user named, or the current page's top-level frames. Ask only if none is obvious.
2. Look at it: `export_image` of each frame in scope. Form a first impression before running any tool: what draws the eye first, what the screen is for, whether that matches.
3. Inspect structure with `describe` and `node_tree`.
4. Run the analyzers: `lint` (unbound values, naming, detached styles), `analyze_colors`, `analyze_typography`, `analyze_spacing`, `analyze_overlaps`.

## Review against these areas

- **Purpose and hierarchy**: is the primary action or message the most prominent thing? Are there competing focal points? Is the reading order clear?
- **Layout**: alignment to shared edges, consistent spacing on one scale, related items grouped, enough breathing room, no accidental overlaps or clipped content.
- **Typography**: number of sizes and weights (too many is a common problem), line length (45–80 characters for body text), line height, consistent text styles for the same role.
- **Color**: a clear accent used sparingly, consistent neutrals, status colors with consistent meaning, no near-duplicate colors.
- **Accessibility**: text contrast 4.5:1 (3:1 for large text), meaning not carried by color alone, tap targets at least 44, visible focus states on interactive components, readable minimum text size.
- **Consistency**: same component for the same job, detached or near-duplicate components, values not bound to variables where a system exists.
- **Content**: placeholder text left behind, inconsistent capitalization, labels that do not say what a button does, truncation that hides important information.
- **States**: missing empty, loading, error, hover, or disabled states where the screen needs them.

## Report

Group findings by priority:

1. **Must fix**: breaks usability or accessibility (unreadable text, invisible primary action, overflow hiding content).
2. **Should fix**: inconsistency or weak hierarchy that makes the design harder to use or maintain.
3. **Could improve**: polish.

For each finding, link the layer as `[Layer name](pairdraw://node/<id>)` with the ID from a tool result, say what is wrong and why, and propose the fix in one sentence. Lead with two or three sentences on what works well and the overall impression. Keep the list to the findings that matter; ten sharp findings beat thirty minor ones.

When the user wants comments on the canvas, add each must-fix and should-fix finding with `add_comment` on its layer.

## Fixing

Only when asked: fix the must-fix items first, one area at a time, verifying each with `export_image` or `diff_visual`, and say which findings remain.
