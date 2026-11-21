---
title: Skripte
description: JavaScript mit einer Figma-kompatiblen Plugin API ausführen, um Designs abzufragen, in großer Zahl zu ändern und zu erzeugen.
---

# Skripte

`pairdraw eval` führt JavaScript für ein Pairdraw-Dokument aus und stellt das globale Objekt `figma` mit einer Figma-kompatiblen API bereit. Der Befehl eignet sich für Massenänderungen ohne Oberfläche, Prüfungen, das Vorbereiten von Testdaten und Automatisierung, ohne die Editoroberfläche zu öffnen.

## Grundlagen

```sh
pairdraw eval design.fig -c "return figma.currentPage.children.length"
```

Die Option `-c` nimmt JavaScript entgegen. Der letzte Ausdruck ist das Ergebnis, `return` ist also optional; `await` funktioniert auf oberster Ebene. Ein Skript, dessen letzte Anweisung kein Ausdruck ist, etwa eine Deklaration, hat kein Ergebnis und gibt nichts aus.

```sh
pairdraw eval design.fig -c "
  const frame = figma.createFrame()
  frame.name = 'Card'
  frame.resize(300, 200)
  frame.layoutMode = 'VERTICAL'
  frame.itemSpacing = 12
  return { id: frame.id, name: frame.name }
"
```

## Variablenformeln

Mit `pairdraw.setVariableFormula(collectionName, variableName, source, modeName?)` ersetzen Sie die Definition einer Variablen durch eine Formel. Die Formel wird geprüft, bevor sich das Dokument ändert, und der Aufruf gibt den aufgelösten Wert zurück. Ohne Modusnamen wird der Standardmodus der Sammlung bearbeitet.

```js
pairdraw.setVariableFormula('Spacing', 'large', '{base} * 2')
pairdraw.setVariableFormula('State', 'visible', '{viewport} > 1024 and not {loading}')
pairdraw.setVariableFormula('Copy', 'greeting', 'if({compact}, "Hi", "Hello, " + {name})')
```

Verweise nutzen Variablennamen oder `{Collection::variable}` und werden als stabile IDs gespeichert. Formeln rechnen in den gespeicherten Einheiten, Längen also in Pixeln. Operatoren und Einschränkungen beim Export beschreibt [Variablen](/de/user-guide/variables).

## Variablenbindungen

Figmas `node.setBoundVariable(field, variable)` bindet mit Figmas Feldnamen und Typregeln. Mit `pairdraw.bindVariable(node, field, variable)` binden Sie ein Feld einer Ebene so an eine Variable aus `figma.variables`, wie es das Ebenen-Panel tut, und mit `pairdraw.unbindVariable(node, field)` lösen Sie die Bindung; das Feld behält den Wert, den ihm die Variable zuletzt gegeben hat. Die Felder tragen Pairdraws Namen, etwa `text`, `visible`, `opacity`, `paddingLeft` oder `fills/0/color`. Bindungen folgen dem Ebenen-Panel, das mehr annimmt als Figmas `setBoundVariable`: Textinhalt nimmt eine Text- oder Zahlenvariable an, wobei eine Zahl als Text erscheint, und die Sichtbarkeit eine boolesche Variable oder eine Textvariable, die die Ebene zeigt, solange sie nicht leer ist und nicht `false`, `no` oder `off` lautet.

```js
const [price] = figma.variables.getLocalVariables('FLOAT')
const label = figma.currentPage.findOne((node) => node.name === 'Price')
pairdraw.bindVariable(label, 'text', price)
```

## Objekte abfragen

```sh
pairdraw eval design.fig -c "
  return figma.currentPage
    .findAll((node) => node.type === 'FRAME' && node.name.includes('Button'))
    .map((button) => ({
      id: button.id,
      name: button.name,
      width: button.width,
      height: button.height
    }))
"
```

## Ändern und speichern

Mit `--write` / `-w` werden die Änderungen in die Eingabedatei zurückgeschrieben:

```sh
pairdraw eval design.fig -c "
  figma.currentPage.children.forEach((node) => {
    node.opacity = 0.5
  })
" --write
```

