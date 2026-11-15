---
title: Analizar documentos con la CLI
description: Auditar colores, tipografía, espaciado y patrones repetidos en archivos .fig.
---

# Analizar documentos con la CLI

Los comandos `analyze` auditan un sistema de diseño completo desde el terminal: encuentran inconsistencias, extraen la paleta real y señalan los componentes que esperan a ser extraídos.

## Colores

```sh
pairdraw analyze colors design.fig
```

Encuentra todos los colores del archivo, cuenta su uso y muestra un histograma visual:

```
#1d1b20  ██████████████████████████████ 17155×
#49454f  ██████████████████████████████ 9814×
#ffffff  ██████████████████████████████ 8620×
#6750a4  ██████████████████████████████ 3967×
```

## Tipografía

```sh
pairdraw analyze typography design.fig
```

Enumera cada combinación de familia, tamaño y peso con su número de usos. Sirve para detectar estilos de texto aislados que convendría unificar.

## Espaciado

```sh
pairdraw analyze spacing design.fig
```

Audita los valores de separación y de margen interno en los marcos con auto layout. Ayuda a identificar inconsistencias en la escala de espaciado, por ejemplo una separación suelta de `13px` entre valores que por lo demás son `8/16/24`.

## Estructuras repetidas

```sh
pairdraw analyze clusters design.fig
```

Encuentra patrones de objetos repetidos que podrían extraerse como componentes:

```
3771× frame "container" (100% match)
     size: 40×40, structure: Frame > [Frame]

2982× instance "Checkboxes" (100% match)
     size: 48×48, structure: Instance > [Frame]
```

## Salida JSON

Todos los comandos de análisis admiten `--json` para obtener una salida legible por máquinas:

```sh
pairdraw analyze colors design.fig --json
```

Pásala a `jq`, úsala en comprobaciones de CI o en scripts que impongan presupuestos de tokens de diseño.

Estos análisis no modifican el archivo. Para transformaciones usa [`eval`](./scripting).
