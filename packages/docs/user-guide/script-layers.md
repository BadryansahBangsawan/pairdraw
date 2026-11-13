---
title: Script Layers
description: Draw layers with a small JavaScript program that lives in the document, with inputs you can bind to variables.
---

# Script Layers

A script layer is a layer whose program draws its own children. The program lives in the document, runs in a sandbox, and returns the layers to draw, so a document carries its own code and reads nothing from disk.

## Inserting a Script Layer

Choose **Object → Insert Script…**. The layer is placed in the middle of the view as a 320 by 200 container, and it runs a starter program that draws a bar chart.

Select a script layer and the design panel shows a **Script layer** section: **Convert to layers** and **Run** at its head, the controls its program declares, and the program itself. Editing the code and leaving the box stores the new program and runs it.

## Drawing with `pencil`

A program runs with `pencil` in scope, and its body runs as a function, so it returns the layers it draws. `pencil` has one call per layer kind:

- `pencil.frame(props, children)`
- `pencil.rect(props, children)`
- `pencil.roundedRect(props, children)`
- `pencil.ellipse(props, children)`
- `pencil.text(props, children)`
- `pencil.line(props, children)`
- `pencil.node(type, props, children)` for any of those kinds by name

Each call returns a description of one layer, and the children array nests layers under it. The program must return one layer or an array of layers; returning nothing is an error.

A layer takes:

- **Placement and size**: `name`, `x`, `y`, `width`, `height`.
- **Paint**: `fill` and `stroke` as `#rrggbb` or `#rrggbbaa`, `strokeWeight` (a stroke is drawn only when it is set), `opacity` from 0 to 1, and `radius` for rounded corners.
- **Text**, on `pencil.text`: `text`, `fontSize`, `fontWeight`, and `align` as `LEFT`, `CENTER`, or `RIGHT`.
- **Layout**, on a frame or a shape: `layout` as `HORIZONTAL` or `VERTICAL`, with `gap` and `padding`, which sizes the layer to its children.

```js
/**
 * @schema
 * @input bars number = 5
 * @input accent color = #5b73f2
 */
const heights = [24, 40, 32, 48, 36].slice(0, pencil.inputs.bars)

return pencil.frame({ name: 'Chart', width: 320, height: 200 }, [
  pencil.rect({ width: 320, height: 200, radius: 12, fill: '#ffffff' }),
  ...heights.map((bar, index) =>
    pencil.rect({
      x: 24 + index * 56,
      y: 176 - bar * 3,
      width: 40,
      height: bar * 3,
      radius: 6,
      fill: pencil.inputs.accent
    })
  )
])
```

A script draws frames, rectangles, rounded rectangles, ellipses, text, and lines. It cannot make components, instances, or variables, and it cannot read the document it is in.

A run is repeatable: `Math.random` is replaced by a generator seeded from the layer and its program, so the same program draws the same layers every time. The rest of `Math` is unchanged.

## Inputs

A leading block comment with a `@schema` line declares the controls the panel shows. Each `@input` line adds one, as a name, a kind, and an optional default:

```js
/**
 * @schema
 * @input title string = "Chart"
 * @input bars number = 5
 * @input dark boolean = false
 * @input accent color = #5b73f2
 * @input size enum(small, medium, large) = medium
 * @input target ref
 */
```

The kinds are `number`, `string`, `boolean`, `color`, `enum`, and `ref`. An `enum` lists its choices in the parentheses and starts at its first choice; a `ref` declares a name with no default and takes no variable. A declared input with no value runs as `0`, an empty string, off, or black, by its kind.

Only the leading block comment is read, so an `@input` line inside a string, or below the first statement, declares nothing. The program reads its inputs by name from `pencil.inputs`.

## Binding an Input to a Variable

A `number`, `string`, `boolean`, or `color` input can take its value from a document variable instead of its stored one. Choose the ⇄ button beside it (**Bind input to variable**) and pick a variable of the matching type; the variable's value then wins. **Detach variable** returns the input to its stored value.

A bound variable that has no value, or whose type does not match the input, stops the run, and the panel and the layer say which input it was.

## Running

**Run** runs the stored program again. A script also runs again on its own 300 milliseconds after you resize its layer or change one of its inputs, so the canvas follows the document without another click.

A run replaces everything the layer drew before, so the canvas always shows the latest run. The run itself is not an undo step; storing a program, an input value, or a binding is.

## Errors

A failing program shows its message under the code box, and the canvas replaces the drawn layers with a red **Script error** frame carrying the same message. The editor stays usable: a program that never finishes ends after 2 seconds with `Script timed out.`, and the next run still works. A run with no layer to draw, or with something that is not a layer, says that instead.

## Limits

- A run draws at most 1,000 layers, nested at most 100 deep.
- A run has 2 seconds; the sandbox has 5 seconds to start before the run is abandoned.
- A program is stored up to 256,000 characters; a longer one is cut when it is saved.
- The sandbox is an opaque-origin frame running a worker. `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, and `importScripts` are blocked or absent there, and the app's IndexedDB and Cache Storage are out of reach, so a program reaches neither the network nor the app's storage.
- There is no DOM in the sandbox, so a script cannot load images, fonts, or stylesheets.

## Converting to Layers

**Convert to layers** replaces the script layer with the layers it drew, in the same place and in one undo step; undo brings the live script back exactly as it was. The drawn layers become ordinary layers you can select and edit. A script that drew nothing leaves nothing behind.

## Saving

The program, its input values, and its bindings are saved in the document. In a `.fig` file the layer is written as a frame that records that it is a script, so Figma reads the drawn layers as a plain frame and Pairdraw reads the frame back as a script layer.

Opening a document does not run its scripts. A saved script layer shows the layers saved with it and runs when you choose **Run**, change its program, resize it, or change an input.

## The Agent's `script` Tool

Agents that use the app's tools have a `script` tool with three actions: `create` places a code layer and runs it, `set_source` replaces a program and runs it, and `run` runs an existing one again. The tool reports the same limits: 1,000 layers per run and 2 seconds, no components, and a `Math.random` seeded from the layer. It needs the app's sandbox, so a headless host answers that script layers are unavailable there.