Mit `--output` / `-o` schreiben Sie in eine neue Datei:

```sh
pairdraw eval design.fig -c "figma.currentPage.name = 'Updated'" -o updated.fig
```

Mit `--preview-output` wird nach dem Skript ein PNG der Seite geschrieben, die das Skript als aktuelle Seite hinterlässt:

```sh
pairdraw eval design.fig --stdin --write --preview-output preview.png < transform.js
```

## Skripte aus der Standardeingabe lesen

```sh
cat transform.js | pairdraw eval design.fig --stdin --write
```

## Geöffnetes Dokument

Ohne Dateipfad läuft das Skript gegen das aktuell geöffnete Dokument der Desktop-App:

```sh
pairdraw eval -c "return figma.currentPage.name"
```

Die Desktop-App muss dafür laufen und ein Dokument geöffnet haben.

## Ausgabe

Nicht interaktive Ausgabe (kein TTY) verwendet standardmäßig JSON. `--json` erzwingt JSON-Ausgabe:

```sh
pairdraw eval design.fig -c "return figma.currentPage.children.map((n) => n.name)" --json
```

`--quiet` / `-q` unterdrückt die Ausgabe, wenn nur eine Datei geschrieben werden soll.

## Die `pairdraw`-API

Neben `figma` erhalten Skripte `pairdraw`: das, was Pairdraw der Figma Plugin API hinzufügt, im selben Stil. Dasselbe globale Objekt steht dem Werkzeug `eval` und der Automatisierung der laufenden App zur Verfügung.

