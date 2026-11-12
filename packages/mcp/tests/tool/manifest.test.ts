import { describe, expect, test } from 'bun:test'

// eslint-disable-next-line open-pencil/no-mixed-case-acronym-identifiers -- Upstream export spelling.
import { toJsonSchema as toJSONSchema } from '@valibot/to-json-schema'

import { createToolDescriptors, getMCPToolDefinitions } from '#mcp/tool/manifest'

/** Core tools MCP clients reach for the designs they write and read back. */
const EXPECTED = {
  export_html: { effect: 'read', capabilities: ['document:read', 'network:access'] },
  import_html: { effect: 'write', capabilities: ['document:write'] },
  find_empty_space: { effect: 'read', capabilities: ['document:read'] },
  replace_matching_properties: { effect: 'write', capabilities: ['document:write'] },
  diff_changes: { effect: 'read', capabilities: ['document:read'] },
  set_image_fill: { effect: 'write', capabilities: ['document:write', 'network:access'] },
  get_style: { effect: 'read', capabilities: ['document:read'] },
  rescale: { effect: 'write', capabilities: ['document:write'] },
  generate_image: { effect: 'write', capabilities: ['document:write', 'network:access'] },
  remove_background: { effect: 'write', capabilities: ['document:write', 'network:access'] },
  replace_background: { effect: 'write', capabilities: ['document:write', 'network:access'] },
  generate_svg: { effect: 'write', capabilities: ['document:write', 'network:access'] }
} as const

describe('MCP exposes the agent tools for code, space, and change review', () => {
  const descriptors = new Map(createToolDescriptors(false).map((tool) => [tool.name, tool]))
  const definitions = new Map(getMCPToolDefinitions().map((tool) => [tool.name, tool]))

  test.each(Object.entries(EXPECTED))('%s is registered with its effect', (name, expected) => {
    expect(descriptors.get(name)).toMatchObject({ ...expected, availability: 'default' })
  })

  test.each(Object.keys(EXPECTED))('%s has an input JSON Schema clients can read', (name) => {
    const definition = definitions.get(name)
    if (!definition) throw new Error(`${name} is not an MCP tool`)
    expect(toJSONSchema(definition.input, { typeMode: 'input' })).toMatchObject({ type: 'object' })
  })

  test('the new options appear in the published schemas', () => {
    const properties = (name: string) => {
      const definition = definitions.get(name)
      if (!definition) throw new Error(`${name} is not an MCP tool`)
      const schema = toJSONSchema(definition.input, { typeMode: 'input' })
      return 'properties' in schema && schema.properties ? Object.keys(schema.properties) : []
    }
    expect(properties('export_image')).toContain('quality')
    expect(properties('insert_icon')).toEqual(
      expect.arrayContaining(['weight', 'fill', 'grade', 'optical_size', 'options'])
    )
    expect(properties('create_slot')).toEqual(
      expect.arrayContaining(['preferred_ids', 'preferred_only', 'min_children', 'max_children'])
    )
    expect(properties('export_html')).toEqual(
      expect.arrayContaining(['style', 'html', 'assets', 'layer_names', 'layer_ids'])
    )
    expect(properties('set_image_fill')).toContain('url')
    expect(properties('diff_changes')).toContain('mark')
    expect(properties('set_text_properties')).toContain('hyperlink')
    expect(properties('set_font_range')).toContain('hyperlink')
    expect(properties('get_style')).toEqual(expect.arrayContaining(['id', 'query', 'appearance']))
    expect(properties('rescale')).toEqual(expect.arrayContaining(['ids', 'factor', 'anchor']))
  })

  test('the built-in browser tools are app commands, and there is no raw CDP tool', () => {
    expect(descriptors.get('browser_load_page')).toMatchObject({
      effect: 'read',
      availability: 'default',
      capabilities: ['network:access']
    })
    expect(descriptors.get('browser_screenshot')).toMatchObject({
      effect: 'read',
      availability: 'default',
      capabilities: []
    })
    expect(descriptors.get('browser_element')).toMatchObject({
      effect: 'write',
      availability: 'default',
      capabilities: ['document:write']
    })
    expect(descriptors.get('browser_screenshot_to_canvas')).toMatchObject({
      effect: 'write',
      availability: 'default',
      capabilities: ['document:write']
    })
    expect(descriptors.has('browser_cdp')).toBe(false)
    expect(definitions.has('browser_load_page')).toBe(false)
  })
})
