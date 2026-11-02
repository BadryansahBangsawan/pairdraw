import { describe, expect, test } from 'bun:test'

import { fileText } from '#dom-css-tests/helpers'
import { layerComponents } from '#dom-css/export'
import { iconDrawing, iconPackagesFor } from '#dom-css/export/components/icons'

import { SceneGraph } from '@open-pencil/scene-graph'
import { withIcon } from '@open-pencil/scene-graph/icons'

/** A frame named `name` holding icon layers of `icons`. */
function iconFrame(name: string, icons: readonly string[]) {
  const graph = new SceneGraph()
  const card = graph.createNode('FRAME', graph.getPages()[0].id, {
    name,
    width: 200,
    height: 40,
    layoutMode: 'HORIZONTAL'
  })
  for (const icon of icons) {
    const layer = graph.createNode('FRAME', card.id, { name: icon, width: 16, height: 16 })
    graph.updateNode(layer.id, { pluginData: withIcon(layer, { name: icon }) })
    graph.createNode('VECTOR', layer.id, { name: 'path', width: 16, height: 16 })
  }
  return { graph, card }
}

/** A card with a Lucide bell, a solid and a regular Font Awesome heart, and a Tabler star. */
const iconCard = () =>
  iconFrame('Card', ['lucide:bell', 'fa6-solid:heart', 'fa6-regular:heart', 'tabler:star'])