Eine Hauptkomponente oder ein Komponentensatz kann sich [wie ein Reka-UI-Control verhalten](/de/user-guide/components#behaviours-and-preview). Gebunden wird über die eigenen Eigenschafts- und Slot-Namen der Komponente:

```sh
pairdraw eval design.fig -w -c '
  const set = figma.currentPage.findOne((n) => n.type === "COMPONENT_SET" && n.name === "Switch")
  const behaviour = pairdraw.setBehaviour(set, "switch")
    .bindValue("value", "State")                          // On and Off guessed from the variants
    .bindPart("thumb", set.findOne((n) => n.name === "Thumb")) // the frame becomes a slot
  behaviour.states = "Interaction"
  behaviour.missing
'
```

- `pairdraw.setBehaviour(node, kindOrSpec)` ersetzt das Verhalten einer Komponente: nur eine Art oder eine Spezifikation wie `{ kind: "slider", parts: { track: "Track", thumb: "Thumb" }, numbers: { value: { min: 0, max: 10 } } }`. Der Aufruf gibt das Verhalten zurück.
- `pairdraw.getBehaviour(node)` liest es, oder `null`; eine Variante liest das ihres Satzes.
- Ein Verhalten hat `kind`, `spec` (nach Namen), `missing` (erforderliche Werte und Teile, die noch nicht gebunden sind) und `states` sowie `bindValue(valueId, property, { on, off })`, `bindPart(partId, slotNameOrFrame)`, `setNumber(valueId, { min, max, step, default })` und `remove()`.
- `pairdraw.behaviourKinds` listet jede Art mit den Werten und Teilen, die sie bindet.
- `pairdraw.createSlot(frame)` macht einen Rahmen einer Hauptkomponente zu einem Slot und gibt dessen Namen zurück.

Namen, die die Komponente nicht hat, schlagen mit einem Fehler fehl, der die vorhandenen auflistet.

Kommentare, die Personen mit dem Werkzeug „Kommentar“ hinterlassen, gehören zum Dokument. Skripte und Agenten können also das Feedback zu einer Datei lesen, darauf reagieren und antworten:

```sh
pairdraw eval design.fig -w -c '
  for (const comment of pairdraw.getComments({ resolved: false })) {
    console.log(comment.author, comment.node?.name, comment.text)
    comment.reply("Bumped the title to 24px", { author: "Claude" }).resolve()
  }
'
```

- `pairdraw.getComments(filter)` listet Threads, die ältesten zuerst: alle, oder `{ resolved: false }` für offene, `{ page }` für die einer Seite und `{ author }` für die, die eine Person begonnen oder beantwortet hat.
- `pairdraw.addComment(text, { node, page, x, y, author })` heftet einen Kommentar an eine Ebene, der er folgt, oder an einen Punkt einer Seite; standardmäßig die aktuelle Seite. Ohne `author` lautet er `"Agent"`.
- Ein Kommentar hat `id`, `text` (Markdown), `author`, `createdAt`, `resolved`, `page`, `node` (die oberste Ebene, an die er geheftet ist), `position` und `replies` sowie `reply(text, { author })`, `resolve()`, `reopen()` und `remove()`. `pairdraw.getComment(id)` findet einen Kommentar.

Status zeigen, wo ein Abschnitt, Rahmen, eine Komponente oder Instanz steht, aus der dokumenteigenen Liste wie Draft, In review oder Ready for dev:

```sh
pairdraw eval design.fig -w -c '
  const checkout = figma.currentPage.findOne(n => n.name === "Checkout")
  pairdraw.setStatus(checkout, "Ready for dev")
  pairdraw.statuses.map(status => status.name)
'
```

- `pairdraw.statuses` listet die Status des Dokuments in ihrer Reihenfolge, jeweils mit `name`, `color` (`#RRGGBB`) und `figma`, dem Status, den Figma dafür zeigt (`READY_FOR_DEV`, `COMPLETED` oder `null`).
- `pairdraw.getStatus(node)` liest den Namen des Status, den eine Ebene zeigt, oder `null`, auch während ein umgebender Abschnitt seinen eigenen zeigt.
- `pairdraw.setStatus(node, name)` setzt einen Status nach Namen, `null` entfernt ihn. Nur Abschnitte, Rahmen, Komponenten, Komponentensätze und Instanzen direkt auf einer Seite oder in einem Abschnitt nehmen einen an; alles andere schlägt mit einem Fehler fehl, der den Grund nennt, und ein unbekannter Name listet die vorhandenen Status auf.

Ebenenfunktionen, für die Figmas API kein Mitglied hat:

- `pairdraw.getLayoutDirection(node)` / `setLayoutDirection(node, direction)` und `getTextDirection(node)` / `setTextDirection(node, direction)` lesen und setzen, in welche Richtung eine automatische Anordnung oder ein Text läuft: `AUTO`, `LTR` oder `RTL`.
- `pairdraw.getFillOkHCL(node, index?)` / `setFillOkHCL(node, color, index?)` und das entsprechende `Stroke`-Paar lesen und setzen die Farbe einer Füllung bzw. Kontur in OkHCL, `{ h, c, l, a? }`; ihr RGB-Wert folgt im Farbraum des Dokuments.
- `pairdraw.exposeInstanceSwap(instances, candidates, name?)` stellt den Austausch dieser Instanzen als eine Instanztausch-Eigenschaft bereit, die die Kandidatenkomponenten anbietet, und gibt die Ebene zurück, die sie trägt.
- `pairdraw.getFontStatus()` meldet, ob die Schriften der aktuellen Seite verfügbar sind: die angeforderten Schnitte, woher jeder geladen wurde, Ersetzungen und die betroffenen Ebenen.

## Unterstützte API

Die API ist bewusst nah an der Figma Plugin API, bildet aber auf den SceneGraph und das Dateiformat von Pairdraw ab.

### Dokument und Seiten

- `figma.root`
- `figma.currentPage`
- `figma.currentPage.selection`
- `figma.getNodeById(id)`
- `figma.createPage()`

### Objekte erstellen

- `figma.createFrame()`
- `figma.createRectangle()`
- `figma.createEllipse()`
- `figma.createText()`
- `figma.createLine()`
- `figma.createPolygon()`
- `figma.createStar()`
- `figma.createVector()`
- `figma.createNodeFromSvg(svg)`
- `figma.createComponent()`
- `figma.createSection()`

### Baumoperationen

- `node.children`
- `node.parent`
- `node.appendChild(child)`
- `node.insertChild(index, child)`
- `node.clone()`
- `node.remove()`
- `node.findAll(callback?)`
- `node.findOne(callback)`
- `node.findChild(callback)`
- `node.findChildren(callback?)`
- `figma.group(nodes, parent)`
- `figma.ungroup(node)`

### Komponenten

- `figma.createComponentFromNode(node)`
- `figma.combineAsVariants(components, parent)` – die Eigenschaften ergeben sich aus Namen wie `State=On, Size=Large`
- Auf einem Komponentensatz hängt `addComponentProperty(name, 'VARIANT', value)` den Wert an den Namen jeder Variante an, und `editComponentProperty(name, { name })` benennt die Eigenschaft darin um, was Instanzen übernehmen; das Umbenennen einer Variante aktualisiert die Werte des Satzes, und `variantProperties` liest die Werte einer Variante oder Instanz
- `component.createInstance()`
- `instance.mainComponent`

### Variablen

- `figma.variables.getLocalVariables(type?)`, `getVariableById(id)`, `getLocalVariableCollections()`, `getVariableCollectionById(id)` und ihre `…Async`-Formen
- `figma.variables.createVariableCollection(name)` und `createVariable(name, collection, resolvedType)`, das jeden Modus mit Figmas Standardwert beginnt
- `figma.variables.createVariableAlias(variable)` und `setBoundVariableForPaint(paint, 'color', variable)`
- `variable.setValueForMode(modeId, value)`, `valuesByMode`, `resolveForConsumer(node)`, `name`, `description`, `scopes`, `codeSyntax` und `remove()`
- `collection.addMode(name)`, `renameMode(modeId, name)`, `removeMode(modeId)`, `modes`, `defaultModeId`, `variableIds` und `remove()`
- `node.boundVariables`, `node.setBoundVariable(field, variable)`, `node.setExplicitVariableModeForCollection(collection, modeId)` und `node.clearExplicitVariableModeForCollection(collection)`

### Eigenschaften

Häufige Objekteigenschaften lassen sich über den Proxy lesen und schreiben, darunter:

- Geometrie: `x`, `y`, `width`, `height`, `rotation`, `resize(width, height)`
- Darstellung: `fills`, `strokes`, `effects`, `opacity`, `visible`, `locked`, `blendMode`, `clipsContent`. Füllungen haben hier, in den `backgrounds` einer Seite, in Textbereichen und in Vektorregionen Figmas Form: Eine einfarbige `color` ist RGB mit dem Alphawert in `opacity`, und ein Bild nennt `scaleMode`, `rotation` und `scalingFactor`; eine Füllung, die Figma ablehnt, wirft Figmas Meldung
- Radius: `cornerRadius`, `topLeftRadius`, `topRightRadius`, `bottomRightRadius`, `bottomLeftRadius`
- Text: `characters`, `fontSize`, `fontName` (mit `variationSettings`, jeder Achse einer variablen Schrift), `fontWeight` (das `wght` einer variablen Schrift), `fills`, `letterSpacing`, `lineHeight` und `textDecoration`, die `figma.mixed` lesen, solange sich Zeichen unterscheiden, und beim Setzen jedes Zeichen neu formatieren, sowie die Ausrichtung
- Text-Schriftstatus: `node.hasMissingFont` liest `true`, solange eine Schrift, in der der Text zeichnet, weder geladen ist noch vom Schriftkatalog des Dokuments angeboten wird, sodass ein Skript erkennen kann, ob eine Schrift geladen werden muss oder im Dokument fehlt
- Textbereiche: `getStyledTextSegments(fields, start?, end?)` und `getRange…` / `setRange…` für `FontSize`, `FontName`, `Fills`, `LetterSpacing`, `LineHeight`, `TextDecoration` mit `Style`, `Offset`, `Thickness`, `Color` und `SkipInk`, `TextCase`, `Hyperlink` (ein Link `{ type: 'URL' | 'NODE', value }` oder `null`), `TextStyleId` und `FillStyleId` (gesetzt mit `setRangeTextStyleIdAsync` und `setRangeFillStyleIdAsync`, die dem Bereich die Felder des Stils geben) sowie `getRangeBoundVariable` / `setRangeBoundVariable` für die Textfelder, die Figma bindet, dazu `getRangeFontWeight`, `getRangeAllFontNames` und `getRangeOpenTypeFeatures`. Zeilenhöhe und Zeichenabstand behalten die Einheit, in der sie gesetzt wurden, Pixel oder einen Prozentsatz der Schriftgröße, der der Größe folgt, wie in Figma; andere Längen lesen sich in Pixeln, und ein Prozentwert für ihre Setter bezieht sich auf die Schriftgröße
- Textlisten und Absätze: `getRangeListOptions` / `setRangeListOptions` für Aufzählungen (`UNORDERED`) und nummerierte Einträge (`ORDERED`), `getRangeIndentation` / `setRangeIndentation` für die Verschachtelung (1–5 für Listeneinträge), `listSpacing`, `paragraphSpacing` und `paragraphIndent` für den ganzen Text (`figma.mixed`, wenn sich Absätze unterscheiden) oder pro Absatz mit `getRangeListSpacing` / `setRangeListSpacing`, `getRangeParagraphSpacing` / `setRangeParagraphSpacing` und `getRangeParagraphIndent` / `setRangeParagraphIndent` sowie `hangingList`
- Automatische Anordnung: `layoutMode`, `primaryAxisAlignItems`, `counterAxisAlignItems`, `itemSpacing`, Innenabstände, Größenmodi und Felder zur Positionierung im Layout
- Kontur: `strokeWeight`, `strokeAlign`, `dashPattern`
- Status: `devStatus` auf Abschnitten, Rahmen, Komponenten, Komponentensätzen und Instanzen direkt auf einer Seite oder in einem Abschnitt, als `{ type: 'READY_FOR_DEV' | 'COMPLETED' }` oder `null` (eine Beschreibung wird nicht gespeichert); er liest `null`, solange die Ebene an einer Stelle liegt, an der sie keinen zeigen kann

### Hilfsfunktionen

- `figma.mixed`
- `figma.util.rgb(color)`, `figma.util.rgba(color, alphaOverride?)` und `figma.util.solidPaint(color, overrides?)` lesen einen Hex- oder CSS-Farbwert (`rgb()`, `hsl()`, `lab()`, `oklab()`, `oklch()`, `color(display-p3 …)` oder einen Namen), auf sRGB beschnitten, oder ein Objekt `{ r, g, b, a? }` mit Kanälen von 0 bis 1; `solidPaint` übernimmt Farbe und Deckkraft aus `color` und seine übrigen Eigenschaften aus `overrides`, etwa einer vorhandenen Füllung
- `figma.createImage(data)` nimmt ein PNG, JPEG oder GIF bis 4096 Pixel pro Seite und liefert Figmas `Image`: sein `hash`, `getBytesAsync()` und `getSizeAsync()`; `figma.getImageByHash(hash)` gibt ein gespeichertes Bild zurück
- `figma.createImageAsync(url)` lädt eine `http(s)://`-URL oder einen Data-URI. Die Desktop-App lädt über ihren nativen Proxy, so wie Figma über seine Server lädt; im Browser muss der Host des Bildes Cross-Origin-Anfragen erlauben
- `figma.loadFontAsync(fontName)` lädt die Schrift, sodass Text mit ihr gemessen und gezeichnet wird; eine Familie ohne Schnitt lädt alle ihre Schnitte, eine variable Familie auch ihre benannten Schnitte. Eine Schrift, die nicht geladen werden kann, wird mit Figmas `The font "Family Style" could not be loaded` abgewiesen
- Wie in Figma wirft eine Änderung, die Text neu umbricht, `Cannot write to node with unloaded font`, bis jede Schrift des Textes geladen ist: `characters`, `insertCharacters`, `deleteCharacters`, `fontSize`, Abstände, Groß-/Kleinschreibung, Dekoration, Ausrichtung, `textAutoResize`, Kürzung und die entsprechenden `setRange…`-Methoden. Ein neuer `fontName` muss ebenfalls geladen sein, ersetzt aber die bisherige Schrift des Textes, sodass Text in einer fehlenden Schrift eine geladene erhalten kann. Füllungen, Links, Größe und Transformationen brauchen keine Schrift
- `figma.getFontFamilyVariationAxes(family)` listet die Achsenkennungen einer variablen Familie, oder `null` für eine statische; anders als in Figma muss die Familie zuerst geladen sein
- Eine Schrift, die mit `variationSettings` und ohne Schnitt über `fontName` oder `setRangeFontName` gesetzt wird, erhält den nächstgelegenen benannten Schnitt, und eine Achse, die der Familie fehlt, wirft Figmas Fehler
- `figma.listAvailableFontsAsync()` liefert die vom Host bereitgestellten Schriften, sofern verfügbar
- `figma.getNodeByIdAsync(id)` und `instance.getMainComponentAsync()` lösen zu denselben Objekten auf wie `figma.getNodeById(id)` und `instance.mainComponent`, für Skripte, die für Figmas Modus mit dynamisch geladenen Seiten geschrieben sind
- `figma.setCurrentPageAsync(page)` wechselt die Seite wie das Setzen von `figma.currentPage`, und `page.loadAsync()` löst sofort auf, weil jede Seite bereits geladen ist, ebenfalls für Skripte für Figmas Modus mit dynamisch geladenen Seiten
- `figma.notify(message)` protokolliert ohne Oberfläche eine Warnung
- `figma.ui` und `figma.showUI(html?, options?)` existieren ohne Oberfläche als Figmas No-Ops: `ui.postMessage`, `ui.resize`, `ui.show`, `ui.hide` und `ui.close` tun nichts, `ui.onmessage` ist zuweisbar, wird aber nie ausgelöst, und `showUI` zeigt nichts. Ein Skript, das an eine UI sendet, läuft ohne Fehler
- `figma.closePlugin(message?)` und `figma.loadAllPagesAsync()` lassen ein als Figma-Plugin geschriebenes Skript laufen: Nichts muss geschlossen oder geladen werden, und `closePlugin` reicht seine Meldung an `figma.notify` weiter. Figma lehnt nach `closePlugin` jeden Aufruf ab, während ein Skript hier weiterläuft; lassen Sie deshalb wie in Figmas Dokumentation ein `return` folgen
- `instance.swapComponent(component)` richtet eine Instanz auf eine andere Komponente aus
- Eine Ebene innerhalb einer Instanz lehnt `x`, `y`, `rotation`, `relativeTransform`, `constraints`, `isMask` und `maskType` mit Figmas Fehler ab, etwa `in set_x: This property cannot be overridden in an instance: relative-transform`; diese folgen immer der Komponente. Slot-Inhalt behält sie, und wird eine davon am Standardinhalt eines Slots gesetzt, übernimmt die Instanz den Slot
- `component.createSlot()` fügt einen Slot-Rahmen und seine `SLOT`-Eigenschaft hinzu; Slot-Rahmen lesen `type: 'SLOT'`, `resetSlot()` stellt den Komponenteninhalt eines Instanz-Slots wieder her, und `limitViolations` listet die Grenzen, die ein Instanz-Slot verletzt. `addComponentProperty` und `editComponentProperty` nehmen eine `description` und für Slots `slotSettings` an
- `figma.viewport`

## Noch nicht Figma-kompatibel

Diese Figma-APIs werden noch nicht als kompatible Hilfsfunktionen angeboten:

- `node.exportAsync()`
- `figma.util.normalizeMarkdown()`, das fehlschlägt, weil Pairdraw keine Rich-Text-Beschreibungen oder Anmerkungen hat, für die normalisiert werden müsste
- Bibliotheksvariablen, erweiterte Sammlungen und Variablenbindungen an Effekten und Layoutrastern
- Figmas Stil-APIs wie `figma.createPaintStyle()` / `figma.createTextStyle()`
- Vollständige Parität bei booleschen Vektoroperationen

Verwenden Sie dafür, wo verfügbar, die Exportbefehle der CLI, Werkzeuge des Kernpakets oder direkte SceneGraph-Hilfsfunktionen.
