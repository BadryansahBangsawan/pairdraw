---
title: Сценарии
description: Выполнение JavaScript через совместимый с Figma Plugin API для поиска, массового изменения и создания дизайна.
---

# Сценарии

`pairdraw eval` выполняет JavaScript для документа Pairdraw и предоставляет глобальный объект `figma`, совместимый с Figma. Команда подходит для пакетных изменений без интерфейса, проверки документов, подготовки тестовых данных и автоматизации без открытия редактора.

## Первый вызов

```sh
pairdraw eval design.fig -c "return figma.currentPage.children.length"
```

Параметр `-c` принимает JavaScript. Результатом считается последнее выражение, поэтому `return` необязателен; `await` работает на верхнем уровне. Если последняя инструкция сценария не выражение, например объявление, результата нет и ничего не выводится.

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

## Формулы переменных

`pairdraw.setVariableFormula(collectionName, variableName, source, modeName?)` заменяет определение переменной формулой. Перед изменением документа формула проверяется, а функция возвращает вычисленное значение. Без имени режима изменяется режим коллекции по умолчанию.

```js
pairdraw.setVariableFormula('Spacing', 'large', '{base} * 2')
pairdraw.setVariableFormula('State', 'visible', '{viewport} > 1024 and not {loading}')
pairdraw.setVariableFormula('Copy', 'greeting', 'if({compact}, "Hi", "Hello, " + {name})')
```

Ссылки задаются именами переменных или в виде `{Collection::variable}` и сохраняются как стабильные идентификаторы. Формулы работают с сохранёнными единицами, поэтому длины указываются в пикселях. Операторы и ограничения экспорта описаны в разделе [Переменные](/ru/user-guide/variables).

## Привязки переменных

`node.setBoundVariable(field, variable)` из Figma привязывает переменную по именам полей и правилам типов Figma. `pairdraw.bindVariable(node, field, variable)` привязывает поле слоя к переменной из `figma.variables` так, как это делает панель слоя, а `pairdraw.unbindVariable(node, field)` снимает привязку; поле сохраняет значение, которое переменная дала ему последним. Поля используют имена Pairdraw: `text`, `visible`, `opacity`, `paddingLeft` или `fills/0/color`. Привязки следуют панели слоя, которая допускает больше, чем `setBoundVariable` в Figma: текстовое содержимое принимает текстовую или числовую переменную (число показывается как текст), а видимость — логическую или текстовую переменную, которая показывает слой, если она не пуста и не равна `false`, `no` или `off`.

```js
const [price] = figma.variables.getLocalVariables('FLOAT')
const label = figma.currentPage.findOne((node) => node.name === 'Price')
pairdraw.bindVariable(label, 'text', price)
```

## Поиск объектов

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

## Изменение и сохранение

`--write` или `-w` записывает изменения обратно во входной файл:

```sh
pairdraw eval design.fig -c "
  figma.currentPage.children.forEach((node) => {
    node.opacity = 0.5
  })
" --write
```

`--output` или `-o` записывает результат в новый файл:

```sh
pairdraw eval design.fig -c "figma.currentPage.name = 'Updated'" -o updated.fig
```

`--preview-output` после выполнения сценария записывает PNG страницы, которую он оставил текущей:

```sh
pairdraw eval design.fig --stdin --write --preview-output preview.png < transform.js
```

## Сценарий из стандартного ввода

```sh
cat transform.js | pairdraw eval design.fig --stdin --write
```

## Открытое приложение

Не указывайте файл, чтобы выполнить сценарий для текущего документа в настольном приложении:

```sh
pairdraw eval -c "return figma.currentPage.name"
```

Настольное приложение должно быть запущено, и в нём должен быть открыт документ.

## Вывод

Если вывод не идёт в терминал, по умолчанию используется JSON. Параметр `--json` включает JSON принудительно:

```sh
pairdraw eval design.fig -c "return figma.currentPage.children.map((n) => n.name)" --json
```

`--quiet` или `-q` отключает вывод, когда нужно только записать файл.

## API `pairdraw`

Помимо `figma`, сценарии получают `pairdraw` — то, что Pairdraw добавляет к Figma Plugin API, в том же стиле. Тот же глобальный объект доступен инструменту `eval` и автоматизации запущенного приложения.

