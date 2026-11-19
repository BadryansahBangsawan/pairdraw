---
title: Scripting
description: Exécuter JavaScript avec une API compatible avec les plugins Figma pour interroger, modifier par lots et générer des designs.
---

# Scripting

`pairdraw eval` exécute JavaScript sur un document Pairdraw avec un objet global `figma` compatible avec Figma. Cette commande convient aux modifications par lots sans interface, à l’inspection, à la préparation de données de test et à l’automatisation, sans ouvrir l’interface de l’éditeur.

## Utilisation de base

```sh
pairdraw eval design.fig -c "return figma.currentPage.children.length"
```

L’option `-c` accepte du JavaScript. Sa dernière expression constitue le résultat, si bien que `return` est facultatif ; `await` fonctionne au niveau supérieur. Un script dont la dernière instruction n’est pas une expression, par exemple une déclaration, n’a pas de résultat et n’affiche rien.

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

## Formules de variables

Utilisez `pairdraw.setVariableFormula(collectionName, variableName, source, modeName?)` pour remplacer la définition d’une variable par une formule. La formule est validée avant toute modification du document, et la fonction renvoie la valeur résolue. Sans nom de mode, c’est le mode par défaut de la collection qui est modifié.

```js
pairdraw.setVariableFormula('Spacing', 'large', '{base} * 2')
pairdraw.setVariableFormula('State', 'visible', '{viewport} > 1024 and not {loading}')
pairdraw.setVariableFormula('Copy', 'greeting', 'if({compact}, "Hi", "Hello, " + {name})')
```

Les références utilisent des noms de variables ou `{Collection::variable}` et sont enregistrées sous forme d’identifiants stables. Les formules utilisent les unités enregistrées : les longueurs sont donc en pixels. Consultez [Variables](/fr/user-guide/variables) pour les opérateurs et les limites de l’export.

## Liaisons de variables

`node.setBoundVariable(field, variable)` de Figma lie une variable avec les noms de champs et les règles de types de Figma. Utilisez `pairdraw.bindVariable(node, field, variable)` pour lier un champ d’un calque à une variable de `figma.variables` comme le fait le panneau du calque, et `pairdraw.unbindVariable(node, field)` pour retirer la liaison ; le champ garde la dernière valeur que la variable lui a donnée. Les champs portent les noms de Pairdraw, comme `text`, `visible`, `opacity`, `paddingLeft` ou `fills/0/color`. Les liaisons suivent le panneau du calque, qui accepte davantage que `setBoundVariable` de Figma : le contenu d’un texte accepte une variable de texte ou de nombre, le nombre étant affiché comme texte, et la visibilité une variable booléenne ou une variable de texte qui affiche le calque sauf si elle est vide ou vaut `false`, `no` ou `off`.

```js
const [price] = figma.variables.getLocalVariables('FLOAT')
const label = figma.currentPage.findOne((node) => node.name === 'Price')
pairdraw.bindVariable(label, 'text', price)
```

## Interroger des objets

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

## Modifier et enregistrer

Utilisez `--write` ou `-w` pour réécrire les modifications dans le fichier d’entrée :

```sh
pairdraw eval design.fig -c "
  figma.currentPage.children.forEach((node) => {
    node.opacity = 0.5
  })
" --write
```

Utilisez `--output` ou `-o` pour écrire dans un nouveau fichier :

```sh
pairdraw eval design.fig -c "figma.currentPage.name = 'Updated'" -o updated.fig
```

Utilisez `--preview-output` pour écrire, après l’exécution du script, un PNG de la page qu’il laisse courante :

```sh
pairdraw eval design.fig --stdin --write --preview-output preview.png < transform.js
```

## Lire le script depuis stdin

```sh
cat transform.js | pairdraw eval design.fig --stdin --write
```

## Mode application

Omettez le chemin du fichier pour exécuter le script sur le document ouvert dans l’application de bureau :

```sh
pairdraw eval -c "return figma.currentPage.name"
```

L’application de bureau doit être lancée avec un document ouvert.

## Sortie

