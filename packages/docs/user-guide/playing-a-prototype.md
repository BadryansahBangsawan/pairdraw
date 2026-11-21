---
title: Playing a Prototype
description: Link frames, switch component variants, and scroll frames with interactions, then play them on the canvas.
---

# Playing a Prototype

A prototype is the interactions you attach to layers: a click that goes to another frame, a hover that switches a button to its hover variant, a list that scrolls. Play shows one frame at a time on the canvas and runs those interactions without changing the design.

## Adding Interactions

Select a layer. The design panel's **Prototype** section lists its interactions; choose the plus (**Add interaction**) to add one. Each interaction has:

- **Trigger** — **On click**, **While hovering**, **While pressing**, **Mouse enter**, **Mouse leave**, or **After delay**. After delay, Mouse enter, and Mouse leave have a **Delay** in seconds; a new After delay starts at 1 second, a new Mouse enter or Mouse leave at none.
- **Action** — **Navigate to**, **Open overlay**, **Change to**, **Scroll to**, **Back**, or **Close overlay**. Change to is offered on a variant, an instance of a variant, or a layer inside one; Scroll to on a screen that has something to scroll.
- **Destination** — a top-level frame on the same page for Navigate to and Open overlay; another variant of the set for Change to, named by the value that tells it apart; a layer inside a scrolling frame for Scroll to.
- **Animation** — **Instant** or **Dissolve**; Dissolve adds a **Duration**, 0.3 seconds for a new interaction.

The minus removes an interaction. Every change is an undo step of its own.

A page with no frame says **Add a frame to this page to link to.**, and its Play button stays hidden.

## Interactive Components

Add the interactions to the variants of a component set, once: on the Default variant, **While hovering** → **Change to** Hover, and **On click** → **Change to** Selected. Every instance of the set then reacts in play by the variant it shows, so tabs, toggles, accordions, and hover states need no frame per state.

An instance runs its main component's interactions. An interaction you add to the instance itself replaces the main component's interaction of the same trigger. The Prototype section of an instance shows how many interactions it takes from its main component; choose the line to select the main component and edit them.

An **After delay** on a variant runs on each instance once it shows that variant, so a Loading variant can turn into Done by itself.

## Scrolling Frames

Select a frame, component, or instance, and set **Overflow scrolling** in the Prototype section to **Vertical**, **Horizontal**, or **Both directions**.

- A frame inside a screen scrolls when its content reaches past its edge and it clips its content. With **Clip content** off, the section says so.
- A screen that scrolls vertically and is taller than the window plays fitted to its width, and the canvas pans through the rest; one that scrolls sideways and is wider plays fitted to its height.

In play the wheel, or a drag, scrolls the innermost frame under the pointer that can move that way, then the next one out; what none of them can take pans the canvas. A drag that scrolled runs no click. Ctrl or ⌘ with the wheel still zooms.

**Scroll to** scrolls every frame around its layer, innermost first, until the layer meets each one's top left, as far as each can scroll; with Dissolve it eases there. On a screen that pans, the canvas pans the layer to the top of the window.

## Starting Play

Choose **Play** in the Prototype section's header, or toggle **Preview** from the View menu (`⌘⌥↩` on macOS, `Ctrl+Alt+Enter` elsewhere). Play starts from:

- the selected top-level frame,
- else the frame that holds the selected layer,
- else the page's first frame.

The canvas then shows that frame alone: fitted to the window on its tighter axis, with the area around it in the page's color. The panels hide, and the canvas pans but does not select or edit.

A pill at the top of the canvas shows **Previewing**, **Reset**, and **Leave preview**. **Reset** begins again from the frame play started on, puts every switched variant and scrolled frame back as designed, and puts every live control back as it was designed. **Leave preview**, or Escape, returns to editing with the view you had before preview started.

## Clicking and Hovering Through

A click goes to the topmost layer under the pointer, inside the frame being shown, that has an **On click** interaction or shows a fill, stroke, image, or text there, and runs the nearest On click interaction from that layer up to the frame. A layer with an interaction counts over its whole box, so a button's background takes its click as its label does. A filled sheet laid over a button keeps the click from it, while an unfilled frame laid over the screen lets the click through, and a mask hides what lies outside it. Then:

