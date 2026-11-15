---
title: Renderizador JSX
description: Crear diseños editables con la misma biblioteca declarativa de autoría que usan los agentes de Pairdraw.
---

# Renderizador JSX

El JSX de diseño de Pairdraw crea objetos de la escena, no DOM del navegador. Puedes usar árboles de componentes legibles, expresiones de JavaScript y funciones reutilizables para construir diseños editables.

## Crear diseños

La herramienta `render` acepta cadenas JSX en el chat con AI y en MCP. En código de aplicación o de biblioteca sin interfaz, importa `Frame`, `Text` y el resto de exportaciones de autoría desde `@pairdraw/design-jsx` y crea los objetos con `renderTree` o `renderJSX` de `@pairdraw/core/design-jsx`, que añaden iconos, conversión de SVG y disposición. Para escribir los árboles como TSX, define `"jsxImportSource": "@pairdraw/design-jsx"` con `"jsx": "react-jsx"` en `tsconfig.json`, o añade al archivo el comentario `/** @jsxImportSource @pairdraw/design-jsx */`. El entorno de scripting determina qué API se exponen a `eval`; allí las exportaciones de los paquetes no son globales automáticamente.

La [referencia compartida de autoría de diseños](/reference/design-authoring) contiene ejemplos ejecutables, pautas de disposición y el inventario de la sintaxis admitida. Se genera a partir de la misma fuente que usan el chat, ACP, los prompts de generación de código y la habilidad de agente instalable.

## Elementos

Usa marcos y texto para la composición, objetos de forma para las ilustraciones, y componentes e instancias reales para el contenido reutilizable del editor. Una función de JavaScript por sí sola no crea la identidad de un componente. Consulta el [inventario de elementos](/reference/design-authoring#supported-syntax-inventory).

## Propiedades de estilo

Usa Hug/Fill y flex o grid para los tamaños que dependen del contenido. Vincula variables semánticas en lugar de copiar valores. Consulta [composición y disposición](/reference/design-authoring#composition-and-layout), [pintura y texto](/reference/design-authoring#paint-text-and-artwork) y [variables y componentes](/reference/design-authoring#variables-and-components).

Los nombres de las propiedades se mantienen en inglés porque forman parte de la API JSX. Los eventos DOM no se ejecutan: el resultado es un documento de diseño, no una aplicación web.

## Exportar a JSX

```sh
pairdraw export design.fig -f jsx                   # Pairdraw format
pairdraw export design.fig -f jsx --style tailwind  # Tailwind classes
```

El JSX de Pairdraw exportado se puede editar y volver a renderizar en el documento. La exportación escribe las capas ocultas y bloqueadas, las restricciones, los límites de tamaño, los rellenos apilados, de degradado y de imagen, los trazos, los efectos, las máscaras y los vínculos de variables, así que al renderizar una exportación se reproducen y `diff_jsx` muestra los cambios en cualquiera de ellos. Aún no se escriben el texto enriquecido con estilos mixtos, los trazados vectoriales, las cuadrículas de diseño, los estilos compartidos ni las definiciones de propiedades de componentes. Las instancias se escriben como marcos con su contenido, de modo que el JSX exportado se sostiene por sí solo. Consulta [Exportar desde la CLI](./cli/exporting).

## Diferencias visuales

JSX permite revisar como código los cambios estructurales de un diseño. Usa `get_jsx` y `diff_jsx` para examinar los cambios y luego comprueba el resultado renderizado real; una diferencia estructural limpia no demuestra la equivalencia visual.
