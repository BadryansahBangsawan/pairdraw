---
name: design-system
description: Create or extend a design system in the document, with color, type, spacing, and radius variables in light and dark modes, and core components with variants and properties. Use when the user asks for a design system, UI kit, component library, style guide, tokens, or a set of reusable components.
---

# Design system

A design system is a set of decisions made once: tokens for the values, components for the patterns, and a page that documents both. Keep it small and consistent; a system with fewer, well-named parts is used more than a large one.

## Order of work

1. **Inspect** what exists: `list_collections`, `list_variables`, `get_components`. Extend an existing system rather than starting a parallel one, and keep its naming.
2. **Tokens**: primitives, then semantic tokens that alias them.
3. **Components**: the core set, built on the tokens.
4. **Documentation page**: the tokens and components laid out for people to browse.

## Tokens

Two layers of variables, in two collections:

- **Primitives** (one mode): the raw palette and scales. `gray/50` … `gray/950`, `brand/50` … `brand/950`, a few status hues (`red`, `amber`, `green`, `blue`), spacing steps, radii, font sizes. Nothing in a design binds to primitives directly.
- **Semantic** (modes Light and Dark): what values are for. `bg/page`, `bg/surface`, `bg/subtle`, `text/primary`, `text/muted`, `text/on-accent`, `border/default`, `accent/default`, `accent/hover`, `status/danger`, and so on. Each one aliases a primitive in each mode.

`read_skill_file` with `references/token-scale.md` gives a starting palette structure, spacing and type scales, and the semantic token list. Adjust it to the brand rather than copying it unchanged.

In `render`, `defineVars('Primitives', {...})` and `defineVars('Semantic', {...}, { mode: 'Light' })` with `defineMode(semantic, 'Dark', {...})` create both collections; a semantic value that is another collection's variable becomes an alias. Scope FLOAT variables (gap, corner radius, font size) so they appear only where they apply.

## Components

Build the core set first, each as a main component (or component set with variants) whose fills, strokes, radii, and gaps bind to semantic tokens:

- **Button**: variants `Variant=Primary|Secondary|Ghost|Danger`, `Size=Small|Medium|Large`, `State=Default|Hover|Pressed|Disabled`. A TEXT property for the label and a BOOLEAN plus INSTANCE_SWAP pair for an optional icon.
- **Input**: label, field, help text; states Default, Focus, Invalid, Disabled. `TextField.Input` on the text layer so it behaves in preview.
- **Checkbox, Radio, Switch**: built with Reka parts (`Checkbox.Root`, `RadioGroup.Item`, `Switch.Root`) so they toggle in preview.
- **Select or Dropdown**, **Badge** (status variants), **Avatar** (sizes, image or initials), **Card** (header, body, footer slots), **Tabs**, **Dialog**, **Toast**.

Rules:

- Auto-layout in every component, with `hug` widths for content-sized parts and `fill` where the instance should stretch.
- Expose the things people change as component properties (`property('Label', 'Button')`) instead of expecting overrides on nested layers.
- Name variants `Property=Value` consistently, with the same property names across components (`Size`, `State`, `Variant`).
- Use slots (`create_slot`) for content areas such as a card body, with the preferred components listed.

## Documentation page

Create a page named "Design system" with sections built as auto-layout frames: color swatches with names and values for each mode (show a Dark copy with `mode` set to the Dark mode), the type scale with sample text, spacing and radius samples, and every component with its variants arranged in a grid with labels.

## Finish

Switch the documentation frame between Light and Dark modes and export both with `export_image` to check contrast and that nothing is left unbound. Run `lint` on the components for unbound colors and inconsistent values. Summarize the collections, mode names, and components created.
