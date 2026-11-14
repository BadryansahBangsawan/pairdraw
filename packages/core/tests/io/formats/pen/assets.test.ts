import { describe, expect, test } from "bun:test";

import { getNodeOrThrow } from "#core-tests/helpers/assert";
import { fromUint8Array, toUint8Array } from "js-base64";

import type { IconData, IconProvider } from "@pairdraw/core/icons";
import { IORegistry, penFormat } from "@pairdraw/core/io";
import { readIcon, type IconOptions } from "@pairdraw/scene-graph/icons";
import { parseSVGPath } from "@pairdraw/scene-graph/parse-path";
import {
  isShaderSourcePaint,
  readShaderPaints,
} from "@pairdraw/scene-graph/shaders";

// A 2 × 1 PNG.
const PNG = toUint8Array(
  "iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAIAAAB7QOjdAAAADElEQVR4nGP8zwACAAYIAQFazwZIAAAAAElFTkSuQmCC",
);

interface IconRequest {
  names: string[];
  options?: IconOptions;
}

function iconProvider(
  available: string[],
  requested: IconRequest[],
): IconProvider {
  const glyph = (
    name: string,
    size: number,
    options?: IconOptions,
  ): IconData => {
    const [prefix = "", iconName = ""] = name.split(":");
    return {
      prefix,
      name: iconName,
      width: size,
      height: size,
      paths: [
        {
          vectorNetwork: parseSVGPath(`M0 0H${size}V${size}Z`),
          fill: "currentColor",
          stroke: null,
          strokeWidth: 0,
          strokeCap: "butt",
          strokeJoin: "miter",
        },
      ],
      ...(options ? { options } : {}),
    };
  };
  return {
    async icons(names, size, options) {
      requested.push(
        options ? { names: [...names], options } : { names: [...names] },
      );
      return new Map(
        names
          .filter((name) => available.includes(name))
          .map((name) => [name, glyph(name, size, options)]),
      );
    },
    search: () => Promise.resolve({ icons: [], total: 0, collections: {} }),
    previews: () => Promise.resolve(new Map()),
    collections: () => Promise.resolve([]),
    browse: () => Promise.resolve([]),
  };
}

const io = new IORegistry([penFormat]);

function penBytes(children: unknown[]) {
  return new TextEncoder().encode(
    JSON.stringify({ version: "2.21", children }),
  );
}

describe("penFormat.readDocument — assets", () => {
  test("draws every library from its set, Material Symbols at their weight", async () => {
    const requested: IconRequest[] = [];
    const icons = iconProvider(
      ["lucide:house", "material-symbols-outlined:home"],
      requested,
    );
    const { graph } = await io.readDocument(
      {
        name: "icons.pen",
        data: penBytes([
          {
            id: "house",
            type: "icon",
            library: "lucide",
            icon: "house",
            width: 48,
            height: 48,
          },
          {
            id: "symbol",
            type: "icon",
            library: "Material Symbols Outlined",
            icon: "home",
            weight: 650,
            width: 48,
            height: 48,
          },
        ]),
      },
      { icons },
    );
    expect(requested).toEqual(
      expect.arrayContaining([
        { names: ["lucide:house"] },
        { names: ["material-symbols-outlined:home"], options: { wght: 650 } },
      ]),
    );
    expect(readIcon(getNodeOrThrow(graph, "house"))).toMatchObject({
      name: "lucide:house",
    });
    expect(readIcon(getNodeOrThrow(graph, "symbol"))).toMatchObject({
      name: "material-symbols-outlined:home",
      options: { wght: 650 },
    });
    expect(graph.getChildren("symbol").map((glyph) => glyph.type)).toEqual([
      "VECTOR",
    ]);
  });

  test("reads image files through the host and leaves unreadable ones unpainted", async () => {
    const asked: string[] = [];
    const { graph } = await io.readDocument(
      {
        name: "images.pen",
        data: penBytes([
          {
            id: "photo",
            type: "rectangle",
            width: 20,
            height: 10,
            fill: { type: "image", url: "./photo.png" },
          },
          {
            id: "gone",
            type: "rectangle",
            width: 20,
            height: 10,
            fill: { type: "image", url: "./gone.png" },
          },
        ]),
        readAsset: async (path) => {
          asked.push(path);
          return path === "./photo.png" ? PNG : null;
        },
      },
      { icons: iconProvider([], []) },
    );
    expect([...asked].sort()).toEqual(["./gone.png", "./photo.png"]);
    expect(graph.getNode("photo")?.fills[0]?.type).toBe("IMAGE");
    expect(graph.getNode("gone")?.fills).toEqual([]);
  });

  test("decodes data URLs as URLs, without the host", async () => {
    const encoded = fromUint8Array(PNG);
    const { graph } = await io.readDocument(
      {
        name: "inline.pen",
        data: penBytes([
          {
            id: "plain",
            type: "rectangle",
            fill: { type: "image", url: `data:image/png;base64,${encoded}` },
          },
          {
            id: "named",
            type: "rectangle",
            fill: {
              type: "image",
              url: `DATA:image/png;name=a.png;base64,${encoded}`,
            },
          },
          {
            id: "broken",
            type: "rectangle",
            fill: { type: "image", url: "data:image/png;base64,!!!" },
          },
        ]),
      },
      { icons: iconProvider([], []) },
    );
    expect(graph.getNode("plain")?.fills[0]?.type).toBe("IMAGE");
    expect(graph.getNode("named")?.fills[0]?.type).toBe("IMAGE");
    expect(graph.getNode("broken")?.fills).toEqual([]);
  });
});

describe("penFormat.readDocument — shader files", () => {
  const SOURCE =
    "@param color fill #FF0000\nhalf4 main(float2 uv) { return half4(1.0); }\n";

  test("reads a shader paint from the file beside the document", async () => {
    const asked: string[] = [];
    const { graph } = await io.readDocument(
      {
        name: "shader.pen",
        data: penBytes([
          {
            id: "shaded",
            type: "rectangle",
            width: 40,
            height: 20,
            fill: { type: "shader", url: "./fx.sksl" },
          },
        ]),
        readAsset: async (path) => {
          asked.push(path);
          return path === "./fx.sksl" ? new TextEncoder().encode(SOURCE) : null;
        },
      },
      { icons: iconProvider([], []) },
    );
    expect(asked).toEqual(["./fx.sksl"]);
    const node = getNodeOrThrow(graph, "shaded");
    expect(node.fills[0]?.type).toBe("IMAGE");
    const [shader] = readShaderPaints(node);
    expect(isShaderSourcePaint(shader) ? shader.source : null).toBe(SOURCE);
  });

  test("leaves a shader paint unpainted when its file is missing", async () => {
    const { graph } = await io.readDocument(
      {
        name: "shader.pen",
        data: penBytes([
          {
            id: "shaded",
            type: "rectangle",
            fill: { type: "shader", url: "./gone.sksl" },
          },
        ]),
        readAsset: async () => null,
      },
      { icons: iconProvider([], []) },
    );
    expect(graph.getNode("shaded")?.fills).toEqual([]);
  });
});
