---
name: dashboard
description: Design a data dashboard, analytics view, or data-dense table screen with KPI tiles, charts, and tables that read at a glance. Use when the user asks for a dashboard, analytics page, admin overview, metrics screen, report view, or a large data table.
---

# Dashboard

A dashboard answers a few recurring questions quickly. Start from the questions, not the widgets: "How are we doing this week? What changed? What needs attention?" Each question gets one block, placed by importance.

## Before you draw

1. List three to six questions the dashboard answers and the metric or chart that answers each.
2. Invent plausible, internally consistent data: totals that match their breakdowns, percentages that add up, dates in one range. Realistic numbers (12,480, not 10,000) make the design believable.
3. Reuse the document's shell, components, and variables if they exist (`get_components`, `list_variables`); see the `web-app` skill for the app shell.

## Layout

- Frame 1440 × 900 or taller with `h="hug"` when it scrolls. Use a 12-column grid (`grid`, `columns="repeat(12, 1fr)"`, gap 16–24) and span blocks with `colSpan`, so blocks align on shared edges.
- Top row: KPI tiles, three to five across. Then the primary chart, wide. Then secondary charts and tables.
- Cards: 16–24 padding, a title row (title, period or filter, overflow menu), then content. Same radius, border, and background on every card.
- A filter bar (date range, segment) above the grid applies to the whole page; say so with its position.

## KPI tiles

Label (muted, 13–14), value (28–36, tabular figures with `fontFeatures={{ tnum: true }}`), and change versus the previous period with an arrow and a color. Green and red for good and bad, never for up and down: a rise in churn is bad. Add a sparkline only when the trend matters.

## Charts

- Pick by question: trend over time is a line or area chart; comparison across categories is a horizontal bar chart sorted by value; part of a whole with few parts is a stacked bar (avoid pies with more than four slices); distribution is a histogram.
- Draw charts as editable layers: bars as auto-layout rows of rectangles with heights or widths proportional to the data, lines as `Vector` paths computed in the JSX from the data (`{data.map(...)}`), axes and gridlines in a light neutral.
- One highlight color for the series that matters, muted neutrals for the rest. Label lines directly at their end instead of a legend when there are three or fewer.
- Axis labels 11–12, muted; start bar charts at zero.

## Tables

- Header row in muted, medium-weight 12–13 text; rows 40–48 tall with a subtle divider or zebra stripe, not both.
- Left-align text, right-align numbers, align decimals. Status as small badges. Truncate long names with an ellipsis rather than wrapping rows.
- Show sort direction on the sorted column, and pagination or a row count at the bottom.

## Color and accessibility

- Neutral surfaces, one accent, and a small, consistent status palette (success, warning, danger, info). Bind them to variables so a dark mode can follow (see `dark-mode`).
- Do not rely on color alone: pair status colors with icons or text, and keep chart colors distinguishable in grayscale.

## Finish

Export the dashboard with `export_image`. Check that the most important number is the first thing you see, that blocks align on the grid, and that numbers line up in tables. Summarize which questions the dashboard answers in two or three lines.