describe('icon packages', () => {
  test('Iconify names map to each package’s own export', () => {
    expect(iconDrawing('lucide:arrow-down-0-1', 'lucide', 'react')).toEqual({
      type: 'component',
      import: { source: 'lucide-react', imported: 'LucideArrowDown01', local: 'LucideArrowDown01' }
    })
    expect(iconDrawing('lucide:bell', 'lucide', 'vue')?.import.source).toBe('lucide-vue-next')
    expect(iconDrawing('heroicons:arrow-right-20-solid', 'heroicons', 'vue')?.import).toEqual({
      source: '@heroicons/vue/20/solid',
      imported: 'ArrowRightIcon',
      local: 'ArrowRightIcon'
    })
    expect(iconDrawing('heroicons:bell', 'heroicons', 'react')?.import.source).toBe(
      '@heroicons/react/24/outline'
    )
    expect(iconDrawing('heroicons:bell-solid', 'react-icons', 'react')?.import.imported).toBe(
      'HiBell'
    )
    expect(iconDrawing('bi:house-door', 'react-icons', 'react')?.import).toMatchObject({
      source: 'react-icons/bs',
      imported: 'BsHouseDoor'
    })
    expect(iconDrawing('fa6-regular:heart', 'fontawesome', 'vue')).toEqual({
      type: 'fontawesome',
      import: {
        source: '@fortawesome/free-regular-svg-icons',
        imported: 'faHeart',
        local: 'faHeartRegular'
      },
      component: {
        source: '@fortawesome/vue-fontawesome',
        imported: 'FontAwesomeIcon',
        local: 'FontAwesomeIcon'
      }
    })
  })

  test('React Icons is offered for React alone', () => {
    expect(iconPackagesFor('react')).toContain('react-icons')
    expect(iconPackagesFor('vue')).not.toContain('react-icons')
    expect(iconPackagesFor('vue')).toEqual(['iconify', 'lucide', 'heroicons', 'fontawesome'])
  })

  test('an icon the package lacks stays with Iconify', () => {
    expect(iconDrawing('mdi:home', 'lucide', 'react')).toBeNull()
    expect(iconDrawing('lucide:bell', 'react-icons', 'vue')).toBeNull()
    expect(iconDrawing('lucide:bell', 'iconify', 'react')).toBeNull()
    expect(iconDrawing('bell', 'lucide', 'react')).toBeNull()
  })

  test('React components import the package’s icons and keep Iconify for the rest', async () => {
    const { graph, card } = iconCard()
    const [react] = await layerComponents(graph, [card.id], 'react', { icons: 'fontawesome' })
    const source = fileText(react?.files ?? [], 'Card.tsx')

    expect(source).toContain(
      'import { faHeart as faHeartRegular } from "@fortawesome/free-regular-svg-icons"'
    )
    expect(source).toContain('import { faHeart } from "@fortawesome/free-solid-svg-icons"')
    expect(source).toContain('import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"')
    expect(source).toContain('<FontAwesomeIcon icon={faHeartRegular}')
    // Lucide and Tabler are not Font Awesome's, so Iconify still draws them.
    expect(source).toContain('@iconify/react')
    expect(source).toContain('icon="lucide:bell"')
  })

  test('Vue components draw icons with the package’s components', async () => {
    const { graph, card } = iconCard()
    const [vue] = await layerComponents(graph, [card.id], 'vue', { icons: 'lucide' })
    const sfc = fileText(vue?.files ?? [], 'Card.vue')

    expect(sfc).toContain("import { LucideBell } from 'lucide-vue-next'")
    expect(sfc).toContain('<LucideBell')
    expect(sfc).not.toContain('icon="lucide:bell"')
    expect(sfc).toContain('icon="tabler:star"')
  })

  test('react-icons draws every set it ships', async () => {
    const { graph, card } = iconCard()
    const [react] = await layerComponents(graph, [card.id], 'react', { icons: 'react-icons' })
    const source = fileText(react?.files ?? [], 'Card.tsx')

    expect(source).toContain('import { FaHeart, FaRegHeart } from "react-icons/fa6"')
    expect(source).toContain('import { LuBell } from "react-icons/lu"')
    expect(source).toContain('import { TbStar } from "react-icons/tb"')
    expect(source).not.toContain('@iconify/react')
  })

  test('a component named after its icon imports the icon under another name', async () => {
    const { graph, card } = iconFrame('Bell Icon', ['heroicons:bell'])
    const [react] = await layerComponents(graph, [card.id], 'react', { icons: 'heroicons' })
    const source = fileText(react?.files ?? [], 'BellIcon.tsx')

    expect(source).toContain('import { BellIcon as BellIcon2 } from "@heroicons/react/24/outline"')
    expect(source).toContain('export function BellIcon(')
    expect(source).toContain('<BellIcon2')
    expect(source).not.toMatch(/<BellIcon[\s/>]/)

    const [vue] = await layerComponents(graph, [card.id], 'vue', { icons: 'heroicons' })
    const sfc = fileText(vue?.files ?? [], 'BellIcon.vue')
    expect(sfc).toContain("import { BellIcon as BellIcon2 } from '@heroicons/vue/24/outline'")
    expect(sfc).toContain('<BellIcon2')
    expect(sfc).not.toMatch(/<BellIcon[\s/>]/)
  })

  test('Font Awesome’s component and alike-named icons of two modules stay apart', async () => {
    const fa = iconFrame('Font Awesome Icon', ['fa6-solid:heart'])
    const [react] = await layerComponents(fa.graph, [fa.card.id], 'react', {
      icons: 'fontawesome'
    })
    const source = fileText(react?.files ?? [], 'FontAwesomeIcon.tsx')
    expect(source).toContain(
      'import { FontAwesomeIcon as FontAwesomeIcon2 } from "@fortawesome/react-fontawesome"'
    )
    expect(source).toContain('<FontAwesomeIcon2 icon={faHeart}')

    const hero = iconFrame('Card', ['heroicons:bell', 'heroicons:bell-solid'])
    const [vue] = await layerComponents(hero.graph, [hero.card.id], 'vue', { icons: 'heroicons' })
    const sfc = fileText(vue?.files ?? [], 'Card.vue')
    expect(sfc).toContain("import { BellIcon } from '@heroicons/vue/24/outline'")
    expect(sfc).toContain("import { BellIcon as BellIcon2 } from '@heroicons/vue/24/solid'")
  })
})
