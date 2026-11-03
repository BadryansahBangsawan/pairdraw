---
name: slides
description: Build a slide deck or presentation as 16:9 frames, with a consistent master layout, one idea per slide, and readable type. Use when the user asks for slides, a deck, a pitch deck, a presentation, a keynote, or a talk outline turned into slides.
---

# Slides

A slide supports a speaker; it is not a document. One idea per slide, as few words as carry it, and type large enough to read from the back of a room.

## Deck setup

- Each slide is a top-level frame of 1920 × 1080 on one page, named "01 Title", "02 Problem", and so on. The order of the top-level frames on the page is the order of the deck, so create them in sequence and lay them out in a row or grid with `arrange` without reordering them.
- Use a page of its own for the deck when the document holds other work (`create_page`).
- Before drawing, write the outline: a title for every slide and one sentence of what it must say. Show it to the user in your reply if the deck is longer than eight slides.

## Master layout

Define the shared pieces once:

- Margins of 96–128 on every side. Titles sit at the same position on every content slide.
- A small footer (deck title or logo, slide number) in muted text, 18–20.
- Colors and type as variables (`defineVars` in `render`, or `create_collection` and `create_variable`), so a restyle changes the whole deck.
- Build the repeating layouts as components when the deck has more than a few slides: title slide, section divider, title + body, title + two columns, big number, full-bleed image, quote.

## Type

- Slide titles 64–88, body 32–40, captions and footers 20–24. Nothing on a slide below 20.
- At most about 30 words of body per slide. Turn paragraphs into three short bullets or, better, one sentence and a visual.
- One family, two weights, is usually enough. Left-align text; centre only titles on title and divider slides.

## Kinds of slides

- **Title**: deck title, subtitle, speaker or company, date.
- **Section divider**: a large number or word on a strong color.
- **Statement**: one sentence in 72–96, nothing else.
- **Big number**: the figure in 160–240, a label underneath, the source in the footer.
- **Chart**: one message per chart, stated in the title ("Revenue doubled in 2025"), the key series in the accent color and the rest muted. Draw simple bar or line charts with auto-layout frames and vectors; label values directly instead of using a legend.
- **Image**: a full-bleed `stock_photo` with a short caption on a scrim for contrast.
- **Comparison**: two columns with matching structure.
- **Closing**: the single takeaway and a contact or next step.

## Consistency

- Every content slide shares the title position, margins, and footer. Check this by exporting a few slides side by side.
- Use the accent color for one thing per slide: the key number, the highlighted bar, the call to action.
- Keep images the same treatment throughout (all full bleed, or all in rounded frames).

## Finish

Export two or three representative slides with `export_image` and check legibility at thumbnail size: if the title is unreadable in a small preview, it is too small or too long. Select the deck frames, fit the viewport, and tell the user the slide count and that the deck plays in frame order.
