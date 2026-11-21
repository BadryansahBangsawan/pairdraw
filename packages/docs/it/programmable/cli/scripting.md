---
title: Scripting
description: Eseguire JavaScript con un'API compatibile con i plugin Figma per interrogare, modificare in serie e generare design.
---

# Scripting

`pairdraw eval` esegue JavaScript su un documento Pairdraw con un oggetto globale `figma` compatibile con Figma. Usalo per modifiche in serie senza interfaccia, ispezione, preparazione di dati di test e automazione, senza aprire l'interfaccia dell'editor.

## Uso di base

```sh
pairdraw eval design.fig -c "return figma.currentPage.children.length"
```

Il flag `-c` accetta JavaScript. L'ultima espressione è il risultato, quindi `return` è facoltativo; `await` funziona al livello principale. Uno script la cui ultima istruzione non è un'espressione, come una dichiarazione, non ha risultato e non stampa nulla.

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

## Formule delle variabili

Usa `pairdraw.setVariableFormula(collectionName, variableName, source, modeName?)` per sostituire la definizione di una variabile con una formula. La formula viene convalidata prima di modificare il documento e la funzione restituisce il valore risolto. Se ometti il nome della modalità, viene modificata la modalità predefinita della raccolta.

```js
pairdraw.setVariableFormula('Spacing', 'large', '{base} * 2')
pairdraw.setVariableFormula('State', 'visible', '{viewport} > 1024 and not {loading}')
pairdraw.setVariableFormula('Copy', 'greeting', 'if({compact}, "Hi", "Hello, " + {name})')
```

I riferimenti usano i nomi delle variabili oppure `{Collection::variable}` e vengono salvati come ID stabili. Le formule usano le unità salvate, quindi le lunghezze sono in pixel. Per gli operatori e i limiti dell'esportazione vedi [Variabili](/it/user-guide/variables).

## Collegamenti alle variabili

`node.setBoundVariable(field, variable)` di Figma collega usando i nomi dei campi e le regole sui tipi di Figma. Usa `pairdraw.bindVariable(node, field, variable)` per collegare un campo di un livello a una variabile di `figma.variables` come fa il pannello dei livelli, e `pairdraw.unbindVariable(node, field)` per scollegarlo; il campo conserva l'ultimo valore ricevuto dalla variabile. I campi usano i nomi di Pairdraw, come `text`, `visible`, `opacity`, `paddingLeft` o `fills/0/color`. I collegamenti seguono il pannello dei livelli, che accetta più di `setBoundVariable` di Figma: il contenuto del testo accetta una variabile di testo o numerica, con il numero mostrato come testo, e la visibilità una variabile booleana oppure una variabile di testo che mostra il livello a meno che non sia vuota o valga `false`, `no` o `off`.

```js
const [price] = figma.variables.getLocalVariables('FLOAT')
const label = figma.currentPage.findOne((node) => node.name === 'Price')
pairdraw.bindVariable(label, 'text', price)
```

## Interrogare i nodi

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

## Modificare e salvare

Usa `--write` / `-w` per scrivere le modifiche nel file di input:

```sh
pairdraw eval design.fig -c "
  figma.currentPage.children.forEach((node) => {
    node.opacity = 0.5
  })
" --write
```

Usa `--output` / `-o` per scrivere in un nuovo file:

```sh
pairdraw eval design.fig -c "figma.currentPage.name = 'Updated'" -o updated.fig
```

Usa `--preview-output` per scrivere, dopo l'esecuzione, un PNG della pagina che lo script lascia come corrente:

```sh
pairdraw eval design.fig --stdin --write --preview-output preview.png < transform.js
```

## Leggere gli script da stdin

```sh
cat transform.js | pairdraw eval design.fig --stdin --write
```

## Modalità app in esecuzione

Ometti il percorso del file per eseguire lo script sul documento aperto nell'app desktop:

```sh
pairdraw eval -c "return figma.currentPage.name"
```

L'app desktop deve essere in esecuzione con un documento aperto.

## Output

Per impostazione predefinita, l'output fuori da un terminale interattivo è JSON. Usa `--json` per forzare l'output JSON:

