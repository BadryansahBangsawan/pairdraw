---
title: Skrypty
description: Wykonywanie JavaScript przez API zgodne z Figma Plugin API do wyszukiwania, masowych zmian i generowania projektów.
---

# Skrypty

`pairdraw eval` wykonuje JavaScript na dokumencie Pairdraw z globalnym obiektem `figma` zgodnym z Figmą. Polecenie nadaje się do zmian zbiorczych bez interfejsu, inspekcji, przygotowywania danych testowych i automatyzacji bez otwierania edytora.

## Podstawowe użycie

```sh
pairdraw eval design.fig -c "return figma.currentPage.children.length"
```

Opcja `-c` przyjmuje JavaScript. Jego ostatnie wyrażenie jest wynikiem, więc `return` jest opcjonalne; `await` działa na najwyższym poziomie. Skrypt, którego ostatnia instrukcja nie jest wyrażeniem, na przykład deklaracją, nie ma wyniku i niczego nie wypisuje.

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

## Formuły zmiennych

`pairdraw.setVariableFormula(collectionName, variableName, source, modeName?)` zastępuje definicję zmiennej formułą. Funkcja sprawdza formułę przed zmianą dokumentu i zwraca rozwiązaną wartość. Pominięcie nazwy trybu zmienia domyślny tryb kolekcji.

```js
pairdraw.setVariableFormula('Spacing', 'large', '{base} * 2')
pairdraw.setVariableFormula('State', 'visible', '{viewport} > 1024 and not {loading}')
pairdraw.setVariableFormula('Copy', 'greeting', 'if({compact}, "Hi", "Hello, " + {name})')
```

Odwołania używają nazw zmiennych lub zapisu `{Collection::variable}` i są przechowywane jako stabilne identyfikatory. Formuły używają przechowywanych jednostek, więc długości są w pikselach. Operatory i ograniczenia eksportu opisuje strona [Zmienne](/pl/user-guide/variables).

## Powiązania zmiennych

`node.setBoundVariable(field, variable)` z Figmy wiąże zmienne według nazw pól i reguł typów Figmy. `pairdraw.bindVariable(node, field, variable)` wiąże pole warstwy ze zmienną z `figma.variables` tak, jak robi to panel warstwy, a `pairdraw.unbindVariable(node, field)` usuwa powiązanie; pole zachowuje wartość, którą ostatnio nadała mu zmienna. Pola mają nazwy Pairdraw, na przykład `text`, `visible`, `opacity`, `paddingLeft` lub `fills/0/color`. Powiązania działają jak w panelu warstwy, który przyjmuje więcej niż `setBoundVariable` z Figmy: treść tekstu przyjmuje zmienną tekstową lub liczbową (liczba jest pokazywana jako tekst), a widoczność zmienną logiczną albo tekstową, która pokazuje warstwę, chyba że jest pusta lub ma wartość `false`, `no` albo `off`.

```js
const [price] = figma.variables.getLocalVariables('FLOAT')
const label = figma.currentPage.findOne((node) => node.name === 'Price')
pairdraw.bindVariable(label, 'text', price)
```

## Wyszukiwanie obiektów

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

## Zmiana i zapis

`--write` albo `-w` zapisuje zmiany z powrotem w pliku wejściowym:

```sh
pairdraw eval design.fig -c "
  figma.currentPage.children.forEach((node) => {
    node.opacity = 0.5
  })
" --write
```

`--output` albo `-o` zapisuje wynik do nowego pliku:

```sh
pairdraw eval design.fig -c "figma.currentPage.name = 'Updated'" -o updated.fig
```

`--preview-output` zapisuje po wykonaniu skryptu obraz PNG strony, którą skrypt zostawił jako bieżącą:

```sh
pairdraw eval design.fig --stdin --write --preview-output preview.png < transform.js
```

## Skrypty ze standardowego wejścia

```sh
cat transform.js | pairdraw eval design.fig --stdin --write
```

## Praca z uruchomioną aplikacją

Pomiń ścieżkę pliku, aby wykonać skrypt na dokumencie otwartym w aplikacji na komputer:

```sh
pairdraw eval -c "return figma.currentPage.name"
```

Aplikacja na komputer musi być uruchomiona i mieć otwarty dokument.

## Wyjście

Gdy wyjście nie jest terminalem, domyślnie ma format JSON. `--json` wymusza wyjście JSON:

