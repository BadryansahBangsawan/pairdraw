Adapt the direction to the request rather than copying it: keep its character, change what the brand or content needs, and keep text at WCAG AA contrast.

- Colors: one variable per palette role in a color collection (create_collection and create_variable, or defineVars in render) and bind fills and strokes to them, so a later restyle changes values, not layers. background fills the page frame, surface fills cards, panels, and inputs, text and mutedText color type, border colors dividers and outlines, accent fills the primary action and links with onAccent on top, highlight marks tags, badges, and the second chart series.
- Type: fonts.heading for headings and display text, fonts.body for everything else, fonts.mono for code, numbers in tables, and labels where given. Pick sizes from typeScale (caption, small, body, then larger headings) instead of inventing new ones.
- Shape: radius.small for buttons, inputs, and tags, radius.medium for cards, radius.large for panels, sheets, and dialogs. strokeWeight for borders and dividers.
- Space: padding and gaps in multiples of spacing.unit, spacing.section between page sections.
- Depth: elevation, when given, goes on raised layers (cards, menus, dialogs) through set_effects with the same fields; null keeps layers flat.
- The guide's Avoid list is as important as the rest.
