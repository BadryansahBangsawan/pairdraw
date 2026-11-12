import { describe, expect, test } from "bun:test";

import { createEditor } from "@open-pencil/core";
import { expectDefined } from "#core-tests/helpers/assert";
import {
  SceneGraph,
  type Fill,
  type SceneNode,
} from "@open-pencil/scene-graph";
import {
  isShaderSourcePaint,
  shaderOfPaint,
  type ShaderSourcePaint,
} from "@open-pencil/scene-graph/shaders";

/** The code the paint draws, failing when its shader is a preset instead. */
function sourceOf(
  node: Pick<SceneNode, "pluginData">,
  paint: Fill,
): ShaderSourcePaint {
  const shader = shaderOfPaint(node, paint);
  if (!shader || !isShaderSourcePaint(shader))
    throw new Error("paint draws no code");
  return shader;
}

const SOURCE = `#version 300 es
precision highp float;
uniform float u_radius;
void main() {
  gl_FragColor = vec4(vec3(u_radius), 1.0);
}`;

function setup() {
  const graph = new SceneGraph();
  const node = graph.createNode("RECTANGLE", graph.getPages()[0].id, {
    width: 40,
    height: 20,
    fills: [
      {
        type: "SOLID",
        color: { r: 1, g: 0, b: 0, a: 1 },
        opacity: 1,
        visible: true,
      },
    ],
  });
  const editor = createEditor({ graph });
  const read = () => {
    const current = editor.graph.getNode(node.id);
    if (!current) throw new Error("missing node");
    return current;
  };
  return { editor, graph, id: node.id, read };
}

describe("shader inputs", () => {
  test("sets an input as one undo step", () => {
    const { editor, id, read } = setup();
    editor.setShaderSource([id], "fills", 0, SOURCE);

    editor.setShaderUniform([id], "fills", 0, "u_radius", 0.25);

    expect(sourceOf(read(), expectDefined(read().fills[0])).uniforms).toEqual({
      u_radius: 0.25,
    });
    editor.undoAction();
    expect(sourceOf(read(), expectDefined(read().fills[0])).uniforms).toEqual(
      {},
    );
  });

  test("binds an input to a variable, and unbinding keeps the stored value", () => {
    const { editor, graph, id, read } = setup();
    editor.setShaderSource([id], "fills", 0, SOURCE);
    editor.setShaderUniform([id], "fills", 0, "u_radius", 0.25);
    const collection = graph.createCollection("Inputs");
    const variable = graph.createVariable(
      "Radius",
      "FLOAT",
      collection.id,
      0.75,
    );

    editor.setShaderUniformBinding([id], "fills", 0, "u_radius", variable.id);
    expect(
      sourceOf(read(), expectDefined(read().fills[0])).uniformBindings,
    ).toEqual({
      u_radius: variable.id,
    });

    editor.setShaderUniformBinding([id], "fills", 0, "u_radius", null);
    const shader = sourceOf(read(), expectDefined(read().fills[0]));
    expect(shader.uniformBindings?.u_radius).toBeUndefined();
    expect(shader.uniforms).toEqual({ u_radius: 0.25 });

    editor.undoAction();
    expect(
      sourceOf(read(), expectDefined(read().fills[0])).uniformBindings,
    ).toEqual({
      u_radius: variable.id,
    });
  });

  test("leaves preset paints alone", () => {
    const { editor, id, read } = setup();
    editor.setShaderPaint([id], "fills", 0, {
      components: [{ type: "Aurora" }],
    });
    const before = read().fills[0];

    editor.setShaderUniform([id], "fills", 0, "u_radius", 0.25);
    editor.setShaderUniformBinding(
      [id],
      "fills",
      0,
      "u_radius",
      "no-such-variable",
    );

    expect(read().fills[0]).toEqual(before);
  });

  test("binds through the variable field, which names the input it resolves", () => {
    const { editor, graph, id, read } = setup();
    editor.setShaderSource([id], "fills", 0, SOURCE);
    const collection = graph.createCollection("Inputs");
    const variable = graph.createVariable(
      "Radius",
      "FLOAT",
      collection.id,
      0.75,
    );

    editor.bindVariable(id, "fills/0/uniforms/u_radius", variable.id);

    const shader = sourceOf(read(), expectDefined(read().fills[0]));
    expect(shader.uniformBindings?.u_radius).toBe(variable.id);
  });
});