```sh
pairdraw eval design.fig -c "return figma.currentPage.children.map((n) => n.name)" --json
```

`--quiet` albo `-q` wyłącza wyjście, gdy chcesz tylko zapisać plik.

## API `pairdraw`

Oprócz `figma` skrypty otrzymują `pairdraw`: to, co Pairdraw dodaje do Figma Plugin API, w tym samym stylu. Ten sam obiekt globalny jest dostępny w narzędziu `eval` i w automatyzacji uruchomionej aplikacji.

Główny komponent lub zestaw komponentów może [działać jak kontrolka Reka UI](/pl/user-guide/components#behaviours-and-preview). Powiąż go według nazw jego własnych właściwości i slotów:

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

- `pairdraw.setBehaviour(node, kindOrSpec)` zastępuje zachowanie komponentu: samym rodzajem albo specyfikacją, taką jak `{ kind: "slider", parts: { track: "Track", thumb: "Thumb" }, numbers: { value: { min: 0, max: 10 } } }`. Zwraca zachowanie.
- `pairdraw.getBehaviour(node)` odczytuje zachowanie albo zwraca `null`; wariant odczytuje zachowanie swojego zestawu.
- Zachowanie ma `kind`, `spec` (według nazw), `missing` (wymagane wartości i części, które nie są jeszcze powiązane) i `states` oraz metody `bindValue(valueId, property, { on, off })`, `bindPart(partId, slotNameOrFrame)`, `setNumber(valueId, { min, max, step, default })` i `remove()`.
- `pairdraw.behaviourKinds` wymienia wszystkie rodzaje z wartościami i częściami, które wiążą.
- `pairdraw.createSlot(frame)` zamienia ramkę głównego komponentu w slot i zwraca jego nazwę.

Nazwy, których komponent nie ma, kończą się błędem wymieniającym te, które ma.

Komentarze zostawiane narzędziem Komentarz są częścią dokumentu, więc skrypty i agenci mogą czytać uwagi do pliku, wprowadzać je i odpowiadać:

```sh
pairdraw eval design.fig -w -c '
  for (const comment of pairdraw.getComments({ resolved: false })) {
    console.log(comment.author, comment.node?.name, comment.text)
    comment.reply("Bumped the title to 24px", { author: "Claude" }).resolve()
  }
'
```

- `pairdraw.getComments(filter)` wymienia wątki od najstarszego: wszystkie albo `{ resolved: false }` dla otwartych, `{ page }` dla jednej strony, `{ author }` dla tych, które dana osoba rozpoczęła lub na które odpowiedziała.
- `pairdraw.addComment(text, { node, page, x, y, author })` przypina komentarz do warstwy, za którą podąża, albo do punktu strony; domyślnie bieżącej. Gdy `author` pominięto, jest nim `"Agent"`.
- Komentarz ma `id`, `text` (Markdown), `author`, `createdAt`, `resolved`, `page`, `node` (warstwę najwyższego poziomu, do której jest przypięty), `position` i `replies` oraz metody `reply(text, { author })`, `resolve()`, `reopen()` i `remove()`. `pairdraw.getComment(id)` znajduje jeden komentarz.

Statusy oznaczają etap sekcji, ramki, komponentu lub instancji według listy dokumentu, na przykład Draft, In review lub Ready for dev:

```sh
pairdraw eval design.fig -w -c '
  const checkout = figma.currentPage.findOne(n => n.name === "Checkout")
  pairdraw.setStatus(checkout, "Ready for dev")
  pairdraw.statuses.map(status => status.name)
'
```

- `pairdraw.statuses` wymienia statusy dokumentu po kolei, każdy z `name`, `color` (`#RRGGBB`) i `figma`, czyli statusem, który pokazuje dla niego Figma (`READY_FOR_DEV`, `COMPLETED` lub `null`).
- `pairdraw.getStatus(node)` odczytuje nazwę statusu, który pokazuje warstwa, albo `null`, także wtedy, gdy otaczająca ją sekcja pokazuje własny.
- `pairdraw.setStatus(node, name)` ustawia status po nazwie, a `null` go usuwa. Status mogą mieć tylko sekcje, ramki, komponenty, zestawy komponentów i instancje leżące bezpośrednio na stronie lub w sekcji; dla innych obiektów funkcja zgłasza błąd z wyjaśnieniem, a nieznana nazwa wymienia istniejące statusy.

Funkcje warstw, dla których API Figmy nie ma odpowiednika:

- `pairdraw.getLayoutDirection(node)` / `setLayoutDirection(node, direction)` oraz `getTextDirection(node)` / `setTextDirection(node, direction)` odczytują i ustawiają kierunek automatycznego układu lub tekstu: `AUTO`, `LTR` lub `RTL`.
- `pairdraw.getFillOkHCL(node, index?)` / `setFillOkHCL(node, color, index?)` i odpowiednia para dla `Stroke` odczytują i ustawiają kolor farby w OkHCL, `{ h, c, l, a? }`; jego RGB podąża za nim w przestrzeni barw dokumentu.
- `pairdraw.exposeInstanceSwap(instances, candidates, name?)` udostępnia zamianę tych instancji jako jedną właściwość zamiany instancji z komponentami kandydującymi i zwraca warstwę, która ją przechowuje.
- `pairdraw.getFontStatus()` raportuje, czy czcionki bieżącej strony są dostępne: żądane kroje, źródło każdego z nich, zamienniki i warstwy, których to dotyczy.

## Obsługiwane API

API jest celowo zbliżone do Figma Plugin API, ale odwzorowuje graf sceny i format plików Pairdraw.

### Dokument i strony

- `figma.root`
- `figma.currentPage`
- `figma.currentPage.selection`
- `figma.getNodeById(id)`
- `figma.createPage()`

### Tworzenie obiektów

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

### Operacje na drzewie

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

### Komponenty

- `figma.createComponentFromNode(node)`
- `figma.combineAsVariants(components, parent)` — właściwości pochodzą z nazw takich jak `State=On, Size=Large`
- W zestawie komponentów `addComponentProperty(name, 'VARIANT', value)` dopisuje wartość do nazwy każdego wariantu, a `editComponentProperty(name, { name })` zmienia w nich nazwę właściwości, za czym podążają instancje; zmiana nazwy wariantu aktualizuje wartości zestawu, a `variantProperties` odczytuje wartości wariantu lub instancji
- `component.createInstance()`
- `instance.mainComponent`

### Zmienne

- `figma.variables.getLocalVariables(type?)`, `getVariableById(id)`, `getLocalVariableCollections()`, `getVariableCollectionById(id)` i ich formy `…Async`
- `figma.variables.createVariableCollection(name)` i `createVariable(name, collection, resolvedType)`, które ustawia każdy tryb na wartość domyślną Figmy
- `figma.variables.createVariableAlias(variable)` i `setBoundVariableForPaint(paint, 'color', variable)`
- `variable.setValueForMode(modeId, value)`, `valuesByMode`, `resolveForConsumer(node)`, `name`, `description`, `scopes`, `codeSyntax` i `remove()`
- `collection.addMode(name)`, `renameMode(modeId, name)`, `removeMode(modeId)`, `modes`, `defaultModeId`, `variableIds` i `remove()`
- `node.boundVariables`, `node.setBoundVariable(field, variable)`, `node.setExplicitVariableModeForCollection(collection, modeId)` i `node.clearExplicitVariableModeForCollection(collection)`

### Właściwości

Typowe właściwości obiektów można odczytywać i zapisywać przez pośrednika, w tym:

- geometria: `x`, `y`, `width`, `height`, `rotation`, `resize(width, height)`;
- wygląd: `fills`, `strokes`, `effects`, `opacity`, `visible`, `locked`, `blendMode`, `clipsContent`. Farby mają tu kształt z Figmy, także w `backgrounds` strony, zakresach tekstu i regionach wektorów: jednolity `color` to RGB z kanałem alfa w `opacity`, a obraz podaje `scaleMode`, `rotation` i `scalingFactor`; farba odrzucana przez Figmę zgłasza komunikat Figmy;
- promień: `cornerRadius`, `topLeftRadius`, `topRightRadius`, `bottomRightRadius`, `bottomLeftRadius`;
- tekst: `characters`, `fontSize`, `fontName` (z `variationSettings`, czyli każdą osią czcionki zmiennej), `fontWeight` (`wght` czcionki zmiennej), `fills`, `letterSpacing`, `lineHeight` i `textDecoration`, które odczytują się jako `figma.mixed`, gdy znaki się różnią, a po ustawieniu zmieniają styl każdego znaku, oraz wyrównanie;
- stan czcionki tekstu: `node.hasMissingFont` odczytuje `true`, dopóki czcionka, którą tekst się rysuje, nie jest wczytana ani oferowana przez katalog czcionek dokumentu, więc skrypt może rozpoznać, czy czcionkę trzeba wczytać, czy brakuje jej w dokumencie;
- zakresy tekstu: `getStyledTextSegments(fields, start?, end?)` oraz `getRange…` / `setRange…` dla `FontSize`, `FontName`, `Fills`, `LetterSpacing`, `LineHeight`, `TextDecoration` z jego `Style`, `Offset`, `Thickness`, `Color` i `SkipInk`, `TextCase`, `Hyperlink` (link `{ type: 'URL' | 'NODE', value }` albo `null`), `TextStyleId` i `FillStyleId` (ustawiane przez `setRangeTextStyleIdAsync` i `setRangeFillStyleIdAsync`, które nadają zakresowi pola stylu) oraz `getRangeBoundVariable` / `setRangeBoundVariable` dla pól tekstu wiązanych przez Figmę, a także `getRangeFontWeight`, `getRangeAllFontNames` i `getRangeOpenTypeFeatures`. Interlinia i odstęp między znakami zachowują jednostkę, w której je ustawiono, piksele albo procent rozmiaru czcionki podążający za rozmiarem, jak w Figmie; inne długości odczytują się w pikselach, a procent przekazany ich funkcjom ustawiającym odnosi się do rozmiaru czcionki;
- listy i akapity w tekście: `getRangeListOptions` / `setRangeListOptions` dla elementów wypunktowanych (`UNORDERED`) i numerowanych (`ORDERED`), `getRangeIndentation` / `setRangeIndentation` dla zagnieżdżenia (1–5 dla elementów list), `listSpacing`, `paragraphSpacing` i `paragraphIndent` dla całego tekstu (`figma.mixed`, gdy akapity się różnią) albo dla poszczególnych akapitów przez `getRangeListSpacing` / `setRangeListSpacing`, `getRangeParagraphSpacing` / `setRangeParagraphSpacing` i `getRangeParagraphIndent` / `setRangeParagraphIndent` oraz `hangingList`;
- automatyczny układ: `layoutMode`, `primaryAxisAlignItems`, `counterAxisAlignItems`, `itemSpacing`, dopełnienie, rozmiary i pola pozycjonowania w układzie;
- obwiednia: `strokeWeight`, `strokeAlign`, `dashPattern`;
- status: `devStatus` sekcji, ramek, komponentów, zestawów komponentów i instancji leżących bezpośrednio na stronie lub w sekcji: `{ type: 'READY_FOR_DEV' | 'COMPLETED' }` albo `null` (opis nie jest zachowywany); odczytuje się jako `null`, dopóki warstwa leży tam, gdzie status nie może być widoczny.

### Narzędzia pomocnicze

- `figma.mixed`
- `figma.util.rgb(color)`, `figma.util.rgba(color, alphaOverride?)` i `figma.util.solidPaint(color, overrides?)` odczytują kolor zapisany szesnastkowo lub jako ciąg CSS (`rgb()`, `hsl()`, `lab()`, `oklab()`, `oklch()`, `color(display-p3 …)` albo nazwa), przycięty do sRGB, albo obiekt `{ r, g, b, a? }` z kanałami od 0 do 1; `solidPaint` bierze kolor i krycie z `color`, a pozostałe właściwości z `overrides`, na przykład z istniejącej farby
- `figma.createImage(data)` przyjmuje PNG, JPEG lub GIF o boku do 4096 pikseli i zwraca `Image` z Figmy: jego `hash`, `getBytesAsync()` i `getSizeAsync()`; `figma.getImageByHash(hash)` zwraca zapisany obraz
- `figma.createImageAsync(url)` wczytuje adres `http(s)://` albo URI data. Aplikacja na komputer pobiera go przez natywne proxy, tak jak Figma pobiera przez swoje serwery; w przeglądarce host obrazu musi zezwalać na żądania z innych domen
- `figma.loadFontAsync(fontName)` wczytuje czcionkę, aby tekst był nią mierzony i rysowany; rodzina podana bez stylu wczytuje wszystkie swoje style, a rodzina zmienna także nazwane style. Czcionka, której nie da się wczytać, kończy się odrzuceniem z komunikatem Figmy `The font "Family Style" could not be loaded`
- Tak jak w Figmie zmiana, która ponownie rozmieszcza tekst, zgłasza `Cannot write to node with unloaded font`, dopóki nie zostaną wczytane wszystkie czcionki używane przez tekst: `characters`, `insertCharacters`, `deleteCharacters`, `fontSize`, odstępy, wielkość liter, dekoracja, wyrównanie, `textAutoResize`, obcinanie i odpowiadające im metody `setRange…`. Nowy `fontName` również trzeba wczytać, ale zastępuje on czcionkę tekstu, więc tekst w brakującej czcionce może przyjąć wczytaną. Farby, linki, rozmiar i przekształcenia nie wymagają czcionki
- `figma.getFontFamilyVariationAxes(family)` wymienia tagi osi rodziny zmiennej albo zwraca `null` dla statycznej; w przeciwieństwie do Figmy rodzinę trzeba najpierw wczytać
- Czcionka ustawiona z `variationSettings` i bez stylu, przez `fontName` lub `setRangeFontName`, przyjmuje najbliższy nazwany styl, a oś, której rodzina nie ma, zgłasza błąd Figmy
- `figma.listAvailableFontsAsync()` zwraca czcionki dostarczane przez środowisko, gdy są dostępne
- `figma.getNodeByIdAsync(id)` i `instance.getMainComponentAsync()` zwracają te same obiekty co `figma.getNodeById(id)` i `instance.mainComponent` — dla skryptów pisanych pod tryb dynamicznych stron Figmy
- `figma.setCurrentPageAsync(page)` przełącza strony tak jak ustawienie `figma.currentPage`, a `page.loadAsync()` kończy się od razu, ponieważ wszystkie strony są już wczytane — dla skryptów pisanych pod tryb dynamicznych stron Figmy
- `figma.notify(message)` zapisuje ostrzeżenie w trybie bez interfejsu
- `figma.ui` i `figma.showUI(html?, options?)` istnieją w trybie bez interfejsu jako no-opy Figmy: `ui.postMessage`, `ui.resize`, `ui.show`, `ui.hide` i `ui.close` nic nie robią, `ui.onmessage` można przypisać, ale nigdy się nie wyzwala, a `showUI` nic nie pokazuje. Skrypt wysyłający do UI działa bez rzucania błędów
- `figma.closePlugin(message?)` i `figma.loadAllPagesAsync()` pozwalają uruchomić skrypt napisany jako wtyczka Figmy: nic nie trzeba zamykać ani wczytywać, a `closePlugin` przekazuje komunikat do `figma.notify`. Figma odrzuca każde wywołanie po `closePlugin`, a tu skrypt działa dalej, więc dodaj po nim `return`, jak zaleca dokumentacja Figmy
- `instance.swapComponent(component)` wskazuje instancji inny komponent
- Warstwa wewnątrz instancji odrzuca `x`, `y`, `rotation`, `relativeTransform`, `constraints`, `isMask` i `maskType` z błędem Figmy, na przykład `in set_x: This property cannot be overridden in an instance: relative-transform`; te właściwości zawsze podążają za komponentem. Zawartość slotu je zachowuje, a ustawienie jednej z nich na domyślnej zawartości slotu sprawia, że instancja przejmuje slot
- `component.createSlot()` dodaje ramkę slotu i jej właściwość `SLOT`; ramki slotów odczytują się jako `type: 'SLOT'`, `resetSlot()` przywraca zawartość komponentu w slocie instancji, a `limitViolations` wymienia limity naruszane przez slot instancji. `addComponentProperty` i `editComponentProperty` przyjmują `description`, a dla slotów `slotSettings`
- `figma.viewport`

## Jeszcze bez zgodności z Figmą

Te API Figmy nie są jeszcze udostępniane jako zgodne funkcje pomocnicze:

- `node.exportAsync()`
- `figma.util.normalizeMarkdown()`, które kończy się błędem, ponieważ Pairdraw nie ma opisów z tekstem sformatowanym ani adnotacji, które można by normalizować
- zmienne z bibliotek, rozszerzone kolekcje oraz powiązania zmiennych w efektach i siatkach układu
- API stylów Figmy, takie jak `figma.createPaintStyle()` / `figma.createTextStyle()`
- pełna zgodność operacji logicznych na wektorach

Zamiast nich używaj poleceń eksportu CLI, narzędzi rdzenia lub bezpośrednich funkcji pomocniczych grafu sceny, jeśli są dostępne.
