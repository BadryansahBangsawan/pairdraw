// Builds design-system.fig, the example file of the design system tutorial.
// Start from an empty document and write the result to a new file:
//   echo '{"children":[]}' > empty.pen
//   pairdraw eval empty.pen --stdin -o design-system.fig < design-system.js

await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
await figma.loadFontAsync({ family: 'Inter', style: 'Medium' })
await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' })

// 1. Tokens: a Theme collection with Light and Dark modes, and a Size collection.
// A new .pen document comes with an empty Theme collection; start from none.
for (const collection of figma.variables.getLocalVariableCollections()) {
  if (collection.variableIds.length === 0) collection.remove()
}
const theme = figma.variables.createVariableCollection('Theme')
const light = theme.modes[0].modeId
theme.renameMode(light, 'Light')
const dark = theme.addMode('Dark')

function hex(value) {
  const n = Number.parseInt(value.slice(1), 16)
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255, a: 1 }
}

const colors = {}
for (const [name, lightValue, darkValue] of [
  ['color/background', '#F4F5F7', '#0F1115'],
  ['color/surface', '#FFFFFF', '#1A1D23'],
  ['color/border', '#E1E4EA', '#2D323B'],
  ['color/text', '#191C21', '#F1F3F6'],
  ['color/text-muted', '#5A616E', '#A2A9B5'],
  ['color/primary', '#3451D1', '#8098F7'],
  ['color/on-primary', '#FFFFFF', '#0D1222'],
  ['color/secondary', '#E9ECF2', '#272B33']
]) {
  const variable = figma.variables.createVariable(name, theme, 'COLOR')
  variable.setValueForMode(light, hex(lightValue))
  variable.setValueForMode(dark, hex(darkValue))
  colors[name] = variable
}

const size = figma.variables.createVariableCollection('Size')
const sizes = {}
for (const [name, value] of [
  ['radius/control', 8],
  ['radius/card', 12],
  ['space/sm', 8],
  ['space/md', 16],
  ['space/lg', 24]
]) {
  const variable = figma.variables.createVariable(name, size, 'FLOAT')
  variable.setValueForMode(size.modes[0].modeId, value)
  sizes[name] = variable
}

function paint(variable) {
  return figma.variables.setBoundVariableForPaint(
    { type: 'SOLID', color: { r: 0, g: 0, b: 0 } },
    'color',
    variable
  )
}

function bindAll(node, fields, variable) {
  for (const field of fields) node.setBoundVariable(field, variable)
}

const RADII = ['topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius']

function text(name, characters, style, fontSize, color) {
  const node = figma.createText()
  node.name = name
  node.fontName = { family: 'Inter', style }
  node.fontSize = fontSize
  node.characters = characters
  node.fills = [paint(color)]
  return node
}

const componentsPage = figma.currentPage
componentsPage.name = 'Components'

// 2. Button: two variants that share a Label text property.
function buttonVariant(variant, fill, ink) {
  const button = figma.createComponent()
  button.name = `Variant=${variant}`
  button.layoutMode = 'HORIZONTAL'
  button.primaryAxisSizingMode = 'AUTO'
  button.counterAxisSizingMode = 'AUTO'
  button.primaryAxisAlignItems = 'CENTER'
  button.counterAxisAlignItems = 'CENTER'
  button.paddingTop = 10
  button.paddingBottom = 10
  bindAll(button, ['paddingLeft', 'paddingRight'], sizes['space/md'])
  bindAll(button, RADII, sizes['radius/control'])
  button.fills = [paint(fill)]
  button.appendChild(text('Label', 'Button', 'Medium', 14, ink))
  return button
}