Par défaut, une sortie qui n’est pas un terminal (TTY) est en JSON. Utilisez `--json` pour imposer JSON :

```sh
pairdraw eval design.fig -c "return figma.currentPage.children.map((n) => n.name)" --json
```

Utilisez `--quiet` ou `-q` pour masquer la sortie lorsque vous écrivez seulement un fichier.

## L’API `pairdraw`

À côté de `figma`, les scripts disposent de `pairdraw` : ce que Pairdraw ajoute à l’API des plugins Figma, dans le même style. Le même objet global est disponible pour l’outil `eval` et pour l’automatisation de l’application en cours d’exécution.

Un composant principal ou un ensemble de composants peut [se comporter comme un contrôle Reka UI](/fr/user-guide/components#behaviours-and-preview). Liez-le par ses propres noms de propriétés et d’emplacements :

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

- `pairdraw.setBehaviour(node, kindOrSpec)` remplace le comportement d’un composant : un type seul, ou une spécification comme `{ kind: "slider", parts: { track: "Track", thumb: "Thumb" }, numbers: { value: { min: 0, max: 10 } } }`. La fonction renvoie le comportement.
- `pairdraw.getBehaviour(node)` en lit un, ou renvoie `null` ; une variante lit celui de son ensemble.
- Un comportement possède `kind`, `spec` (par nom), `missing` (les valeurs et parties obligatoires encore non liées) et `states`, ainsi que `bindValue(valueId, property, { on, off })`, `bindPart(partId, slotNameOrFrame)`, `setNumber(valueId, { min, max, step, default })` et `remove()`.
- `pairdraw.behaviourKinds` liste chaque type avec les valeurs et les parties qu’il lie.
- `pairdraw.createSlot(frame)` transforme un cadre d’un composant principal en emplacement et renvoie son nom.

Un nom que le composant ne possède pas échoue avec une erreur qui liste ceux qu’il possède.

Les commentaires laissés avec l’outil Commentaire font partie du document : les scripts et les agents peuvent donc lire les retours sur un fichier, agir en conséquence et y répondre :

```sh
pairdraw eval design.fig -w -c '
  for (const comment of pairdraw.getComments({ resolved: false })) {
    console.log(comment.author, comment.node?.name, comment.text)
    comment.reply("Bumped the title to 24px", { author: "Claude" }).resolve()
  }
'
```

- `pairdraw.getComments(filter)` liste les fils du plus ancien au plus récent : tous, ou `{ resolved: false }` pour les fils ouverts, `{ page }` pour ceux d’une page, `{ author }` pour ceux qu’une personne a commencés ou auxquels elle a répondu.
- `pairdraw.addComment(text, { node, page, x, y, author })` épingle un commentaire sur un calque, qu’il suit, ou à un point d’une page ; la page courante par défaut. `author` vaut `"Agent"` s’il est omis.
- Un commentaire possède `id`, `text` (Markdown), `author`, `createdAt`, `resolved`, `page`, `node` (le calque de premier niveau auquel il est épinglé), `position` et `replies`, ainsi que `reply(text, { author })`, `resolve()`, `reopen()` et `remove()`. `pairdraw.getComment(id)` en retrouve un.

Les statuts indiquent où en est une section, un cadre, un composant ou une instance, d’après la liste propre au document, par exemple Draft, In review ou Ready for dev :

```sh
pairdraw eval design.fig -w -c '
  const checkout = figma.currentPage.findOne(n => n.name === "Checkout")
  pairdraw.setStatus(checkout, "Ready for dev")
  pairdraw.statuses.map(status => status.name)
'
```

- `pairdraw.statuses` liste les statuts du document dans l’ordre, chacun avec `name`, `color` (`#RRGGBB`) et `figma`, le statut que Figma affiche pour lui (`READY_FOR_DEV`, `COMPLETED` ou `null`).
- `pairdraw.getStatus(node)` lit le nom du statut qu’affiche un calque, ou renvoie `null`, y compris lorsqu’une section qui l’entoure affiche le sien.
- `pairdraw.setStatus(node, name)` en définit un par son nom, et `null` le retire. Seuls les sections, cadres, composants, ensembles de composants et instances placés directement sur une page ou dans une section en acceptent un ; tout autre calque échoue avec une erreur qui en donne la raison, et un nom inconnu liste les statuts existants.

Fonctionnalités de calque pour lesquelles l’API de Figma n’a pas de membre :

- `pairdraw.getLayoutDirection(node)` / `setLayoutDirection(node, direction)` et `getTextDirection(node)` / `setTextDirection(node, direction)` lisent et définissent le sens d’un auto layout ou d’un texte : `AUTO`, `LTR` ou `RTL`.
- `pairdraw.getFillOkHCL(node, index?)` / `setFillOkHCL(node, color, index?)` et la paire `Stroke` lisent et définissent la couleur d’une peinture en OkHCL, `{ h, c, l, a? }` ; sa valeur RGB suit dans l’espace colorimétrique du document.
- `pairdraw.exposeInstanceSwap(instances, candidates, name?)` expose l’échange de ces instances sous la forme d’une seule propriété d’échange d’instance proposant les composants candidats, et renvoie le calque qui la porte.
- `pairdraw.getFontStatus()` indique si les polices de la page courante sont disponibles : les styles demandés, la source de chacun, les substitutions et les calques concernés.

## API prise en charge

L’API reste volontairement proche de l’API des plugins Figma, mais elle s’appuie sur le graphe de scène et le format de fichier de Pairdraw.

### Document et pages

- `figma.root`
- `figma.currentPage`
- `figma.currentPage.selection`
- `figma.getNodeById(id)`
- `figma.createPage()`

### Création d’objets

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

### Opérations sur l’arbre

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

### Composants

- `figma.createComponentFromNode(node)`
- `figma.combineAsVariants(components, parent)` : les propriétés viennent des noms, comme `State=On, Size=Large`
- Sur un ensemble de composants, `addComponentProperty(name, 'VARIANT', value)` ajoute la valeur au nom de chaque variante et `editComponentProperty(name, { name })` y renomme la propriété, ce que les instances suivent ; renommer une variante met à jour les valeurs de l’ensemble, et `variantProperties` lit les valeurs d’une variante ou d’une instance
- `component.createInstance()`
- `instance.mainComponent`

### Variables

- `figma.variables.getLocalVariables(type?)`, `getVariableById(id)`, `getLocalVariableCollections()`, `getVariableCollectionById(id)` et leurs formes `…Async`
- `figma.variables.createVariableCollection(name)` et `createVariable(name, collection, resolvedType)`, qui initialise chaque mode avec la valeur par défaut de Figma
- `figma.variables.createVariableAlias(variable)` et `setBoundVariableForPaint(paint, 'color', variable)`
- `variable.setValueForMode(modeId, value)`, `valuesByMode`, `resolveForConsumer(node)`, `name`, `description`, `scopes`, `codeSyntax` et `remove()`
- `collection.addMode(name)`, `renameMode(modeId, name)`, `removeMode(modeId)`, `modes`, `defaultModeId`, `variableIds` et `remove()`
- `node.boundVariables`, `node.setBoundVariable(field, variable)`, `node.setExplicitVariableModeForCollection(collection, modeId)` et `node.clearExplicitVariableModeForCollection(collection)`

### Propriétés

Les propriétés courantes des objets sont lisibles et modifiables par le proxy, notamment :

- Géométrie : `x`, `y`, `width`, `height`, `rotation`, `resize(width, height)`
- Apparence : `fills`, `strokes`, `effects`, `opacity`, `visible`, `locked`, `blendMode`, `clipsContent`. Les peintures prennent ici la forme de Figma, de même que les `backgrounds` des pages, les plages de texte et les régions vectorielles : une `color` unie est en RGB avec son alpha dans `opacity`, et une image indique `scaleMode`, `rotation` et `scalingFactor` ; une peinture que Figma refuse lève le message de Figma
- Rayon : `cornerRadius`, `topLeftRadius`, `topRightRadius`, `bottomRightRadius`, `bottomLeftRadius`
- Texte : `characters`, `fontSize`, `fontName` (avec `variationSettings`, chaque axe d’une police variable), `fontWeight` (l’axe `wght` d’une police variable), `fills`, `letterSpacing`, `lineHeight` et `textDecoration`, qui valent `figma.mixed` lorsque les caractères diffèrent et restylent chaque caractère quand on les définit, ainsi que l’alignement
- Plages de texte : `getStyledTextSegments(fields, start?, end?)`, et `getRange…` / `setRange…` pour `FontSize`, `FontName`, `Fills`, `LetterSpacing`, `LineHeight`, `TextDecoration` avec ses `Style`, `Offset`, `Thickness`, `Color` et `SkipInk`, `TextCase`, `Hyperlink` (un lien `{ type: 'URL' | 'NODE', value }`, ou `null`), `TextStyleId` et `FillStyleId` (définis avec `setRangeTextStyleIdAsync` et `setRangeFillStyleIdAsync`, qui donnent à la plage les champs du style), et `getRangeBoundVariable` / `setRangeBoundVariable` pour les champs de texte que Figma lie, ainsi que `getRangeFontWeight`, `getRangeAllFontNames` et `getRangeOpenTypeFeatures`. L’interligne et l’approche gardent l’unité dans laquelle on les définit, pixels ou pourcentage de la taille de police qui suit la taille, comme dans Figma ; les autres longueurs se lisent en pixels, et un pourcentage passé à leurs fonctions de définition s’entend par rapport à la taille de police
- Listes et paragraphes de texte : `getRangeListOptions` / `setRangeListOptions` pour les éléments à puces (`UNORDERED`) et numérotés (`ORDERED`), `getRangeIndentation` / `setRangeIndentation` pour l’imbrication (1 à 5 pour les éléments de liste), `listSpacing`, `paragraphSpacing` et `paragraphIndent` pour tout le texte (`figma.mixed` lorsque les paragraphes diffèrent) ou par paragraphe avec `getRangeListSpacing` / `setRangeListSpacing`, `getRangeParagraphSpacing` / `setRangeParagraphSpacing` et `getRangeParagraphIndent` / `setRangeParagraphIndent`, ainsi que `hangingList`
- Auto layout : `layoutMode`, `primaryAxisAlignItems`, `counterAxisAlignItems`, `itemSpacing`, marges intérieures, dimensionnement et champs de positionnement dans la disposition
- Contours : `strokeWeight`, `strokeAlign`, `dashPattern`
- Statut : `devStatus` sur les sections, cadres, composants, ensembles de composants et instances placés directement sur une page ou dans une section, sous la forme `{ type: 'READY_FOR_DEV' | 'COMPLETED' }` ou `null` (une description n’est pas conservée) ; il vaut `null` tant que le calque se trouve à un endroit où il ne peut pas en afficher

### Utilitaires

- `figma.mixed`
- `figma.util.rgb(color)`, `figma.util.rgba(color, alphaOverride?)` et `figma.util.solidPaint(color, overrides?)` lisent une couleur hexadécimale ou une chaîne de couleur CSS (`rgb()`, `hsl()`, `lab()`, `oklab()`, `oklch()`, `color(display-p3 …)` ou un nom), ramenée dans sRGB, ou un objet `{ r, g, b, a? }` dont les canaux vont de 0 à 1 ; `solidPaint` prend sa couleur et son opacité dans `color` et ses autres propriétés dans `overrides`, par exemple une peinture existante
- `figma.createImage(data)` accepte un PNG, JPEG ou GIF jusqu’à 4096 pixels de côté et renvoie l’`Image` de Figma : son `hash`, `getBytesAsync()` et `getSizeAsync()` ; `figma.getImageByHash(hash)` restitue une image enregistrée
- `figma.createImageAsync(url)` charge une URL `http(s)://` ou une URI de données. L’application de bureau passe par son proxy natif, comme Figma passe par ses serveurs ; dans le navigateur, l’hôte de l’image doit autoriser les requêtes cross-origin
- `figma.loadFontAsync(fontName)` charge la police pour que le texte soit mesuré et dessiné avec elle ; une famille nommée sans style charge tous ses styles, et une famille variable aussi ses styles nommés. Une police qui ne peut pas être chargée est rejetée avec le message de Figma `The font "Family Style" could not be loaded`
- Comme dans Figma, une modification qui remet le texte en page lève `Cannot write to node with unloaded font` tant que toutes les polices du texte ne sont pas chargées : `characters`, `insertCharacters`, `deleteCharacters`, `fontSize`, espacements, casse, décoration, alignement, `textAutoResize`, troncature et les méthodes `setRange…` correspondantes. Un nouveau `fontName` doit aussi être chargé, mais il remplace celui du texte, si bien qu’un texte dans une police manquante peut en recevoir une chargée. Les peintures, les liens, la taille et les transformations n’ont besoin d’aucune police
- `figma.getFontFamilyVariationAxes(family)` liste les balises d’axes d’une famille variable, ou renvoie `null` pour une famille statique ; contrairement à Figma, la famille doit d’abord être chargée
- Une police définie avec `variationSettings` et sans style, par `fontName` ou `setRangeFontName`, prend le style nommé le plus proche, et un axe absent de la famille lève l’erreur de Figma
- `figma.listAvailableFontsAsync()` renvoie les polices fournies par l’hôte lorsqu’elles sont disponibles
- `figma.getNodeByIdAsync(id)` et `instance.getMainComponentAsync()` renvoient les mêmes objets que `figma.getNodeById(id)` et `instance.mainComponent`, pour les scripts écrits pour le mode de pages dynamiques de Figma
- `figma.setCurrentPageAsync(page)` change de page comme le fait l’affectation de `figma.currentPage`, et `page.loadAsync()` se résout aussitôt car toutes les pages sont déjà chargées, pour les scripts écrits pour le mode de pages dynamiques de Figma
- `figma.notify(message)` consigne un avertissement en mode sans interface
- `figma.closePlugin(message?)` et `figma.loadAllPagesAsync()` permettent d’exécuter un script écrit comme plugin Figma : rien n’a besoin d’être fermé ni chargé, et `closePlugin` transmet son message à `figma.notify`. Figma refuse tout appel après `closePlugin`, alors qu’ici le script continue de s’exécuter ; faites-le donc suivre de `return`, comme le fait la documentation de Figma
- `instance.swapComponent(component)` fait pointer une instance vers un autre composant
- Un calque à l’intérieur d’une instance refuse `x`, `y`, `rotation`, `relativeTransform`, `constraints`, `isMask` et `maskType` avec l’erreur de Figma, par exemple `in set_x: This property cannot be overridden in an instance: relative-transform` ; ces propriétés suivent toujours le composant. Le contenu d’un emplacement les conserve, et en définir une sur le contenu par défaut d’un emplacement donne à l’instance la propriété de cet emplacement
- `component.createSlot()` ajoute un cadre d’emplacement et sa propriété `SLOT` ; les cadres d’emplacement ont `type: 'SLOT'`, `resetSlot()` rétablit le contenu du composant dans l’emplacement d’une instance, et `limitViolations` liste les limites qu’enfreint l’emplacement d’une instance. `addComponentProperty` et `editComponentProperty` acceptent une `description` et, pour les emplacements, `slotSettings`
- `figma.viewport`

## Pas encore compatible avec Figma

Ces API de Figma ne sont pas encore exposées sous forme de fonctions compatibles :

- `node.exportAsync()`
- `figma.util.normalizeMarkdown()`, qui échoue parce que Pairdraw n’a ni descriptions en texte riche ni annotations à normaliser
- Variables de bibliothèque, collections étendues et liaisons de variables sur les effets et les grilles de disposition
- API de styles de Figma comme `figma.createPaintStyle()` / `figma.createTextStyle()`
- Parité complète des opérations booléennes vectorielles

Utilisez à la place les commandes d’export de la CLI Pairdraw, les outils du noyau ou les fonctions directes du graphe de scène lorsqu’elles existent.
