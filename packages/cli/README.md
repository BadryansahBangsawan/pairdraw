# @pairdraw/cli

Headless command line for [Pairdraw](https://github.com/BadryansahBangsawan/pairdraw) and `.fig` files: inspect documents and layers, query with XPath, export to PNG, JPG, WEBP, SVG, PDF, PPTX, draw.io, JSX, HTML, Storybook stories, or `.fig`, convert between writable formats, import HTML/CSS/Tailwind, lint design files, analyze and extract design tokens, and script documents through `eval` with a Figma Plugin API-compatible `figma` global and a `pairdraw` global for what Pairdraw adds, such as component behaviours and slots.

```sh
npm install -g @pairdraw/cli   # or: bun add -g @pairdraw/cli
pairdraw --help
pairdraw eval design.fig -c "return figma.currentPage.children.length"
pairdraw tokens app.fig --import theme.css --write
pairdraw libraries seed --root ./catalog
```

`tokens --import` reads a local stylesheet's custom properties as document variables, and `libraries seed` publishes the built-in Pairdraw Basics set into a filesystem catalog. Inspection commands support `--json` for automation. The MCP server ships separately as `@pairdraw/mcp`.

- CLI reference: https://github.com/BadryansahBangsawan/pairdraw/blob/main/packages/docs/programmable/cli/inspecting.md
- Scripting with the Plugin API: https://github.com/BadryansahBangsawan/pairdraw/blob/main/packages/docs/programmable/cli/scripting.md
- Source and issues: https://github.com/BadryansahBangsawan/pairdraw

MIT License.