const primary = buttonVariant('Primary', colors['color/primary'], colors['color/on-primary'])
const secondary = buttonVariant('Secondary', colors['color/secondary'], colors['color/text'])
const buttonSet = figma.combineAsVariants([primary, secondary], componentsPage)
buttonSet.name = 'Button'
buttonSet.x = 0
buttonSet.y = 0
buttonSet.layoutMode = 'HORIZONTAL'
buttonSet.primaryAxisSizingMode = 'AUTO'
buttonSet.counterAxisSizingMode = 'AUTO'
buttonSet.itemSpacing = 16
buttonSet.paddingLeft = buttonSet.paddingRight = buttonSet.paddingTop = buttonSet.paddingBottom = 20
const labelKey = buttonSet.addComponentProperty('Label', 'TEXT', 'Button')
for (const variant of [primary, secondary]) {
  variant.findOne((node) => node.name === 'Label').componentPropertyReferences = {
    characters: labelKey
  }
}
pairdraw.setBehaviour(buttonSet, 'button')

// 3. Card: a title property and two slots, Content and Actions.
const card = figma.createComponent()
card.name = 'Card'
card.x = 0
card.y = 160
card.resize(320, 200)
card.layoutMode = 'VERTICAL'
card.primaryAxisSizingMode = 'AUTO'
card.counterAxisSizingMode = 'FIXED'
bindAll(card, ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'], sizes['space/lg'])
card.setBoundVariable('itemSpacing', sizes['space/md'])
bindAll(card, RADII, sizes['radius/card'])
card.fills = [paint(colors['color/surface'])]
card.strokes = [paint(colors['color/border'])]
card.strokeWeight = 1

const title = text('Title', 'Card title', 'Semi Bold', 18, colors['color/text'])
card.appendChild(title)
title.layoutSizingHorizontal = 'FILL'
const titleKey = card.addComponentProperty('Title', 'TEXT', 'Card title')
title.componentPropertyReferences = { characters: titleKey }

function slotFrame(name, layoutMode) {
  const frame = figma.createFrame()
  frame.name = name
  frame.fills = []
  frame.layoutMode = layoutMode
  frame.primaryAxisSizingMode = 'AUTO'
  frame.counterAxisSizingMode = 'AUTO'
  frame.setBoundVariable('itemSpacing', sizes['space/sm'])
  card.appendChild(frame)
  frame.layoutSizingHorizontal = 'FILL'
  return frame
}

const content = slotFrame('Content', 'VERTICAL')
const body = text(
  'Body',
  'Slots hold content that each card chooses for itself.',
  'Regular',
  14,
  colors['color/text-muted']
)
content.appendChild(body)
body.layoutSizingHorizontal = 'FILL'
pairdraw.createSlot(content)

const actions = slotFrame('Actions', 'HORIZONTAL')
const action = primary.createInstance()
actions.appendChild(action)
pairdraw.createSlot(actions)

// 4. Examples: the same cards in each mode, with their own slot content.
const examplesPage = figma.createPage()
examplesPage.name = 'Examples'

function board(name, mode, x) {
  const frame = figma.createFrame()
  frame.name = name
  frame.x = x
  frame.y = 0
  frame.layoutMode = 'VERTICAL'
  frame.primaryAxisSizingMode = 'AUTO'
  frame.counterAxisSizingMode = 'AUTO'
  bindAll(frame, ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'], sizes['space/lg'])
  frame.setBoundVariable('itemSpacing', sizes['space/lg'])
  frame.fills = [paint(colors['color/background'])]
  frame.setExplicitVariableModeForCollection(theme, mode)
  examplesPage.appendChild(frame)

  const welcome = card.createInstance()
  welcome.setProperties({ [titleKey]: 'Welcome back' })
  frame.appendChild(welcome)

  const plan = card.createInstance()
  plan.setProperties({ [titleKey]: 'Pro plan' })
  plan.findOne((node) => node.name === 'Body').characters =
    'Unlimited files, version history, and shared libraries.'
  const planActions = plan.findOne((node) => node.name === 'Actions')
  for (const child of [...planActions.children]) child.remove()
  const upgrade = primary.createInstance()
  upgrade.setProperties({ [labelKey]: 'Upgrade' })
  const later = secondary.createInstance()
  later.setProperties({ [labelKey]: 'Not now' })
  planActions.appendChild(later)
  planActions.appendChild(upgrade)
  frame.appendChild(plan)
  return frame
}

board('Light', light, 0)
board('Dark', dark, 420)

return {
  pages: figma.root.children.map((page) => page.name),
  variables: Object.keys(colors).length + Object.keys(sizes).length
}
