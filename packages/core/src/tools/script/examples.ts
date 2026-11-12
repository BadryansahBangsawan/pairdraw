/**
 * Two programs that show what a code layer can draw, kept beside the tool so an agent starts from
 * something that runs and the app can offer the same starting points.
 */
export const SCRIPT_EXAMPLES = {
  /** A card with a label, a figure, and a trend bar, drawn with explicit geometry. */
  stat_card: `const card = { width: 240, height: 132, radius: 16 }

return pencil.frame({ name: 'Stat card', ...card, fill: '#ffffff', stroke: '#e3e5ea', strokeWeight: 1 }, [
  pencil.text({ name: 'Label', x: 20, y: 18, text: 'Monthly active', fontSize: 12, fill: '#6b7280' }),
  pencil.text({ name: 'Figure', x: 20, y: 40, text: '24,916', fontSize: 32, fontWeight: 700, fill: '#111827' }),
  pencil.text({ name: 'Trend', x: 20, y: 86, text: '+12.4% vs last month', fontSize: 12, fill: '#16a34a' }),
  pencil.roundedRect({ name: 'Trend bar', x: 20, y: 108, width: 200, height: 6, radius: 3, fill: '#e5e7eb' }),
  pencil.roundedRect({ name: 'Trend fill', x: 20, y: 108, width: 124, height: 6, radius: 3, fill: '#16a34a' })
])`,

  /** Bars sized from an array, so the whole chart follows one number list. */
  bar_chart: `const values = [24, 40, 32, 48, 36]
const scale = 3

return pencil.frame({ name: 'Bar chart', width: 320, height: 200, fill: '#ffffff' }, [
  ...values.map((value, index) =>
    pencil.roundedRect({
      name: \`Bar \${index + 1}\`,
      x: 24 + index * 56,
      y: 176 - value * scale,
      width: 40,
      height: value * scale,
      radius: 6,
      fill: index === 3 ? '#5b73f2' : '#c7d2fe'
    })
  )
])`
} as const

export type ScriptExampleName = keyof typeof SCRIPT_EXAMPLES
