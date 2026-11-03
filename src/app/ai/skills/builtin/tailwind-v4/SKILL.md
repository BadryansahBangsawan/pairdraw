---
name: tailwind-v4
description: Design so the result exports cleanly to Tailwind CSS v4, with tokens that become @theme variables, spacing on Tailwind's scale, and auto-layout that maps to flex and grid utilities, then export the HTML and theme. Use when the user mentions Tailwind, Tailwind v4, utility classes, or wants a design turned into Tailwind code.
---

# Tailwind CSS v4

Pairdraw exports auto-layout frames as flex and grid utilities and document variables as CSS custom properties. A design built with that mapping in mind exports to short, idiomatic Tailwind; one built from absolute positions and one-off values exports to arbitrary values everywhere.

## Tokens become @theme

Tailwind v4 is configured in CSS: `@theme { --color-brand-500: …; --radius-card: …; }` creates utilities such as `bg-brand-500` and `rounded-card`. Name variables so their exported names land in the right namespace:

- Colors: COLOR variables become `--color-*`. Name them by group and step, as Tailwind does: `brand/500`, `gray/50` … `gray/950`, or semantic names such as `surface`, `on-surface`, `primary`. `Color/brand/500` and `brand/500` both export as `--color-brand-500`.
- Spacing and sizes: FLOAT variables scoped to gap or width and height become `--spacing-*`. Prefer Tailwind's own scale (4 px steps) over custom spacing tokens; add tokens only for named layout values such as `spacing/sidebar`.
- Radius: scope to corner radius or name them `radius/card`, giving `--radius-card` and `rounded-card`.
- Type: font sizes `text/…`, line heights `leading/…`, letter spacing `tracking/…`, families `font/…`, weights `font-weight/…`.
- Modes (Light, Dark) export as mode scopes with a `@custom-variant` each, so `dark:` style utilities can follow.

Create them with `defineVars` in `render`, or with `create_collection` and `create_variable`, then bind fills, radii, and gaps to them instead of typing raw values.

## Values on the scale

- Spacing, padding, and gaps in multiples of 4: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96. These export as `p-4`, `gap-6`, and so on; 13 or 22 export as arbitrary values (`p-[13px]`).
- Font sizes from Tailwind's defaults (12, 14, 16, 18, 20, 24, 30, 36, 48, 60, 72) unless the project has its own scale.
- Radii 2, 4, 6, 8, 12, 16, 24, or full (9999) for pills.
- Shadows close to Tailwind's `shadow-sm`, `shadow-md`, `shadow-lg`, or a named token.

## Layout that maps to utilities

- Every container is auto-layout: `flex="row"` → `flex`, `flex="col"` → `flex flex-col`, `gap` → `gap-*`, `justify`/`items` → `justify-*`/`items-*`, `grow` → `grow`, `w="fill"` → `w-full` or `flex-1`.
- Grids use `grid` with `columns="repeat(3, 1fr)"` → `grid grid-cols-3`.
- Avoid absolute positioning except for real overlays (badges, decorative shapes); it exports as `absolute` with offsets.
- Text styles: set size, weight, line height, and color on the text layer, not via wrapper frames.

## Responsive designs

Tailwind is mobile first. When the user wants responsive output, design the mobile frame (390) and the desktop frame (1280–1440) with the same layer structure and names, so the code can be merged into one component with `md:` and `lg:` variants. Say in your summary which frame is the base.

## Export

- `design_to_tokens` with `format: "tailwind"` writes the `@theme` block and mode variants for the document's variables.
- `export_html` with `style: "tailwind"` writes the markup with utility classes; `html: "standalone"` gives a whole page, and a token named in `@theme` exports as its utility rather than an arbitrary value.
- When the user wants React, Vue, or another framework, export Tailwind HTML first and convert the markup, keeping the class names.

## Finish

Export the HTML of the main frame and skim it: many `[…px]` arbitrary values mean the design is off the scale or not bound to tokens, so fix those at the source and export again. Report the theme tokens you created and any values that stayed arbitrary on purpose.