```sh
pairdraw eval design.fig -c "return figma.currentPage.children.map((n) => n.name)" --json
```

Usa `--quiet` / `-q` per nascondere l'output quando scrivi soltanto un file.

## L'API `pairdraw`

Accanto a `figma`, gli script ricevono `pairdraw`: ciò che Pairdraw aggiunge alla Figma Plugin API, nello stesso stile. Lo stesso oggetto globale è disponibile per lo strumento `eval` e per l'automazione dell'app in esecuzione.

Un componente principale o un set di componenti può [comportarsi come un controllo Reka UI](/it/user-guide/components#comportamenti-e-anteprima). Collegalo usando i nomi delle sue proprietà e dei suoi slot:

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

- `pairdraw.setBehaviour(node, kindOrSpec)` sostituisce il comportamento di un componente: solo un tipo, oppure una specifica come `{ kind: "slider", parts: { track: "Track", thumb: "Thumb" }, numbers: { value: { min: 0, max: 10 } } }`. Restituisce il comportamento.
- `pairdraw.getBehaviour(node)` ne legge uno, oppure restituisce `null`; una variante legge quello del proprio set.
- Un comportamento ha `kind`, `spec` (per nome), `missing` (valori e parti obbligatori ancora da collegare) e `states`, oltre a `bindValue(valueId, property, { on, off })`, `bindPart(partId, slotNameOrFrame)`, `setNumber(valueId, { min, max, step, default })` e `remove()`.
- `pairdraw.behaviourKinds` elenca ogni tipo con i valori e le parti che collega.
- `pairdraw.createSlot(frame)` trasforma in slot un frame di un componente principale e ne restituisce il nome.

I nomi che il componente non ha generano un errore che elenca quelli disponibili.

I commenti lasciati con lo strumento Commento fanno parte del documento, quindi script e agenti possono leggere il feedback su un file, intervenire e rispondere:

```sh
pairdraw eval design.fig -w -c '
  for (const comment of pairdraw.getComments({ resolved: false })) {
    console.log(comment.author, comment.node?.name, comment.text)
    comment.reply("Bumped the title to 24px", { author: "Claude" }).resolve()
  }
'
```

- `pairdraw.getComments(filter)` elenca le discussioni dalla più vecchia: tutte, oppure `{ resolved: false }` per quelle aperte, `{ page }` per quelle di una pagina, `{ author }` per quelle avviate da una persona o a cui ha risposto.
- `pairdraw.addComment(text, { node, page, x, y, author })` fissa un commento su un livello, che il commento segue, oppure in un punto di una pagina; per impostazione predefinita la pagina corrente. Se omesso, `author` vale `"Agent"`.
- Un commento ha `id`, `text` (Markdown), `author`, `createdAt`, `resolved`, `page`, `node` (il livello di primo livello a cui è fissato), `position` e `replies`, oltre a `reply(text, { author })`, `resolve()`, `reopen()` e `remove()`. `pairdraw.getComment(id)` ne trova uno.

Gli stati indicano a che punto si trova una sezione, un frame, un componente o un'istanza, scegliendo dall'elenco del documento, per esempio Draft, In review o Ready for dev:

```sh
pairdraw eval design.fig -w -c '
  const checkout = figma.currentPage.findOne(n => n.name === "Checkout")
  pairdraw.setStatus(checkout, "Ready for dev")
  pairdraw.statuses.map(status => status.name)
'
```

- `pairdraw.statuses` elenca in ordine gli stati del documento, ciascuno con `name`, `color` (`#RRGGBB`) e `figma`, lo stato che Figma mostra al suo posto (`READY_FOR_DEV`, `COMPLETED` o `null`).
- `pairdraw.getStatus(node)` legge il nome dello stato mostrato da un livello, oppure `null`, anche mentre una sezione che lo contiene mostra il proprio.
- `pairdraw.setStatus(node, name)` ne imposta uno per nome, e `null` lo rimuove. Lo accettano solo sezioni, frame, componenti, set di componenti e istanze che si trovano direttamente su una pagina o in una sezione; qualsiasi altro livello genera un errore che spiega il motivo, e un nome sconosciuto elenca gli stati esistenti.

Funzionalità dei livelli per cui l'API di Figma non ha alcun membro:

- `pairdraw.getLayoutDirection(node)` / `setLayoutDirection(node, direction)` e `getTextDirection(node)` / `setTextDirection(node, direction)` leggono e impostano la direzione di un Auto-layout o di un testo: `AUTO`, `LTR` o `RTL`.
- `pairdraw.getFillOkHCL(node, index?)` / `setFillOkHCL(node, color, index?)` e la coppia `Stroke` leggono e impostano il colore di una pittura in OkHCL, `{ h, c, l, a? }`; il valore RGB segue nello spazio colore del documento.
- `pairdraw.exposeInstanceSwap(instances, candidates, name?)` espone la sostituzione di quelle istanze come un'unica proprietà di sostituzione dell'istanza che offre i componenti candidati, e restituisce il livello che la contiene.
- `pairdraw.getFontStatus()` riporta se i font della pagina corrente sono disponibili: gli stili richiesti, da dove è stato caricato ciascuno, le sostituzioni e i livelli interessati.

## API supportata

L'API è volutamente vicina alla Plugin API di Figma, ma si appoggia al grafo della scena e al formato di file di Pairdraw.

### Documento e pagine

- `figma.root`
- `figma.currentPage`
- `figma.currentPage.selection`
- `figma.getNodeById(id)`
- `figma.createPage()`

### Creazione dei nodi

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

### Operazioni sull'albero

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

### Componenti

- `figma.createComponentFromNode(node)`
- `figma.combineAsVariants(components, parent)`: le proprietà derivano da nomi come `State=On, Size=Large`
- Su un set di componenti, `addComponentProperty(name, 'VARIANT', value)` aggiunge il valore al nome di ogni variante e `editComponentProperty(name, { name })` rinomina la proprietà al loro interno, e le istanze si adeguano; rinominare una variante aggiorna i valori del set, e `variantProperties` legge i valori di una variante o di un'istanza
- `component.createInstance()`
- `instance.mainComponent`

### Variabili

- `figma.variables.getLocalVariables(type?)`, `getVariableById(id)`, `getLocalVariableCollections()`, `getVariableCollectionById(id)` e le rispettive forme `…Async`
- `figma.variables.createVariableCollection(name)` e `createVariable(name, collection, resolvedType)`, che inizializza ogni modalità con il valore predefinito di Figma
- `figma.variables.createVariableAlias(variable)` e `setBoundVariableForPaint(paint, 'color', variable)`
- `variable.setValueForMode(modeId, value)`, `valuesByMode`, `resolveForConsumer(node)`, `name`, `description`, `scopes`, `codeSyntax` e `remove()`
- `collection.addMode(name)`, `renameMode(modeId, name)`, `removeMode(modeId)`, `modes`, `defaultModeId`, `variableIds` e `remove()`
- `node.boundVariables`, `node.setBoundVariable(field, variable)`, `node.setExplicitVariableModeForCollection(collection, modeId)` e `node.clearExplicitVariableModeForCollection(collection)`

### Proprietà

Le proprietà più comuni dei nodi sono leggibili e scrivibili tramite il proxy, tra cui:

- Geometria: `x`, `y`, `width`, `height`, `rotation`, `resize(width, height)`
- Aspetto: `fills`, `strokes`, `effects`, `opacity`, `visible`, `locked`, `blendMode`, `clipsContent`. Qui le pitture hanno la forma di Figma, anche in `backgrounds` della pagina, negli intervalli di testo e nelle regioni dei vettori: un `color` pieno è RGB con l'alfa in `opacity`, e un'immagine indica `scaleMode`, `rotation` e `scalingFactor`; una pittura che Figma rifiuta genera il messaggio di Figma
- Raggio: `cornerRadius`, `topLeftRadius`, `topRightRadius`, `bottomRightRadius`, `bottomLeftRadius`
- Testo: `characters`, `fontSize`, `fontName` (con `variationSettings`, ogni asse di un font variabile), `fontWeight` (il `wght` di un font variabile), `fills`, `letterSpacing`, `lineHeight` e `textDecoration`, che leggono `figma.mixed` quando i caratteri sono diversi e, se impostati, cambiano lo stile di tutti i caratteri, e l'allineamento
- Stato del font del testo: `node.hasMissingFont` legge `true` finché un font con cui il testo si disegna non è caricato né offerto dal catalogo dei font del documento, così uno script può capire se un font va caricato o manca nel documento
- Intervalli di testo: `getStyledTextSegments(fields, start?, end?)` e `getRange…` / `setRange…` per `FontSize`, `FontName`, `Fills`, `LetterSpacing`, `LineHeight`, `TextDecoration` con `Style`, `Offset`, `Thickness`, `Color` e `SkipInk`, `TextCase`, `Hyperlink` (un link `{ type: 'URL' | 'NODE', value }` oppure `null`), `TextStyleId` e `FillStyleId` (impostati con `setRangeTextStyleIdAsync` e `setRangeFillStyleIdAsync`, che danno all'intervallo i campi dello stile), e `getRangeBoundVariable` / `setRangeBoundVariable` per i campi di testo che Figma collega, oltre a `getRangeFontWeight`, `getRangeAllFontNames` e `getRangeOpenTypeFeatures`. Interlinea e spaziatura tra le lettere mantengono l'unità con cui sono impostate, pixel o una percentuale della dimensione del font che segue la dimensione, come in Figma; le altre lunghezze si leggono in pixel, e una percentuale passata ai loro setter si riferisce alla dimensione del font
- Elenchi e paragrafi del testo: `getRangeListOptions` / `setRangeListOptions` per gli elementi puntati (`UNORDERED`) e numerati (`ORDERED`), `getRangeIndentation` / `setRangeIndentation` per l'annidamento (da 1 a 5 per gli elementi di elenco), `listSpacing`, `paragraphSpacing` e `paragraphIndent` per l'intero testo (`figma.mixed` quando i paragrafi sono diversi) o per paragrafo con `getRangeListSpacing` / `setRangeListSpacing`, `getRangeParagraphSpacing` / `setRangeParagraphSpacing` e `getRangeParagraphIndent` / `setRangeParagraphIndent`, e `hangingList`
- Auto-layout: `layoutMode`, `primaryAxisAlignItems`, `counterAxisAlignItems`, `itemSpacing`, spaziatura interna, dimensionamento e campi di posizionamento nel layout
- Contorni: `strokeWeight`, `strokeAlign`, `dashPattern`
- Stato: `devStatus` su sezioni, frame, componenti, set di componenti e istanze direttamente su una pagina o in una sezione, come `{ type: 'READY_FOR_DEV' | 'COMPLETED' }` oppure `null` (la descrizione non viene conservata); legge `null` finché il livello si trova in una posizione in cui non può mostrarne uno

### Utilità

- `figma.mixed`
- `figma.util.rgb(color)`, `figma.util.rgba(color, alphaOverride?)` e `figma.util.solidPaint(color, overrides?)` leggono una stringa di colore esadecimale o CSS (`rgb()`, `hsl()`, `lab()`, `oklab()`, `oklch()`, `color(display-p3 …)` o un nome), ridotta a sRGB, oppure un oggetto `{ r, g, b, a? }` con canali da 0 a 1; `solidPaint` prende colore e opacità da `color` e le altre proprietà da `overrides`, per esempio una pittura esistente
- `figma.createImage(data)` accetta un PNG, JPEG o GIF fino a 4096 pixel per lato e restituisce l'`Image` di Figma: il suo `hash`, `getBytesAsync()` e `getSizeAsync()`; `figma.getImageByHash(hash)` restituisce un'immagine salvata
- `figma.createImageAsync(url)` carica un URL `http(s)://` o un data URI. L'app desktop scarica tramite il proprio proxy nativo, come Figma scarica tramite i propri server; nel browser l'host dell'immagine deve consentire le richieste cross-origin
- `figma.loadFontAsync(fontName)` carica il font in modo che il testo venga misurato e disegnato con esso; una famiglia indicata senza stile carica tutti i suoi stili, e una famiglia variabile anche i suoi stili con nome. Un font che non può essere caricato viene rifiutato con il messaggio di Figma `The font "Family Style" could not be loaded`
- Come in Figma, una modifica che ridispone il testo genera `Cannot write to node with unloaded font` finché tutti i font usati dal testo non sono caricati: `characters`, `insertCharacters`, `deleteCharacters`, `fontSize`, spaziatura, maiuscole/minuscole, decorazione, allineamento, `textAutoResize`, troncamento e i metodi `setRange…` corrispondenti. Anche un nuovo `fontName` deve essere caricato, ma sostituisce quello del testo, quindi un testo con un font mancante può ricevere un font caricato. Pitture, link, dimensione e trasformazioni non richiedono alcun font
- `figma.getFontFamilyVariationAxes(family)` elenca i tag degli assi di una famiglia variabile, oppure `null` per una famiglia statica; a differenza di Figma, la famiglia deve essere caricata prima
- Un font impostato con `variationSettings` e senza stile, tramite `fontName` o `setRangeFontName`, prende lo stile con nome più vicino, e un asse che la famiglia non ha genera l'errore di Figma
- `figma.listAvailableFontsAsync()` restituisce i font forniti dall'host, quando disponibili
- `figma.getNodeByIdAsync(id)` e `instance.getMainComponentAsync()` si risolvono negli stessi nodi di `figma.getNodeById(id)` e `instance.mainComponent`, per gli script scritti per la modalità a pagine dinamiche di Figma
- `figma.setCurrentPageAsync(page)` cambia pagina come l'assegnazione di `figma.currentPage`, e `page.loadAsync()` si risolve subito perché ogni pagina è già caricata, per gli script scritti per la modalità a pagine dinamiche di Figma
- `figma.notify(message)` registra un avviso in modalità senza interfaccia
- `figma.ui` e `figma.showUI(html?, options?)` esistono in modalità senza interfaccia come i no-op di Figma: `ui.postMessage`, `ui.resize`, `ui.show`, `ui.hide` e `ui.close` non fanno nulla, `ui.onmessage` è assegnabile ma non scatta mai, e `showUI` non mostra nulla. Uno script che invia a una UI gira senza lanciare errori
- `figma.closePlugin(message?)` e `figma.loadAllPagesAsync()` permettono di eseguire uno script scritto come plugin Figma: non c'è nulla da chiudere o da caricare, e `closePlugin` passa il proprio messaggio a `figma.notify`. Figma rifiuta ogni chiamata dopo `closePlugin`, mentre qui lo script continua a girare, quindi fallo seguire da `return` come fa la documentazione di Figma
- `instance.swapComponent(component)` fa puntare un'istanza a un altro componente
- Un livello all'interno di un'istanza rifiuta `x`, `y`, `rotation`, `relativeTransform`, `constraints`, `isMask` e `maskType` con l'errore di Figma, come `in set_x: This property cannot be overridden in an instance: relative-transform`; queste proprietà seguono sempre il componente. Il contenuto degli slot le conserva, e impostarne una sul contenuto predefinito di uno slot fa sì che l'istanza diventi proprietaria dello slot
- `component.createSlot()` aggiunge un frame slot e la relativa proprietà `SLOT`; i frame slot leggono `type: 'SLOT'`, `resetSlot()` ripristina il contenuto del componente nello slot di un'istanza e `limitViolations` elenca i limiti violati dallo slot di un'istanza. `addComponentProperty` e `editComponentProperty` accettano una `description` e, per gli slot, `slotSettings`
- `figma.viewport`

## Non ancora compatibile con Figma

Queste API di Figma non sono ancora esposte come funzioni compatibili:

- `node.exportAsync()`
- `figma.util.normalizeMarkdown()`, che fallisce perché Pairdraw non ha descrizioni o annotazioni in testo formattato da normalizzare
- Variabili di libreria, raccolte estese e collegamenti di variabili su effetti e griglie di layout
- Le API di Figma per gli stili, come `figma.createPaintStyle()` / `figma.createTextStyle()`
- La piena parità delle operazioni booleane vettoriali

Dove disponibili, usa i comandi di esportazione della CLI di Pairdraw, gli strumenti del nucleo o le funzioni dirette del grafo della scena.
