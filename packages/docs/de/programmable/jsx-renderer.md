---
title: JSX-Renderer
description: Bearbeitbare Designs mit derselben deklarativen Authoring-Bibliothek erstellen, die auch Pairdraw-Agenten verwenden.
---

# JSX-Renderer

Das Design-JSX von Pairdraw erzeugt Szenenobjekte, kein Browser-DOM. Mit lesbaren Komponentenbäumen, JavaScript-Ausdrücken und wiederverwendbaren Funktionen lassen sich bearbeitbare Designs aufbauen. Die deklarative Syntax eignet sich für AI-Agenten, Skripte und die wiederholbare Erzeugung von Oberflächen.

JSX dient außerdem als lesbare Darstellung eines vorhandenen Designs. Änderungen erscheinen als gewöhnlicher Codevergleich und lassen sich prüfen und versionieren.

## Design erstellen

Das Werkzeug `render` akzeptiert JSX-Zeichenketten im AI-Chat und über MCP:

```jsx
<Frame name="Card" w={320} h="hug" flex="col" gap={16} p={24} bg="#FFF" rounded={16}>
  <Text size={18} weight="bold">Card Title</Text>
  <Text size={14} color="#666">Description text</Text>
</Frame>
```

In Anwendungs- oder Headless-Bibliothekscode importieren Sie `Frame`, `Text` und weitere Authoring-Exporte aus `@pairdraw/design-jsx` und erzeugen die Objekte mit `renderTree` oder `renderJSX` aus `@pairdraw/core/design-jsx`, die Icons, SVG-Umwandlung und Layout ergänzen. Um die Bäume als TSX zu schreiben, setzen Sie in der `tsconfig.json` `"jsxImportSource": "@pairdraw/design-jsx"` zusammen mit `"jsx": "react-jsx"` oder fügen der Datei den Kommentar `/** @jsxImportSource @pairdraw/design-jsx */` hinzu. Welche APIs `eval` bereitstehen, bestimmt die Skriptumgebung; Paket-Exporte sind dort nicht automatisch global verfügbar.

Die [gemeinsame Design-Authoring-Referenz](/reference/design-authoring) enthält ausführbare Beispiele, Hinweise zum Layout und die vollständige Übersicht der unterstützten Syntax. Sie wird aus derselben Quelle erzeugt, die Chat, ACP, Codegen-Prompts und der installierbare Agent-Skill verwenden.

## Elemente

JSX-Elemente wie `<Frame>`, `<Rectangle>`, `<Ellipse>`, `<Text>`, `<Line>`, `<Vector>`, `<Group>` und `<Section>` erzeugen die entsprechenden Pairdraw-Objekte.

Verwenden Sie Rahmen und Text für den Aufbau, Formobjekte für Grafiken und echte Komponenten und Instanzen für wiederverwendbare Inhalte im Editor. Eine JavaScript-Funktion allein erzeugt keine Komponentenidentität. Siehe die [Übersicht der Elemente](/reference/design-authoring#supported-syntax-inventory).

## Eigenschaften

Die Eigenschaftsnamen bleiben Teil der JSX-API:

- `flex`, `gap`, `wrap`, `justify`, `items` und `p*` steuern Anordnung und Abstände;
- `w`, `h`, `x`, `y` und die Min-/Max-Werte steuern Größe und Position;
- `bg`, `stroke`, `rounded`, `opacity`, `shadow`, `blur` und `blendMode` steuern die Darstellung;
- `fontFamily`, `fontSize`, `fontWeight`, `color` und `textAlign` steuern die Typografie.

Für inhaltsabhängige Größen verwenden Sie Hug/Fill und Flex- oder Grid-Layout. Binden Sie semantische Variablen, statt Werte zu kopieren. Siehe [Aufbau und Layout](/reference/design-authoring#composition-and-layout), [Farbe und Text](/reference/design-authoring#paint-text-and-artwork) sowie [Variablen und Komponenten](/reference/design-authoring#variables-and-components).

## Export nach JSX

```sh
pairdraw export design.fig -f jsx                   # Pairdraw format
pairdraw export design.fig -f jsx --style tailwind  # Tailwind classes
```

Exportiertes Pairdraw-JSX kann bearbeitet und erneut in das Dokument gerendert werden. Der Export schreibt ausgeblendete und gesperrte Ebenen, Constraints, Größenbegrenzungen, gestapelte Füllungen, Verlaufs- und Bildfüllungen, Konturen, Effekte, Masken und Variablenbindungen. Das erneute Rendern eines Exports bildet sie daher nach, und `diff_jsx` zeigt Änderungen an jedem davon. Rich Text mit gemischten Stilen, Vektorpfade, Layoutraster, geteilte Stile und Definitionen von Komponenteneigenschaften werden noch nicht geschrieben. Instanzen werden als Rahmen mit ihrem Inhalt geschrieben, sodass exportiertes JSX für sich allein steht. Siehe [Exporte mit der CLI](./cli/exporting).

## Visueller Vergleich

Mit JSX lassen sich strukturelle Designänderungen wie Code prüfen, in Pull Requests begutachten und in der Versionsverwaltung speichern. Untersuchen Sie Änderungen mit `get_jsx` und `diff_jsx` und prüfen Sie danach das tatsächlich gerenderte Ergebnis; ein sauberer struktureller Diff beweist keine visuelle Gleichheit.
