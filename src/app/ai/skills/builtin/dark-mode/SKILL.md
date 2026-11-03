---
name: dark-mode
description: Convert an existing design to dark mode, or add a Dark mode beside Light, by binding colors to variables with Light and Dark values instead of inverting them. Use when the user asks for dark mode, a dark theme, a dark version, night mode, or light and dark variants of a design.
---

# Dark mode

Dark mode is not inverted light mode. Surfaces get darker as they sit lower, elevation is shown with lighter surfaces rather than shadows, saturated colors are toned down, and text is off-white rather than pure white. Do it with variables, so one design shows in either mode.

## Plan

1. Inspect colors: `list_collections` and `list_variables` for existing tokens; `analyze_colors` for the raw colors the design uses and how often.
2. If a semantic color collection exists, add a Dark mode to it. If colors are raw values, create a collection (for example "Theme") with modes Light and Dark and one variable per role.
3. Map every raw color to a role: `bg/page`, `bg/surface`, `bg/raised`, `text/primary`, `text/muted`, `border/default`, `accent/default`, `accent/hover`, `text/on-accent`, `status/*`. Two raw colors that play the same role become one variable; one raw color used for two roles becomes two.

## Dark values

- **Page** around #0F1115–#16181D, not pure black. **Surface** one step lighter (#1A1D23), **raised** surfaces (menus, dialogs, cards on cards) one step lighter again (#22262E).
- **Text**: primary around #E8EAED (not #FFFFFF), muted around #9BA1AA. Check muted text against each surface it sits on; it is the first thing to fail contrast.
- **Borders**: low-contrast lines (#2A2E36) rather than light gray.
- **Accent**: lighten and slightly desaturate the light-mode accent so it does not vibrate on dark backgrounds; recheck the text on accent buttons.
- **Status colors**: lighter tints of the same hues (red/400 instead of red/600).
- **Shadows**: mostly remove them; separate surfaces by lightness and borders instead.
- **Images and illustrations**: keep photos; give bright illustrations or logos a dark variant or a surface behind them.

## Apply

- Create the variables with both modes (`create_variable`, then `set_variable` per mode, or `defineVars` and `defineMode` in `render`).
- Bind every fill and stroke to its variable with `bind_variable`, or with `replace_matching_properties` for many layers at once. Edit main components so instances follow.
- For a side-by-side result, `clone_node` the frame and set the copy's variable mode to Dark (as the Appearance panel's mode control does; `mode` in `render`). Without a copy, switching the frame's mode shows dark in place.
- Leave nothing unbound: any raw color left behind stays the same in both modes, which is usually a bug.

## Check

- Export Light and Dark side by side with `export_image`. Look for unbound leftovers (a white card on a dark page), lost hierarchy (surfaces that blend together), and glaring accents.
- Body text at least 4.5:1, large text and meaningful icons and borders at least 3:1, in both modes.
- `lint` flags hard-coded colors that should be bound.

Summarize the collection and modes, how many layers were bound, and any color you left fixed on purpose (a brand logo, a photo).