- **Navigate to** shows the destination frame and fits it to the window; the frame you left is remembered for Back.
- **Open overlay** shows the destination over the frame being shown, and a scrim dims the canvas. Clicks then look only inside the overlay. **Close overlay** takes the overlay away and uncovers what was under it.
- **Change to** shows the chosen variant on the instance the layer belongs to, keeping its overrides, and lays out the auto layout around it.
- **Back** returns to the frame you navigated from and drops any overlays; with no frame behind it, Back does nothing.
- An **After delay** interaction on the frame being shown runs when its delay passes, counted from when the transition into that frame ends, as in Figma. Changing the frame starts its delays again, and leaving play cancels them.
- **Dissolve** crossfades from the frame you leave for the interaction's own **Duration**, easing out, whether a click or a delay started it. With reduced motion on, it cuts instead.

**While hovering** runs as the pointer enters a layer and is undone as it leaves: a variant switches back. **While pressing** runs on press and is undone on release, or when the pointer leaves the canvas first. A Dissolve crossfades for a hover, a press, and a delay as it does for a click. **Mouse enter** and **Mouse leave** run as the pointer enters or leaves, after their delay unless the pointer moves back first, and are not undone. A hovered variant goes back when another frame shows.

A click that hits no interaction, or lands outside the frame, does nothing. A layer that holds controls takes its own click: play is the canvas's preview view, so a live control runs there as it does in Preview.

## What Play Does Not Do

- An interaction runs its first action only, and the panel edits that one action. A file that carries more actions keeps them, but play runs only the first.
- There is no drag or key trigger, and no Swap overlay, Open link, or variable action.
- An overlay always opens fitted to the window, like a frame. The panel offers no corner position, and play ignores the position a file stores.
- A While hovering or While pressing that opens an overlay or navigates is not undone: the overlay stays open until it is closed, and the frame stays until Back, as the new frame covers the layer the pointer would leave.
- Dissolve is the only animation besides Instant. Smart animate from a Figma file plays as a dissolve and is kept when the file is saved, as is Figma's animated scroll on a Scroll to. A Scroll to set to Dissolve in Pairdraw eases in play but is saved to `.fig` as instant, since which animation Figma reads for one is not confirmed.
- Fixed and sticky layers in a scrolling frame scroll with it, and Scroll to ignores the offset a Figma file stores.
- A frame that holds live controls is drawn by Preview, so a Change to or scrolling inside it does not show.
- Navigating to the frame already shown, or opening it as an overlay over itself, does nothing.

## Exporting a Video

**File › Export Prototype as Video…**, or the clapperboard in the Prototype section's header, records what Play shows as a file, without recording the screen. Choose:

- **Start frame** — the frame play starts from, chosen as Play chooses it.
- **Format** — **MP4** (H.264), **GIF**, or **WebM** (VP9). MP4 and WebM are encoded by the browser, so a browser that cannot encode one, such as Firefox before 130, offers GIF; the dialog names the formats it can record.
- **Size** — the start frame at its own size or double, or fitted so its long edge is 1920 or 1280 pixels. A later frame of another shape sits centred on the page color, as Play fits it.
- **Frame rate** — 24, 30, or 60 frames a second, or 10, 15, or 25 for a GIF.
- **Max length** — where the video stops if the flow goes on, up to 120 seconds.

The recording follows the start frame's After delay interactions on a clock of its own, so the video is the same every time and never drops a frame. It ends when play comes back to the start frame, and then loops seamlessly as a GIF; when nothing else happens, after holding the last frame for a second; or at the max length. The dialog says how long the video lasts and at what size before you export, and a frame with no After delay to follow says so instead. An overlay shows over its frame, dimmed by a scrim, where its interaction places it.

The video holds what each frame shows as designed: a live control, a shader, or an animated image fill appears as it is drawn on the canvas, standing still. It follows frames, overlays, and their After delays: a Change to, a hover, a press, and scrolling are not recorded, so an instance shows the variant it has in the design. Agents record the same video through the `export_video` tool, and the CLI through `pairdraw export -f mp4` ([CLI reference](/reference/cli#export)).

## Saved with the Document

Interactions and overflow scrolling are saved on their layers with the document and written into a `.fig` file as Figma prototype reactions and scroll settings, so Figma reads the same prototype and a round trip keeps it. A **Mouse enter** or **Mouse leave** delay read from a Figma file goes back into it; one set in Pairdraw plays but is not written to `.fig` yet, until where Figma stores it is confirmed. Playing changes nothing in the document: the session lives in the canvas view and leaves with it.
