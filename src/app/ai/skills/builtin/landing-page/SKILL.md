---
name: landing-page
description: Design a marketing landing page or product homepage, from hero to footer, at desktop and mobile widths. Use when the user asks for a landing page, homepage, launch page, waitlist page, or marketing site section.
---

# Landing page

A landing page has one job: move a visitor from "what is this?" to one action. Every section either explains the offer, earns trust, or repeats the action. Cut anything that does none of these.

## Before you draw

1. Find the one action (sign up, start a trial, book a demo, download) and the one audience. If the request does not say, pick the most likely and state it in one line.
2. Write the page as text first: a headline of at most ten words that names the outcome, a one-sentence subheadline that says how, and the primary button label as a verb ("Start free trial", not "Submit").
3. Check the document for an existing design system with `list_variables` and `get_components`. Reuse its colors, type, and buttons before inventing new ones.

## Structure

Build a single top-level frame named after the page, 1440 wide with `h="hug"`, as a vertical auto-layout column. Each section is a full-width child frame with its own padding, so sections can be reordered and resized independently. A sensible default order:

1. **Navigation**: logo, three to five links, the primary action as a small button. 64–80 tall.
2. **Hero**: headline, subheadline, primary and secondary actions, and one strong visual (product screenshot, illustration, or photo). Keep the headline and button above 720 px.
3. **Proof**: customer logos or a single striking metric. One row, muted.
4. **Benefits**: three or four outcomes, each with an icon, a short title, and two lines of body. Outcomes, not feature names.
5. **Feature detail**: alternating text and image rows for the two or three features that matter most.
6. **Social proof**: one or two testimonials with name, role, and photo. Real-sounding, specific quotes.
7. **Pricing or FAQ** when the offer needs it.
8. **Final call to action**: the headline promise restated and the same primary button.
9. **Footer**: links grouped by topic, legal line, small logo.

Not every page needs every section. A waitlist page may be navigation, hero, three benefits, and a footer.

## Layout rules

- Use a content width of 1120–1200 centred in the 1440 frame: give sections horizontal padding of 120–160, or wrap content in a centred inner frame with a fixed `w`.
- Vertical rhythm: 96–128 between sections, 24–48 inside them. Pick values from one scale (8, 16, 24, 32, 48, 64, 96, 128) and keep to it.
- Use auto-layout everywhere (`flex="col"` / `flex="row"`, `gap`, padding). Text in columns gets `w="fill"` so it wraps instead of overflowing.
- Feature grids use `grid` with `columns="repeat(3, 1fr)"` or a wrapped row, never hand-placed cards.

## Typography and color

- Two type families at most; one is usually enough. Hero headline 56–72, section titles 36–44, body 16–18 with line height around 150%.
- One accent color for actions and highlights. Everything else is neutrals. The primary button is the most saturated element on screen.
- Keep text contrast at WCAG AA (4.5:1 for body text) against its actual background, including text over images: add a scrim or pick a calmer image.

## Imagery

- Use `stock_photo` for photography, with descriptive English queries, on leaf rectangles sized to the final crop.
- Product screenshots work better as a framed device or a rounded card with a soft shadow than as a raw rectangle.
- Use `Icon` with a consistent icon set and size (20–24) for benefit icons.

## Mobile version

When asked for mobile, or when the page is finished and the user wants responsive views, add a second top-level frame 390 wide beside the desktop one. Stack every row into a column, reduce the hero headline to 36–44, keep tap targets at least 44 tall, and collapse the navigation links into a menu icon.

## Finish

- Export the page with `export_image` and look at it. Check hierarchy (is the headline the first thing you see?), alignment, and that the primary action repeats at the end.
- Select the page frame and fit the viewport to it.
- Summarize in two or three lines: the page's audience and action, and anything left as a placeholder.
