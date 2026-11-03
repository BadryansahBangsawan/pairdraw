# Token scale starting point

Adjust every value to the brand. These are proportions that work together, not a required palette.

## Palette structure

Each hue is eleven steps from near-white to near-black. Steps 50–200 are backgrounds and tints, 300–400 borders and disabled states, 500–600 the hue's main use (buttons, links), 700–950 text and dark-mode surfaces.

| Step | Lightness (OKLCH L, approx.) | Typical use                    |
| ---- | ---------------------------- | ------------------------------ |
| 50   | 0.98                         | page tint, subtle hover        |
| 100  | 0.95                         | selected row, badge background |
| 200  | 0.90                         | dividers on tinted areas       |
| 300  | 0.83                         | borders                        |
| 400  | 0.72                         | disabled text, icons           |
| 500  | 0.62                         | primary actions (light mode)   |
| 600  | 0.55                         | primary hover, links           |
| 700  | 0.47                         | text on tints                  |
| 800  | 0.39                         | strong text on tints           |
| 900  | 0.32                         | dark-mode raised surface       |
| 950  | 0.22                         | dark-mode page                 |

Keep chroma lower at both ends of the scale than in the middle, so tints do not glow and darks do not look muddy. Grays carry a small amount of the brand hue (chroma around 0.005–0.015) to feel related to it.

## Spacing

A 4-based scale: 0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128. Name primitives by value (`space/16`) or by step (`space/4` for 16, as Tailwind does) and keep one convention.

## Radius

`radius/none` 0, `radius/sm` 4, `radius/md` 8, `radius/lg` 12, `radius/xl` 16, `radius/full` 9999. Use one radius for controls and the next one up for the surfaces that contain them.

## Type scale

A ratio near 1.2 for product UI, 1.25–1.333 for marketing pages.

| Token             | Size | Line height | Weight |
| ----------------- | ---- | ----------- | ------ |
| `text/caption`    | 12   | 16          | 400    |
| `text/body-sm`    | 14   | 20          | 400    |
| `text/body`       | 16   | 24          | 400    |
| `text/lead`       | 18   | 28          | 400    |
| `text/title-sm`   | 20   | 28          | 600    |
| `text/title`      | 24   | 32          | 600    |
| `text/heading`    | 30   | 36          | 700    |
| `text/display-sm` | 36   | 40          | 700    |
| `text/display`    | 48   | 52          | 700    |

## Semantic tokens

Each aliases a primitive per mode. Suggested Light → Dark mappings, with `neutral` standing for the gray scale and `brand` for the accent hue:

| Token            | Light       | Dark        |
| ---------------- | ----------- | ----------- |
| `bg/page`        | neutral/50  | neutral/950 |
| `bg/surface`     | white       | neutral/900 |
| `bg/subtle`      | neutral/100 | neutral/800 |
| `bg/inverse`     | neutral/900 | neutral/50  |
| `text/primary`   | neutral/900 | neutral/50  |
| `text/muted`     | neutral/600 | neutral/400 |
| `text/inverse`   | white       | neutral/900 |
| `text/on-accent` | white       | white       |
| `border/default` | neutral/200 | neutral/800 |
| `border/strong`  | neutral/300 | neutral/700 |
| `accent/default` | brand/600   | brand/500   |
| `accent/hover`   | brand/700   | brand/400   |
| `accent/subtle`  | brand/50    | brand/950   |
| `status/danger`  | red/600     | red/400     |
| `status/warning` | amber/600   | amber/400   |
| `status/success` | green/600   | green/400   |
| `focus/ring`     | brand/500   | brand/400   |

Check every text token against the backgrounds it sits on: 4.5:1 for body text, 3:1 for large text and for borders and icons that carry meaning.
