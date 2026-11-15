---
title: Komponenty
description: Komponenty pakietu @pairdraw/vue bez narzuconego wyglądu.
---

# Komponenty

`@pairdraw/vue` udostępnia strukturalne komponenty bez narzuconego wyglądu do podłączania obszaru roboczego, interfejsu nawigacji, paneli właściwości i wyspecjalizowanych pól.

## Podstawowe komponenty edytora

<SdkCardGroup>
  <SdkCard title="CanvasRoot" to="/programmable/sdk/api/components/canvas-root" description="Kontekst i struktura obszaru roboczego." />
  <SdkCard title="CanvasSurface" to="/programmable/sdk/api/components/canvas-surface" description="Element canvas wewnątrz CanvasRoot." />
  <SdkCard title="LayerTreeRoot" to="/programmable/sdk/api/components/layer-tree-root" description="Drzewo warstw zarządzane przez SDK." />
  <SdkCard title="LayerTreeItem" to="/programmable/sdk/api/components/layer-tree-item" description="Jeden element drzewa warstw." />
  <SdkCard title="ToolbarRoot" to="/programmable/sdk/api/components/toolbar-root" description="Stan i działania paska narzędzi." />
  <SdkCard title="ToolbarItem" to="/programmable/sdk/api/components/toolbar-item" description="Jedno narzędzie na pasku." />
  <SdkCard title="PageListRoot" to="/programmable/sdk/api/components/page-list-root" description="Lista stron zarządzana przez SDK." />
</SdkCardGroup>

## Komponenty paneli właściwości

<SdkCardGroup>
  <SdkCard title="PropertySection" to="/programmable/sdk/api/components/property-section" description="Anatomia zwijanej sekcji właściwości i puste stany." />
  <SdkCard title="PropertyGrid" to="/programmable/sdk/api/components/property-grid" description="Anatomia responsywnej siatki pól i paska działań." />
  <SdkCard title="SegmentedControl" to="/programmable/sdk/api/components/segmented-control" description="Dostępne grupy segmentów do wyboru lub samych działań." />
  <SdkCard title="PropertyListRoot" to="/programmable/sdk/api/components/property-list-root" description="Kontrolowana lista właściwości tablicowych." />
  <SdkCard title="PropertyListItem" to="/programmable/sdk/api/components/property-list-item" description="Pojedynczy wiersz wypełnienia, obwiedni albo efektu." />
  <SdkCard title="PositionControlsRoot" to="/programmable/sdk/api/components/position-controls-root" description="Położenie, rozmiar i przekształcenia." />
  <SdkCard title="LayoutControlsRoot" to="/programmable/sdk/api/components/layout-controls-root" description="Automatyczny układ i tryby rozmiaru." />
  <SdkCard title="ConstraintsControlRoot" to="/programmable/sdk/api/components/constraints-control-root" description="Stan i działania ograniczeń zmiany rozmiaru elementów potomnych ramki." />
  <SdkCard title="AppearanceControlsRoot" to="/programmable/sdk/api/components/appearance-controls-root" description="Przezroczystość, widoczność i promień narożników." />
  <SdkCard title="TypographyControlsRoot" to="/programmable/sdk/api/components/typography-controls-root" description="Czcionka, wyrównanie i formatowanie." />
</SdkCardGroup>

## Wybór wartości i pola

<SdkCardGroup>
  <SdkCard title="ColorPickerRoot" to="/programmable/sdk/api/components/color-picker-root" description="Wybór koloru bez narzuconego wyglądu." />
  <SdkCard title="ColorInputRoot" to="/programmable/sdk/api/components/color-input-root" description="Stan i działania pola koloru." />
  <SdkCard title="ChannelSlider" to="/programmable/sdk/api/components/channel-slider" description="Dostępny suwak wartości dla kanałów OkHCL." />
  <SdkCard title="FillRoot" to="/programmable/sdk/api/components/fill-root" description="Stan kategorii wypełnienia i działania konwersji." />
  <SdkCard title="FillSwatch" to="/programmable/sdk/api/components/fill-swatch" description="Semantyczny podgląd wypełnienia uwzględniający powiązania." />
  <SdkCard title="FontPickerRoot" to="/programmable/sdk/api/components/font-picker-root" description="Wybór czcionki z wyszukiwaniem." />
  <SdkCard title="GradientEditorRoot" to="/programmable/sdk/api/components/gradient-editor-root" description="Kontekst edytora gradientu." />
  <SdkCard title="GradientEditorBar" to="/programmable/sdk/api/components/gradient-editor-bar" description="Interaktywny pasek gradientu." />
  <SdkCard title="GradientEditorStop" to="/programmable/sdk/api/components/gradient-editor-stop" description="Jeden punkt gradientu." />
  <SdkCard title="NumberField" to="/programmable/sdk/api/components/number-field" description="Pole liczbowe z przeciąganiem, wyrażeniami i obsługą klawiatury." />
  <SdkCard title="BindableValue" to="/programmable/sdk/api/components/bindable-value" description="Kompozycja powiązań ze zmiennymi i tokenami sterowana przez dostawcę." />
</SdkCardGroup>
