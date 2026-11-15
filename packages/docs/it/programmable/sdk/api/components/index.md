---
title: Componenti
description: Riferimento dei componenti Vue senza stile di @pairdraw/vue.
---

# Componenti

`@pairdraw/vue` fornisce componenti strutturali senza stile per collegare l'area di lavoro, l'interfaccia di navigazione, i pannelli delle proprietà e campi di input specializzati.

## Componenti principali dell'editor

<SdkCardGroup>
  <SdkCard title="CanvasRoot" to="/it/programmable/sdk/api/components/canvas-root" description="Struttura e contesto dell'area di lavoro senza stile." />
  <SdkCard title="CanvasSurface" to="/it/programmable/sdk/api/components/canvas-surface" description="Elemento canvas collegato al contesto di CanvasRoot." />
  <SdkCard title="LayerTreeRoot" to="/it/programmable/sdk/api/components/layer-tree-root" description="Albero dei livelli senza stile." />
  <SdkCard title="LayerTreeItem" to="/it/programmable/sdk/api/components/layer-tree-item" description="Singola riga dell'albero dei livelli." />
  <SdkCard title="ToolbarRoot" to="/it/programmable/sdk/api/components/toolbar-root" description="Barra degli strumenti senza stile." />
  <SdkCard title="ToolbarItem" to="/it/programmable/sdk/api/components/toolbar-item" description="Singolo strumento della barra." />
  <SdkCard title="PageListRoot" to="/it/programmable/sdk/api/components/page-list-root" description="Elenco delle pagine senza stile." />
</SdkCardGroup>

## Componenti per i pannelli delle proprietà

<SdkCardGroup>
  <SdkCard title="PropertySection" to="/programmable/sdk/api/components/property-section" description="Struttura di una sezione di proprietà comprimibile e stati vuoti." />
  <SdkCard title="PropertyGrid" to="/programmable/sdk/api/components/property-grid" description="Griglia di campi adattiva e colonna delle azioni." />
  <SdkCard title="SegmentedControl" to="/programmable/sdk/api/components/segmented-control" description="Gruppi di segmenti accessibili, di selezione o di sole azioni." />
  <SdkCard title="PropertyListRoot" to="/it/programmable/sdk/api/components/property-list-root" description="Elenco di proprietà senza stile." />
  <SdkCard title="PropertyListItem" to="/it/programmable/sdk/api/components/property-list-item" description="Singola riga di riempimenti, contorni o effetti." />
  <SdkCard title="PositionControlsRoot" to="/it/programmable/sdk/api/components/position-controls-root" description="Controlli di posizione, dimensione e trasformazione." />
  <SdkCard title="LayoutControlsRoot" to="/it/programmable/sdk/api/components/layout-controls-root" description="Controlli di layout automatico e dimensionamento." />
  <SdkCard title="ConstraintsControlRoot" to="/programmable/sdk/api/components/constraints-control-root" description="Stato e azioni dei vincoli di ridimensionamento dei figli di un frame." />
  <SdkCard title="AppearanceControlsRoot" to="/it/programmable/sdk/api/components/appearance-controls-root" description="Controlli di opacità, visibilità e raggio degli angoli." />
  <SdkCard title="TypographyControlsRoot" to="/it/programmable/sdk/api/components/typography-controls-root" description="Controlli di font, allineamento e formattazione." />
</SdkCardGroup>

## Selettori e campi di input

<SdkCardGroup>
  <SdkCard title="ColorPickerRoot" to="/it/programmable/sdk/api/components/color-picker-root" description="Selettore colore in un popover." />
  <SdkCard title="ColorInputRoot" to="/it/programmable/sdk/api/components/color-input-root" description="Supporto senza stile per un campo colore." />
  <SdkCard title="ChannelSlider" to="/programmable/sdk/api/components/channel-slider" description="Cursore scalare accessibile per i canali OkHCL." />
  <SdkCard title="FillRoot" to="/programmable/sdk/api/components/fill-root" description="Stato della categoria di riempimento e azioni di conversione." />
  <SdkCard title="FillSwatch" to="/programmable/sdk/api/components/fill-swatch" description="Anteprima semantica del riempimento che tiene conto dei collegamenti." />
  <SdkCard title="FontPickerRoot" to="/it/programmable/sdk/api/components/font-picker-root" description="Selettore di font con ricerca." />
  <SdkCard title="GradientEditorRoot" to="/it/programmable/sdk/api/components/gradient-editor-root" description="Componente radice per modificare le sfumature." />
  <SdkCard title="GradientEditorBar" to="/it/programmable/sdk/api/components/gradient-editor-bar" description="Barra della sfumatura trascinabile." />
  <SdkCard title="GradientEditorStop" to="/it/programmable/sdk/api/components/gradient-editor-stop" description="Singolo punto della sfumatura." />
  <SdkCard title="NumberField" to="/programmable/sdk/api/components/number-field" description="Campo numerico con trascinamento del valore, espressioni e incrementi da tastiera." />
  <SdkCard title="BindableValue" to="/programmable/sdk/api/components/bindable-value" description="Composizione dei collegamenti a variabili e token gestita da un provider." />
</SdkCardGroup>
