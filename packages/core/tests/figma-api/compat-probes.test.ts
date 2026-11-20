import { describe, expect, test } from 'bun:test'

import type { TextNode } from '@figma/plugin-typings'

import { asTextNode, createAPI, registerTestFont } from '#core-tests/helpers/figma-api'

const RED = { type: 'SOLID' as const, color: { r: 1, g: 0, b: 0 }, opacity: 1, visible: true }

describe('Figma documented behaviour', () => {
  test('children and fills come back as fresh copies', () => {
    const figma = createAPI()
    const page = figma.currentPage
    const frame = figma.createFrame()
    frame.fills = [RED]

    expect(page.children).not.toBe(page.children)
    expect(page.children.filter((child) => child.id === frame.id)).toHaveLength(1)
    expect(frame.fills).not.toBe(frame.fills)
    expect(frame.fills).toHaveLength(1)
  })

  test('setting fills copies the array, so editing it afterwards changes nothing', () => {
    const figma = createAPI()
    const frame = figma.createFrame()
    const fills = [{ ...RED }]
    frame.fills = fills
    fills.push(RED)
    expect(frame.fills).toHaveLength(1)
  })

  test('clone appends the copy to the same parent', () => {
    const figma = createAPI()
    const frame = figma.createFrame()
    const first = figma.createRectangle()
    const second = figma.createRectangle()
    frame.appendChild(first)
    frame.appendChild(second)
    const copy = first.clone()
    expect(copy.parent?.id).toBe(frame.id)
    expect(frame.children.map((child) => child.id)).toEqual([first.id, second.id, copy.id])
  })

  test('resize keeps constraints and resizeWithoutConstraints does not', () => {
    const figma = createAPI()
    const frame = figma.createFrame()
    frame.resize(200, 200)
    const child = figma.createRectangle()
    frame.appendChild(child)
    child.resize(50, 50)
    child.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' }
    const plain = figma.createRectangle()
    frame.appendChild(plain)
    plain.resize(50, 50)
    plain.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' }

    frame.resizeWithoutConstraints(300, 300)
    expect(plain.width).toBeCloseTo(50, 3)
    expect(child.width).toBeCloseTo(50, 3)

    const stretched = figma.createFrame()
    stretched.resize(200, 200)
    const growing = figma.createRectangle()
    stretched.appendChild(growing)
    growing.resize(50, 50)
    growing.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' }
    stretched.resize(400, 400)
    expect(growing.width).toBeCloseTo(250, 3)
  })

  test('findAll walks the document in order and findOne takes the first', () => {
    const figma = createAPI()
    const frame = figma.createFrame()
    const outer = figma.createRectangle()
    outer.name = 'One'
    frame.appendChild(outer)
    const inner = figma.createRectangle()
    inner.name = 'Two'
    outer.appendChild(inner)
    const found = figma.currentPage.findAll((node) => node.name !== '')
    expect(found.map((node) => node.name)).toEqual(
      found.map((node) => node.name).slice().sort((a, b) => (a < b ? -1 : 1))
    )
    expect(figma.currentPage.findOne((node) => node.name === 'Two')?.id).toBe(inner.id)
  })

  test('appending into an instance throws', async () => {
    await registerTestFont()
    const figma = createAPI()
    const component = figma.createComponent()
    const instance = component.createInstance()
    expect(() => {
      instance.appendChild(figma.createRectangle())
    }).toThrow()
  })

  test('getRangeFontName returns the run font and mixed for differing runs', async () => {
    await registerTestFont()
    const figma = createAPI()
    const text = asTextNode(figma.createText()) as TextNode
    text.fontName = { family: 'Inter', style: 'Regular' }
    text.characters = 'abcdef'
    text.setRangeFontName(0, 3, {
      family: 'Inter',
      style: 'Regular',
      variationSettings: { wght: 700 }
    })
    const run = text.getRangeFontName(0, 3)
    expect(run).toMatchObject({ family: 'Inter', style: 'Regular' })
    expect(text.getRangeFontName(0, 6)).toEqual(figma.mixed)
  })
})
