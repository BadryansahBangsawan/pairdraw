---
title: Playing a Prototype
description: Link frames with click and after-delay interactions, then play them on the canvas.
---

# Playing a Prototype

A prototype is the interactions you attach to layers: a click that goes to another frame, a delay that opens an overlay, a Back. Play shows one frame at a time on the canvas and runs those interactions without changing the design.

## Adding Interactions

Select a layer. The design panel's **Prototype** section lists its interactions; choose the plus (**Add interaction**) to add one. Each interaction has:

- **Trigger** — **On click**, or **After delay** with a **Delay** in seconds. A new after-delay interaction starts at 1 second.
- **Action** — **Navigate to**, **Open overlay**, **Back**, or **Close overlay**.
- **Destination**, for Navigate to and Open overlay — a top-level frame on the same page.
- **Animation**, for a destination — **Instant** or **Dissolve**; Dissolve adds a **Duration**, 0.3 seconds for a new interaction.

The minus removes an interaction. Every change is an undo step of its own.

A page with no frame says **Add a frame to this page to link to.**, and its Play button stays hidden.

## Starting Play

Choose **Play** in the Prototype section's header, or toggle **Preview** from the View menu (`⌘⌥↩` on macOS, `Ctrl+Alt+Enter` elsewhere). Play starts from:

- the selected top-level frame,
- else the frame that holds the selected layer,
- else the page's first frame.

The canvas then shows that frame alone: fitted to the window on its tighter axis, with the area around it in the page's color. The panels hide, and the canvas pans but does not select or edit.

A pill at the top of the canvas shows **Previewing**, **Reset**, and **Leave preview**. **Reset** begins again from the frame play started on, and puts every live control back as it was designed. **Leave preview**, or Escape, returns to editing with the view you had before preview started.

## Clicking Through

A click looks for the nearest **On click** interaction on the layer under the pointer, inside the frame being shown, and walks up to the frame itself. Then:

- **Navigate to** shows the destination frame and fits it to the window; the frame you left is remembered for Back.
- **Open overlay** shows the destination over the frame being shown, and a scrim dims the canvas. Clicks then look only inside the overlay. **Close overlay** takes the overlay away and uncovers what was under it.
- **Back** returns to the frame you navigated from and drops any overlays; with no frame behind it, Back does nothing.
- An **After delay** interaction on the frame being shown runs when its delay passes, counted from when the transition into that frame ends, as in Figma. Changing the frame starts its delays again, and leaving play cancels them.
- **Dissolve** crossfades from the frame you leave for the interaction's own **Duration**, easing out, whether a click or a delay started it. With reduced motion on, it cuts instead.

A click that hits no interaction, or lands outside the frame, does nothing. A layer that holds controls takes its own click: play is the canvas's preview view, so a live control runs there as it does in Preview.

## What Play Does Not Do

- An interaction runs its first action only, and the panel edits that one action. A file that carries more actions keeps them, but play runs only the first.
- Two triggers and four actions are the whole set: there is no hover, drag, press, or key trigger, and no Change to, Scroll to, or Swap overlay.
- A destination is a top-level frame on the same page. Components are not offered, and a layer inside a frame cannot be a destination.
- An overlay always opens fitted to the window, like a frame. The panel offers no corner position, and play ignores the position a file stores.
- Dissolve is the only animation besides Instant.
- Navigating to the frame already shown, or opening it as an overlay over itself, does nothing.
- An after-delay interaction runs only on the frame being shown, not on a layer inside it.

## Exporting a Video

**File › Export Prototype as Video…**, or the clapperboard in the Prototype section's header, records what Play shows as a file, without recording the screen. Choose:

- **Start frame** — the frame play starts from, chosen as Play chooses it.
- **Format** — **MP4** (H.264), **GIF**, or **WebM** (VP9). MP4 and WebM are encoded by the browser, so a browser that cannot encode one, such as Firefox before 130, offers GIF; the dialog names the formats it can record.
- **Size** — the start frame at its own size or double, or fitted so its long edge is 1920 or 1280 pixels. A later frame of another shape sits centred on the page color, as Play fits it.
- **Frame rate** — 24, 30, or 60 frames a second, or 10, 15, or 25 for a GIF.
- **Max length** — where the video stops if the flow goes on, up to 120 seconds.

The recording follows the start frame's After delay interactions on a clock of its own, so the video is the same every time and never drops a frame. It ends when play comes back to the start frame, and then loops seamlessly as a GIF; when nothing else happens, after holding the last frame for a second; or at the max length. The dialog says how long the video lasts and at what size before you export, and a frame with no After delay to follow says so instead. An overlay shows over its frame, dimmed by a scrim, where its interaction places it.

The video holds what each frame shows as designed: a live control, a shader, or an animated image fill appears as it is drawn on the canvas, standing still. Agents record the same video through the `export_video` tool, and the CLI through `pairdraw export -f mp4` ([CLI reference](/reference/cli#export)).

## Saved with the Document

Interactions are saved on their layers with the document, and written into a `.fig` file as Figma prototype reactions, so Figma reads the same connections and a round trip keeps them. Playing changes nothing in the document: the session lives in the canvas view and leaves with it.
