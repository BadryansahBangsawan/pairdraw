import { SCRIPT_EXAMPLES } from '@open-pencil/core/tools'

/** A program Goodies places on the canvas as a code layer, ready to edit. */
export interface GoodieScript {
  id: 'statCard' | 'barChart' | 'swatches' | 'calendar' | 'dots'
  source: string
}

/** A row of tints from one hue, sized by the `@input`s the panel shows. */
const SWATCHES_SOURCE = `/**
 * @schema
 * @input hue number = 18
 * @input steps number = 6
 */
const hue = Number(pencil.inputs.hue ?? 18)
const steps = Math.max(2, Math.min(10, Math.round(Number(pencil.inputs.steps ?? 6))))
const size = 56
const hex = (value) => Math.round(value * 255).toString(16).padStart(2, '0')
const tint = (lightness) => {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * 0.75
  const sector = (((hue % 360) + 360) % 360) / 60
  const second = chroma * (1 - Math.abs((sector % 2) - 1))
  const [r, g, b] = [
    [chroma, second, 0],
    [second, chroma, 0],
    [0, chroma, second],
    [0, second, chroma],
    [second, 0, chroma],
    [chroma, 0, second]
  ][Math.floor(sector) % 6]
  const lift = lightness - chroma / 2
  return '#' + hex(r + lift) + hex(g + lift) + hex(b + lift)
}

return pencil.frame(
  { name: 'Swatches', width: steps * size + 32, height: size + 32, fill: '#ffffff' },
  Array.from({ length: steps }, (_, index) =>
    pencil.roundedRect({
      name: \`Tint \${index + 1}\`,
      x: 16 + index * size,
      y: 16,
      width: size - 8,
      height: size,
      radius: 10,
      fill: tint(0.9 - (index / (steps - 1)) * 0.7)
    })
  )
)`

/** A month laid out as a grid of days from two numbers. */
const CALENDAR_SOURCE = `/**
 * @schema
 * @input days number = 30
 * @input startsOn number = 2
 */
const days = Math.max(28, Math.min(31, Math.round(Number(pencil.inputs.days ?? 30))))
const offset = Math.max(0, Math.min(6, Math.round(Number(pencil.inputs.startsOn ?? 2))))
const cell = 40
const names = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const rows = Math.ceil((offset + days) / 7)

return pencil.frame(
  { name: 'Calendar', width: 7 * cell + 32, height: (rows + 1) * cell + 32, fill: '#ffffff' },
  [
    ...names.map((name, column) =>
      pencil.text({
        name: 'Weekday',
        x: 16 + column * cell,
        y: 26,
        width: cell,
        text: name,
        fontSize: 11,
        fontWeight: 600,
        align: 'CENTER',
        fill: '#9ca3af'
      })
    ),
    ...Array.from({ length: days }, (_, index) => {
      const slot = offset + index
      const weekend = slot % 7 > 4
      return pencil.frame(
        {
          name: \`Day \${index + 1}\`,
          x: 16 + (slot % 7) * cell + 3,
          y: 16 + (Math.floor(slot / 7) + 1) * cell + 3,
          width: cell - 6,
          height: cell - 6,
          radius: 8,
          fill: weekend ? '#f3f4f6' : '#ffffff'
        },
        [
          pencil.text({
            name: 'Number',
            x: 0,
            y: 10,
            width: cell - 6,
            text: String(index + 1),
            fontSize: 12,
            align: 'CENTER',
            fill: weekend ? '#9ca3af' : '#111827'
          })
        ]
      )
    })
  ]
)`

/** Scattered dots from the script's seeded \`Math.random\`, the same on every run of one layer. */
const DOTS_SOURCE = `/**
 * @schema
 * @input count number = 60
 */
const count = Math.max(1, Math.min(300, Math.round(Number(pencil.inputs.count ?? 60))))
const width = 320
const height = 200
const colors = ['#ff5b2e', '#17171c', '#f2c94c', '#8a8a93']

return pencil.frame(
  { name: 'Dots', width, height, fill: '#f7f5f2' },
  Array.from({ length: count }, (_, index) => {
    const size = 6 + Math.random() * 22
    return pencil.ellipse({
      name: \`Dot \${index + 1}\`,
      x: Math.random() * (width - size),
      y: Math.random() * (height - size),
      width: size,
      height: size,
      opacity: 0.35 + Math.random() * 0.65,
      fill: colors[Math.floor(Math.random() * colors.length)]
    })
  })
)`

export const GOODIE_SCRIPTS: readonly GoodieScript[] = [
  { id: 'statCard', source: SCRIPT_EXAMPLES.stat_card },
  { id: 'barChart', source: SCRIPT_EXAMPLES.bar_chart },
  { id: 'swatches', source: SWATCHES_SOURCE },
  { id: 'calendar', source: CALENDAR_SOURCE },
  { id: 'dots', source: DOTS_SOURCE }
]
