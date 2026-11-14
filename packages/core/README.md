# @pairdraw/core

Editor engine for [Pairdraw](https://openpencil.dev): the CanvasKit (Skia WASM) renderer, Yoga layout, the framework-agnostic editor with undo and selection, the Figma Plugin API compatibility layer, the AI/MCP tool definitions, clipboard and vector conversion, and format-neutral document I/O.

It depends on `@pairdraw/scene-graph`, `@pairdraw/pen`, `@pairdraw/kiwi`, and `@pairdraw/fig`, and keeps browser DOM out so it runs in the app, the CLI, the MCP server, and headless scripts alike.

The root entry is the editor: `createEditor` and its types. Everything else comes from the subpaths listed in `package.json` `exports`, for example `@pairdraw/core/io`, `@pairdraw/core/geometry`, and `@pairdraw/core/canvaskit`, and each name has exactly one of them.

Scripts get two globals through `compileScript` from `@pairdraw/core/tools`: `figma`, the Figma Plugin API over a document, and `pairdraw` (`PairdrawAPI` from `@pairdraw/core/pairdraw-api`), what Pairdraw adds to it in the same style, such as making a component behave as a Reka UI control:

```ts
import { FigmaAPI } from '@pairdraw/core/figma-api'
import { compileScript } from '@pairdraw/core/tools'

await compileScript(`
  const set = figma.currentPage.findOne((n) => n.name === 'Switch')
  pairdraw.setBehaviour(set, { kind: 'switch', values: { value: 'State' } })
`)(new FigmaAPI(graph))
```

- Programmable overview and SDK docs: https://openpencil.dev/programmable/
- Source and issues: https://github.com/BadryansahBangsawan/pairdraw

MIT License.
