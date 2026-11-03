---
name: web-app
description: Design the screens of a desktop web application or SaaS product, such as settings, lists, detail views, forms, and editors, with an app shell and reusable components. Use when the user asks for a web app, admin panel, SaaS screen, settings page, CRUD view, or app UI that is not a phone screen or a marketing page.
---

# Web app

A web application is used for hours, not seconds. Density, predictability, and keyboard-friendly structure matter more than spectacle. Every screen should make its main task obvious and keep secondary tasks reachable.

## App shell first

Build the shell once and reuse it on every screen:

- A top-level frame of 1440 × 900 (or 1280 × 800 for compact apps), as a row: sidebar plus main column.
- **Sidebar**: 220–260 wide, product logo, primary navigation (icon plus label, 32–36 tall rows), a workspace or account switcher at the bottom. The current item uses a tinted background and stronger text, not only a different icon.
- **Main column**: a header row (page title, breadcrumb when nested, page actions on the right) and a content area set to `grow`.
- Make the sidebar and header components so every screen shares them.

## Content patterns

- **List or table view**: toolbar (search, filters, primary action) above a table. Columns sized by content: names `fill`, statuses and dates fixed. Row height 40–48, aligned text baselines, numbers right-aligned with tabular figures (`fontFeatures={{ tnum: true }}`). Include an empty state.
- **Detail view**: title and status at the top, key facts in a two-column property list, related items in tabs or sections below. Actions grouped on the right of the header; destructive actions in an overflow menu.
- **Form or settings**: a single column 560–720 wide, grouped into sections with a title and short description. Labels above fields, help text below, one primary button per form. Fields 32–40 tall.
- **Editor or canvas tools**: toolbars thin and icon-led, panels collapsible, the work area as large as possible.

## Density and spacing

- Base unit 4 or 8. Typical gaps: 4–8 inside controls, 12–16 between related controls, 24–32 between sections.
- Body text 13–14 for dense apps, 14–16 for consumer apps. Use weight and color (muted secondary text) for hierarchy rather than many sizes.
- Align everything to a few vertical edges. Ragged left edges are the most common sign of a hand-built layout.

## Components and states

- Reuse local or library components (`get_components`, `insert_library_component`) for buttons, inputs, selects, badges, avatars, tables, and dialogs before drawing new ones.
- Show the states that change the layout: hover and selected rows, focused and invalid fields, disabled buttons, loading skeletons, empty and error states.
- Controls that should work in preview get behaviours (`Switch.Root`, `Tabs.Root`, `Collapsible.Root`) as the authoring reference describes.

## Multiple screens

Place screens side by side with `arrange`, named "Area – Screen" ("Billing – Invoices"). Keep the shell identical across them; only the content area changes. When the user asks for a flow, add the intermediate states (dialog open, toast shown) as their own frames.

## Finish

Export a screen with `export_image` and check alignment, truncation of long names, and that the main task is visually dominant. Select the screens and summarize what each one covers in two or three lines.
