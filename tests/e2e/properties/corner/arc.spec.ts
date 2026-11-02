import { expect, test, useEditorSetupWithClear } from '#tests/e2e/fixtures'
import { shapeHandlesDriver } from '#tests/helpers/canvas/shape-handles-driver'
import { propertySection } from '#tests/helpers/properties'

// An ellipse's arc is typed in the panel as its handles show it: the start in degrees, the sweep
// in percent of a turn, and the inner ratio in percent of the radius.

const editor = useEditorSetupWithClear('/?test&no-rulers')

const shapes = shapeHandlesDriver(() => editor.page)

function arcField(name: 'Start' | 'Sweep' | 'Ratio') {
  return propertySection(editor.page, 'Appearance')
    .getByRole('group', { name: 'Arc' })
    .getByRole('spinbutton', { name, exact: true })
}

async function fill(name: 'Start' | 'Sweep' | 'Ratio', value: string) {
  const field = arcField(name)
  await field.focus()
  await field.fill(value)
  await field.press('Enter')
  await editor.canvas.waitForRender()
}

test('an ellipse types its start, sweep, and ratio, each one undo step', async () => {
  const nodeId = await shapes.show({}, 'ELLIPSE')
  await editor.canvas.waitForRender()
  await expect(arcField('Start')).toHaveText(/^0/)
  await expect(arcField('Sweep')).toHaveText(/^100/)
  await expect(arcField('Ratio')).toHaveText(/^0/)

  await fill('Sweep', '75')
  expect(await shapes.arc(nodeId)).toEqual({ start: 0, end: 270, ratio: 0 })

  await fill('Start', '90')
  expect(await shapes.arc(nodeId)).toEqual({ start: 90, end: 360, ratio: 0 })

  await fill('Ratio', '40')
  expect(await shapes.arc(nodeId)).toEqual({ start: 90, end: 360, ratio: 0.4 })

  await editor.page.keyboard.press('ControlOrMeta+z')
  await editor.canvas.waitForRender()
  expect(await shapes.arc(nodeId)).toEqual({ start: 90, end: 360, ratio: 0 })
})

test('a rectangle shows no arc fields', async () => {
  await shapes.show({}, 'RECTANGLE')
  await editor.canvas.waitForRender()
  await expect(
    propertySection(editor.page, 'Appearance').getByRole('group', { name: 'Arc' })
  ).toHaveCount(0)
})