Основной компонент или набор компонентов может [вести себя как элемент управления Reka UI](/ru/user-guide/components#behaviours-and-preview). Привяжите поведение по собственным именам свойств и слотов компонента:

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

- `pairdraw.setBehaviour(node, kindOrSpec)` заменяет поведение компонента: только вид или спецификация вроде `{ kind: "slider", parts: { track: "Track", thumb: "Thumb" }, numbers: { value: { min: 0, max: 10 } } }`. Возвращает поведение.
- `pairdraw.getBehaviour(node)` читает поведение или возвращает `null`; вариант читает поведение своего набора.
- У поведения есть `kind`, `spec` (по именам), `missing` (обязательные значения и части, которые ещё не привязаны) и `states`, а также методы `bindValue(valueId, property, { on, off })`, `bindPart(partId, slotNameOrFrame)`, `setNumber(valueId, { min, max, step, default })` и `remove()`.
- `pairdraw.behaviourKinds` перечисляет все виды со значениями и частями, которые они привязывают.
- `pairdraw.createSlot(frame)` делает фрейм основного компонента слотом и возвращает его имя.

Если у компонента нет указанного имени, возникает ошибка со списком имён, которые есть.

Комментарии, оставленные инструментом «Комментарий», — часть документа, поэтому сценарии и агенты могут читать отзывы о файле, действовать по ним и отвечать:

```sh
pairdraw eval design.fig -w -c '
  for (const comment of pairdraw.getComments({ resolved: false })) {
    console.log(comment.author, comment.node?.name, comment.text)
    comment.reply("Bumped the title to 24px", { author: "Claude" }).resolve()
  }
'
```

- `pairdraw.getComments(filter)` перечисляет ветки от самых старых: все, `{ resolved: false }` — открытые, `{ page }` — ветки одной страницы, `{ author }` — те, которые человек начал или в которых ответил.
- `pairdraw.addComment(text, { node, page, x, y, author })` прикрепляет комментарий к слою, за которым он следует, или к точке страницы; по умолчанию к текущей странице. Без `author` автором будет `"Agent"`.
- У комментария есть `id`, `text` (Markdown), `author`, `createdAt`, `resolved`, `page`, `node` (слой верхнего уровня, к которому он прикреплён), `position` и `replies`, а также методы `reply(text, { author })`, `resolve()`, `reopen()` и `remove()`. `pairdraw.getComment(id)` находит комментарий по идентификатору.

Статусы показывают, на каком этапе находится секция, фрейм, компонент или экземпляр, по собственному списку документа, например Draft, In review или Ready for dev:

```sh
pairdraw eval design.fig -w -c '
  const checkout = figma.currentPage.findOne(n => n.name === "Checkout")
  pairdraw.setStatus(checkout, "Ready for dev")
  pairdraw.statuses.map(status => status.name)
'
```

- `pairdraw.statuses` перечисляет статусы документа по порядку, у каждого есть `name`, `color` (`#RRGGBB`) и `figma` — статус, который для него показывает Figma (`READY_FOR_DEV`, `COMPLETED` или `null`).
- `pairdraw.getStatus(node)` читает имя статуса, который показывает слой, или `null` — в том числе когда окружающая секция показывает собственный статус.
- `pairdraw.setStatus(node, name)` задаёт статус по имени, а `null` снимает его. Статус принимают только секции, фреймы, компоненты, наборы компонентов и экземпляры, лежащие прямо на странице или в секции; для остальных возникает ошибка с объяснением, а неизвестное имя приводит к ошибке со списком существующих статусов.

Возможности слоёв, для которых в API Figma нет члена:

- `pairdraw.getLayoutDirection(node)` / `setLayoutDirection(node, direction)` и `getTextDirection(node)` / `setTextDirection(node, direction)` читают и задают направление автоматической компоновки или текста: `AUTO`, `LTR` или `RTL`.
- `pairdraw.getFillOkHCL(node, index?)` / `setFillOkHCL(node, color, index?)` и аналогичная пара для `Stroke` читают и задают цвет заливки или обводки в OkHCL, `{ h, c, l, a? }`; RGB пересчитывается в цветовом пространстве документа.
- `pairdraw.exposeInstanceSwap(instances, candidates, name?)` выносит замену этих экземпляров в одно свойство замены экземпляра с компонентами-кандидатами и возвращает слой, который его содержит.
- `pairdraw.getFontStatus()` сообщает, доступны ли шрифты текущей страницы: запрошенные начертания, откуда загружено каждое, замены и затронутые слои.

## Доступный API

API намеренно близок к Figma Plugin API, но работает с графом сцены и форматом файлов Pairdraw.

### Документ и страницы

- `figma.root`
- `figma.currentPage`
- `figma.currentPage.selection`
- `figma.getNodeById(id)`
- `figma.createPage()`

### Создание объектов

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

### Дерево

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

### Компоненты

- `figma.createComponentFromNode(node)`
- `figma.combineAsVariants(components, parent)` — свойства берутся из имён вида `State=On, Size=Large`
- У набора компонентов `addComponentProperty(name, 'VARIANT', value)` добавляет значение к имени каждого варианта, а `editComponentProperty(name, { name })` переименовывает свойство в них, и экземпляры следуют за изменением; переименование варианта обновляет значения набора, а `variantProperties` читает значения варианта или экземпляра
- `component.createInstance()`
- `instance.mainComponent`

### Переменные

- `figma.variables.getLocalVariables(type?)`, `getVariableById(id)`, `getLocalVariableCollections()`, `getVariableCollectionById(id)` и их варианты `…Async`
- `figma.variables.createVariableCollection(name)` и `createVariable(name, collection, resolvedType)` — каждый режим получает значение Figma по умолчанию
- `figma.variables.createVariableAlias(variable)` и `setBoundVariableForPaint(paint, 'color', variable)`
- `variable.setValueForMode(modeId, value)`, `valuesByMode`, `resolveForConsumer(node)`, `name`, `description`, `scopes`, `codeSyntax` и `remove()`
- `collection.addMode(name)`, `renameMode(modeId, name)`, `removeMode(modeId)`, `modes`, `defaultModeId`, `variableIds` и `remove()`
- `node.boundVariables`, `node.setBoundVariable(field, variable)`, `node.setExplicitVariableModeForCollection(collection, modeId)` и `node.clearExplicitVariableModeForCollection(collection)`

### Свойства

Распространённые свойства объектов доступны для чтения и записи через прокси, в том числе:

- Геометрия: `x`, `y`, `width`, `height`, `rotation`, `resize(width, height)`
- Внешний вид: `fills`, `strokes`, `effects`, `opacity`, `visible`, `locked`, `blendMode`, `clipsContent`. Заливки здесь, а также в `backgrounds` страницы, диапазонах текста и областях вектора имеют форму Figma: сплошной `color` задаётся в RGB, а его прозрачность — в `opacity`, у изображения указываются `scaleMode`, `rotation` и `scalingFactor`; заливка, которую Figma отклоняет, вызывает исключение с сообщением Figma
- Радиусы: `cornerRadius`, `topLeftRadius`, `topRightRadius`, `bottomRightRadius`, `bottomLeftRadius`
- Текст: `characters`, `fontSize`, `fontName` (с `variationSettings` — всеми осями вариативного шрифта), `fontWeight` (ось `wght` вариативного шрифта), `fills`, `letterSpacing`, `lineHeight` и `textDecoration`, которые читаются как `figma.mixed`, если символы различаются, а при записи меняют стиль всех символов, а также выравнивание
- Диапазоны текста: `getStyledTextSegments(fields, start?, end?)` и `getRange…` / `setRange…` для `FontSize`, `FontName`, `Fills`, `LetterSpacing`, `LineHeight`, `TextDecoration` вместе с `Style`, `Offset`, `Thickness`, `Color` и `SkipInk`, `TextCase`, `Hyperlink` (ссылка `{ type: 'URL' | 'NODE', value }` или `null`), `TextStyleId` и `FillStyleId` (задаются через `setRangeTextStyleIdAsync` и `setRangeFillStyleIdAsync`, которые передают диапазону поля стиля), `getRangeBoundVariable` / `setRangeBoundVariable` для текстовых полей, которые привязывает Figma, а также `getRangeFontWeight`, `getRangeAllFontNames` и `getRangeOpenTypeFeatures`. Интерлиньяж и межбуквенный интервал сохраняют единицу, в которой заданы: пиксели или процент от размера шрифта, следующий за размером, как в Figma; другие длины читаются в пикселях, а процент, переданный их сеттерам, считается от размера шрифта
- Списки и абзацы в тексте: `getRangeListOptions` / `setRangeListOptions` для маркированных (`UNORDERED`) и нумерованных (`ORDERED`) пунктов, `getRangeIndentation` / `setRangeIndentation` для вложенности (1–5 для пунктов списка), `listSpacing`, `paragraphSpacing` и `paragraphIndent` для всего текста (`figma.mixed`, если абзацы различаются) или для отдельных абзацев через `getRangeListSpacing` / `setRangeListSpacing`, `getRangeParagraphSpacing` / `setRangeParagraphSpacing` и `getRangeParagraphIndent` / `setRangeParagraphIndent`, а также `hangingList`
- Автоматическая компоновка: `layoutMode`, `primaryAxisAlignItems`, `counterAxisAlignItems`, `itemSpacing`, отступы, размеры и поля позиционирования
- Обводка: `strokeWeight`, `strokeAlign`, `dashPattern`
- Статус: `devStatus` у секций, фреймов, компонентов, наборов компонентов и экземпляров, лежащих прямо на странице или в секции: `{ type: 'READY_FOR_DEV' | 'COMPLETED' }` или `null` (описание не сохраняется); он читается как `null`, пока слой лежит там, где статус не показывается

### Служебные возможности

- `figma.mixed`
- `figma.util.rgb(color)`, `figma.util.rgba(color, alphaOverride?)` и `figma.util.solidPaint(color, overrides?)` принимают шестнадцатеричную или CSS-строку цвета (`rgb()`, `hsl()`, `lab()`, `oklab()`, `oklch()`, `color(display-p3 …)` или имя), обрезанную до sRGB, либо объект `{ r, g, b, a? }` с каналами от 0 до 1; `solidPaint` берёт цвет и прозрачность из `color`, а остальные свойства — из `overrides`, например из существующей заливки
- `figma.createImage(data)` принимает PNG, JPEG или GIF до 4096 пикселей по стороне и возвращает `Image` Figma: его `hash`, `getBytesAsync()` и `getSizeAsync()`; `figma.getImageByHash(hash)` возвращает сохранённое изображение
- `figma.createImageAsync(url)` загружает URL `http(s)://` или data URI. Настольное приложение загружает через собственный прокси, как Figma загружает через свои серверы; в браузере сервер изображения должен разрешать запросы с другого источника
- `figma.loadFontAsync(fontName)` загружает шрифт, чтобы текст измерялся и рисовался им; семейство без указанного начертания загружается со всеми начертаниями, а вариативное — ещё и с именованными стилями. Шрифт, который не удаётся загрузить, отклоняется с ошибкой Figma `The font "Family Style" could not be loaded`
- Как в Figma, правка, после которой текст раскладывается заново, вызывает `Cannot write to node with unloaded font`, пока не загружены все шрифты текста: `characters`, `insertCharacters`, `deleteCharacters`, `fontSize`, интервалы, регистр, оформление, выравнивание, `textAutoResize`, усечение и соответствующие методы `setRange…`. Новый `fontName` тоже нужно загрузить, но он заменяет собственный шрифт текста, поэтому текст с отсутствующим шрифтом может получить загруженный. Заливкам, ссылкам, размеру и трансформациям шрифт не нужен
- `figma.getFontFamilyVariationAxes(family)` перечисляет теги осей вариативного семейства или возвращает `null` для статического; в отличие от Figma, семейство сначала нужно загрузить
- Шрифт, заданный через `variationSettings` без начертания в `fontName` или `setRangeFontName`, получает ближайший именованный стиль, а ось, которой нет у семейства, вызывает ошибку Figma
- `figma.listAvailableFontsAsync()` возвращает шрифты, предоставленные средой, когда они доступны
- `figma.getNodeByIdAsync(id)` и `instance.getMainComponentAsync()` возвращают те же объекты, что `figma.getNodeById(id)` и `instance.mainComponent`, — для сценариев, написанных под режим динамических страниц Figma
- `figma.setCurrentPageAsync(page)` переключает страницу так же, как присваивание `figma.currentPage`, а `page.loadAsync()` завершается сразу, потому что все страницы уже загружены, — для сценариев, написанных под режим динамических страниц Figma
- `figma.notify(message)` записывает предупреждение в режиме без интерфейса
- `figma.closePlugin(message?)` и `figma.loadAllPagesAsync()` позволяют запустить сценарий, написанный как плагин Figma: ничего закрывать или загружать не нужно, а `closePlugin` передаёт сообщение в `figma.notify`. Figma отклоняет все вызовы после `closePlugin`, а здесь сценарий продолжает выполняться, поэтому, как в документации Figma, ставьте после него `return`
- `instance.swapComponent(component)` переключает экземпляр на другой компонент
- Слой внутри экземпляра отклоняет `x`, `y`, `rotation`, `relativeTransform`, `constraints`, `isMask` и `maskType` с ошибкой Figma, например `in set_x: This property cannot be overridden in an instance: relative-transform`; эти свойства всегда следуют за компонентом. Содержимое слота их сохраняет, а установка такого свойства у содержимого слота по умолчанию делает слот собственностью экземпляра
- `component.createSlot()` добавляет фрейм слота и его свойство `SLOT`; фреймы слотов читаются как `type: 'SLOT'`, `resetSlot()` возвращает слоту экземпляра содержимое компонента, а `limitViolations` перечисляет ограничения, которые нарушает слот экземпляра. `addComponentProperty` и `editComponentProperty` принимают `description`, а для слотов — `slotSettings`
- `figma.viewport`

## Пока не совместимо с Figma

Следующие API Figma пока не предоставляются в совместимом виде:

- `node.exportAsync()`
- `figma.util.normalizeMarkdown()` — завершается ошибкой, потому что в Pairdraw нет описаний с форматированием и аннотаций, для которых нужна нормализация
- переменные из библиотек, расширенные коллекции и привязки переменных к эффектам и сеткам
- API стилей Figma, например `figma.createPaintStyle()` и `figma.createTextStyle()`
- полная совместимость логических операций над векторами

Вместо них используйте команды экспорта Pairdraw CLI, инструменты основного пакета или прямые вспомогательные функции графа сцены, когда они доступны.
