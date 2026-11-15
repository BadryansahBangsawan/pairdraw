---
title: Componentes
description: Referencia de los componentes sin estilos de Vue de @pairdraw/vue.
---

# Componentes

`@pairdraw/vue` expone primitivas estructurales sin estilos para conectar el lienzo, crear interfaces de navegación, paneles de propiedades y controles de entrada especializados.

## Primitivas principales del editor

<SdkCardGroup>
  <SdkCard title="CanvasRoot" to="/es/programmable/sdk/api/components/canvas-root" description="Estructura y contexto del lienzo sin estilos." />
  <SdkCard title="CanvasSurface" to="/es/programmable/sdk/api/components/canvas-surface" description="Primitiva del elemento canvas vinculada al contexto de CanvasRoot." />
  <SdkCard title="LayerTreeRoot" to="/es/programmable/sdk/api/components/layer-tree-root" description="Primitiva sin estilos del árbol de capas." />
  <SdkCard title="LayerTreeItem" to="/es/programmable/sdk/api/components/layer-tree-item" description="Primitiva de una fila del árbol de capas." />
  <SdkCard title="ToolbarRoot" to="/es/programmable/sdk/api/components/toolbar-root" description="Primitiva sin estilos de la barra de herramientas." />
  <SdkCard title="ToolbarItem" to="/es/programmable/sdk/api/components/toolbar-item" description="Primitiva de una herramienta de la barra." />
  <SdkCard title="PageListRoot" to="/es/programmable/sdk/api/components/page-list-root" description="Primitiva sin estilos de la lista de páginas." />
</SdkCardGroup>

## Primitivas de paneles de propiedades

<SdkCardGroup>
  <SdkCard title="PropertySection" to="/programmable/sdk/api/components/property-section" description="Anatomía de una sección de propiedades plegable y estados vacíos." />
  <SdkCard title="PropertyGrid" to="/programmable/sdk/api/components/property-grid" description="Anatomía adaptable de cuadrícula de campos y columna de acciones." />
  <SdkCard title="SegmentedControl" to="/programmable/sdk/api/components/segmented-control" description="Grupos de segmentos accesibles para seleccionar o solo para acciones." />
  <SdkCard title="PropertyListRoot" to="/es/programmable/sdk/api/components/property-list-root" description="Primitiva sin estilos de una lista de propiedades." />
  <SdkCard title="PropertyListItem" to="/es/programmable/sdk/api/components/property-list-item" description="Primitiva de una fila de relleno, contorno o efecto." />
  <SdkCard title="PositionControlsRoot" to="/es/programmable/sdk/api/components/position-controls-root" description="Controles de posición, tamaño y transformación." />
  <SdkCard title="LayoutControlsRoot" to="/es/programmable/sdk/api/components/layout-controls-root" description="Controles de disposición automática y tamaño." />
  <SdkCard title="ConstraintsControlRoot" to="/programmable/sdk/api/components/constraints-control-root" description="Estado y acciones de las restricciones de redimensionado de los hijos de un marco." />
  <SdkCard title="AppearanceControlsRoot" to="/es/programmable/sdk/api/components/appearance-controls-root" description="Controles de opacidad, visibilidad y radio de esquina." />
  <SdkCard title="TypographyControlsRoot" to="/es/programmable/sdk/api/components/typography-controls-root" description="Controles de fuente, alineación y formato." />
</SdkCardGroup>

## Selectores y entradas

<SdkCardGroup>
  <SdkCard title="ColorPickerRoot" to="/es/programmable/sdk/api/components/color-picker-root" description="Primitiva de selector de color basada en un popover." />
  <SdkCard title="ColorInputRoot" to="/es/programmable/sdk/api/components/color-input-root" description="Ayudante sin estilos para entradas de color." />
  <SdkCard title="ChannelSlider" to="/programmable/sdk/api/components/channel-slider" description="Control deslizante escalar accesible para los canales OkHCL." />
  <SdkCard title="FillRoot" to="/programmable/sdk/api/components/fill-root" description="Estado de la categoría de relleno y acciones de conversión." />
  <SdkCard title="FillSwatch" to="/programmable/sdk/api/components/fill-swatch" description="Vista previa semántica del relleno que tiene en cuenta los vínculos." />
  <SdkCard title="FontPickerRoot" to="/es/programmable/sdk/api/components/font-picker-root" description="Primitiva de selector de fuentes con búsqueda." />
  <SdkCard title="GradientEditorRoot" to="/es/programmable/sdk/api/components/gradient-editor-root" description="Primitiva raíz para editar degradados." />
  <SdkCard title="GradientEditorBar" to="/es/programmable/sdk/api/components/gradient-editor-bar" description="Primitiva de la barra de degradado arrastrable." />
  <SdkCard title="GradientEditorStop" to="/es/programmable/sdk/api/components/gradient-editor-stop" description="Primitiva de un punto del degradado." />
  <SdkCard title="NumberField" to="/programmable/sdk/api/components/number-field" description="Anatomía de un campo numérico con ajuste por arrastre, expresiones y pasos con el teclado." />
  <SdkCard title="BindableValue" to="/programmable/sdk/api/components/bindable-value" description="Composición de vínculos con variables y tokens controlada por un proveedor." />
</SdkCardGroup>
