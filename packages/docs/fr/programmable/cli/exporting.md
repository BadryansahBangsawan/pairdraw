---
title: Exporter avec la CLI
description: Exporter le contenu d’un document en images, PDF, PowerPoint, draw.io, `.fig`, JSX, HTML ou stories Storybook, avec des règles de substitution de polices pour les sorties raster et PDF.
---

# Exporter avec la CLI

Exportez des designs depuis le terminal : images raster, vecteurs, PDF, PowerPoint modifiable, diagrammes draw.io, sous-ensembles `.fig`, code JSX, HTML ou stories Storybook.

L’application des versions de Pairdraw ne propose plus l’export PowerPoint ni draw.io ; la CLI écrit toujours ces deux formats.

## Export d’images

```sh
pairdraw export design.fig                           # PNG (default)
pairdraw export design.fig -f jpg -s 2 -q 90        # JPG at 2×, quality 90
pairdraw export design.fig -f webp -s 3             # WEBP at 3×
pairdraw export design.fig -f svg                   # SVG vector
pairdraw export design.fig -f pdf                   # PDF
pairdraw export design.fig -f pptx                  # editable PowerPoint
pairdraw export design.fig -f drawio                # draw.io diagram
pairdraw export design.fig -f fig --page "Page 1"   # export one page as .fig
pairdraw export design.fig -f fig --node 1:23        # export one node as .fig
pairdraw export design.fig -f html --css tailwind    # export an HTML fragment with Tailwind classes
```

Options :

- `-f` : format, parmi `png`, `jpg`, `webp`, `svg`, `pdf`, `pptx`, `drawio`, `jsx`, `tailwind-jsx`, `html`, `fig`, `storybook`
- `-s` : échelle d’export (par défaut : `1`)
- `-q` : qualité, de `0` à `100` (JPG et WEBP uniquement)
- `-o` : chemin de sortie
- `--page` : nom de la page
- `--node` : identifiant d’un objet précis

## Règles de substitution de polices {#font-substitution-policy}

Pour les exports PNG, JPG, WEBP et PDF à partir d’un fichier, ainsi que pour `pairdraw convert`, choisissez comment traiter les polices manquantes ou remplacées :

```sh
pairdraw export design.fig -f pdf --font-policy strict
pairdraw export design.fig -f png --font-policy warn
pairdraw export design.fig -f webp --font-policy allow
pairdraw convert design.pen --font-policy strict
```

- `warn` (par défaut) : signale les substitutions et poursuit l’export.
- `strict` : s’arrête avec un code de sortie non nul si la préparation des polices ne peut pas résoudre fidèlement les styles demandés.
- `allow` : exporte sans la vérification supplémentaire de fidélité des polices.

Lancez d’abord [`pairdraw fonts`](./inspecting#font-diagnostics) pour examiner les styles concernés. La préparation de l’export peut faire appel aux fournisseurs de polices configurés ; son résultat peut donc différer du diagnostic hors ligne du fichier.

`convert` charge les polices des fichiers `.pen`, draw.io et Mermaid, qui enregistrent une intention de disposition plutôt que des tailles : il les remet en page, avec leur texte mesuré dans leurs propres polices, avant d’écrire ; `strict` l’arrête donc avant que quoi que ce soit ne soit écrit. Un organigramme Mermaid (`.mmd` ou `.mermaid`) est mis en page à la lecture, son texte étant mesuré dans les polices avec lesquelles il est dessiné.

Ces règles ne s’appliquent ni aux exports depuis l’application en cours d’exécution, ni aux exports SVG, PowerPoint, JSX, HTML et `.fig`. Elles vérifient la résolution des polices, pas une équivalence visuelle complète avec Figma.

## Export JSX

Exportez en JSX avec des classes utilitaires Tailwind :

```sh
pairdraw export design.fig -f tailwind-jsx    # or: -f jsx --style tailwind
```

Résultat :

```html
<div className="flex flex-col gap-4 p-6 bg-white rounded-xl">
  <p className="text-2xl font-bold text-[#1D1B20]">Card Title</p>
  <p className="text-sm text-[#49454F]">Description text</p>
</div>
```

`--style pairdraw` produit aussi le format JSX natif (voir [Moteur JSX](../jsx-renderer)).

## Export HTML

Exportez un fragment HTML avec des styles en ligne par défaut, ou avec des classes utilitaires Tailwind :

```sh
pairdraw export design.fig -f html
pairdraw export design.fig -f html --css tailwind
```

Utilisez `--html standalone` pour obtenir un document HTML ouvrable dans un navigateur, avec des styles de réinitialisation et une enveloppe de page. Le HTML autonome sert à la transmission visuelle et au code ; il ne remplace pas un moteur de rendu au pixel près :

```sh
pairdraw export design.fig -f html --html standalone --css inline
pairdraw export design.fig -f html --html standalone --css tailwind
pairdraw export design.fig -f html --html standalone --css tailwind --assets external
```

La sortie Tailwind autonome est compilée pendant l’export ; elle ne dépend pas du runtime Tailwind dans le navigateur. Utilisez `--assets external` pour écrire le CSS et les images extraites à côté du fichier HTML. Utilisez `--fonts assets` avec les ressources externes pour résoudre les polices de texte détectées dans SceneGraph par les fournisseurs de polices web configurés dans Pairdraw et produire des fichiers `@font-face` locaux.

L’export HTML écrit le nom de chaque calque dans l’attribut `data-name`. `--no-layer-names` omet les noms et `--layer-ids` ajoute l’ID de chaque calque en `data-pairdraw-node-id` pour les outils qui relient le balisage au document.

Une taille de police que Tailwind ne nomme pas comme palier (comme 40px ou 28px) s’exporte en valeur arbitraire, `text-[40px]`, plutôt qu’en un utilitaire comme `text-10` qu’aucune feuille de style ne génère. Les paliers nommés et les tailles liées à des tokens gardent leur classe.

L’export HTML est disponible en mode fichier.

### Tokens dans le code exporté

HTML et JSX Tailwind écrivent les propriétés liées à des variables sous la forme des design tokens dont elles proviennent : un remplissage lié à `Primary` devient `background-color: var(--color-primary)`, et en Tailwind `bg-primary`, ou `bg-(--name)` pour un token hors des espaces de noms de Tailwind. Un calque réglé sur un autre mode reçoit l’attribut de ce mode, par exemple `data-theme="dark"`, pour que les tokens se résolvent comme le canevas les dessine.

Une valeur reste littérale là où CSS ne la reproduirait pas : le calque ne dessine plus la valeur de la variable, le token est sans unité là où une longueur est attendue, ou le calque se trouve dans un mode que seule sa propre condition, comme une requête `@media`, peut sélectionner. Le HTML autonome inclut la feuille de style des tokens qu’il utilise ; pour les fragments et le JSX, générez-la avec `pairdraw tokens` (ci-dessous).

## Design tokens

Écrivez les variables du document sous forme de propriétés personnalisées CSS :

```sh
pairdraw tokens design.fig > tokens.css
pairdraw tokens design.fig --format tailwind > theme.css
pairdraw tokens design.fig --collection Theme --type COLOR
```

Le mode par défaut de chaque collection va dans `:root`. Chaque autre mode remplace les valeurs qui diffèrent sous sa condition : `[data-theme="dark"]` pour le mode Dark d’une collection Theme, ou le sélecteur ou la requête `@media` que le mode indique. Les alias restent des références `var()` et sont redéclarés dans chaque mode qui change leur cible ; basculer `data-theme` sur n’importe quel élément restyle ainsi tout ce qui s’appuie dessus.

```css
:root {
  --color-blue-500: #3b82f5;
  --color-primary: var(--color-blue-500);
}

/* Theme: Dark */
[data-theme='dark'] {
  --color-primary: var(--color-blue-300);
}
```

`--format tailwind` place les tokens qui ont un espace de noms Tailwind v4 (`--color-*`, `--spacing-*`, `--radius-*`, `--text-*`, …) dans `@theme`, pour que `bg-primary` et `rounded-card` fonctionnent, et ajoute un `@custom-variant` par mode, pour que `dark:bg-surface` suive la même condition. Importez le fichier après `@import "tailwindcss";`. Les noms viennent de la syntaxe de code de la variable lorsqu’elle désigne une propriété personnalisée (`--x` ou `var(--x)`), sinon de son nom et de son type : `Blue/500` en couleur devient `--color-blue-500`.

Les tokens qui ne peuvent pas être écrits, comme les variables booléennes ou une condition qui n’est ni un sélecteur ni une requête, sont listés sur stderr et laissés de côté. La commande fonctionne en mode fichier et sur l’application en cours d’exécution.

### Design tokens W3C

`--format dtcg` écrit les variables et les styles sous forme de [design tokens W3C](https://www.designtokens.org/tr/2025.10/format/) dans un dossier :

```sh
pairdraw tokens design.fig --format dtcg --out tokens
```

Chaque mode de collection forme un fichier, `Theme/Light.tokens.json` et `Theme/Dark.tokens.json`, dans la forme que Figma importe comme mode : longueurs en `px`, durées en `s`, booléens sous forme de nombres marqués `com.figma.type`, et alias vers une autre collection qui la nomment dans `com.figma.aliasData`. Les styles de texte et d’effet deviennent des tokens de typographie et d’ombre dans `styles.tokens.json`, tenus à part parce que l’import de Figma refuse les tokens composites. `tokens.resolver.json` est un résolveur DTCG qui bascule les modes de chaque collection et superpose le reste, pour des outils comme Style Dictionary. Les champs propres à Pairdraw, comme l’unité `rem` d’un token, son nom CSS, ses portées ou son expression `clamp()`, ainsi que la condition de chaque mode, sont transportés dans `$extensions["dev.pairdraw"]`, si bien que l’export se relit à l’identique.

Importez des fichiers de tokens dans un document avec l’outil `import_design_tokens`, en lui passant le chemin et le texte de chaque fichier :

```sh
jq -Rs --arg p tokens/Tokens/Default.tokens.json '{files:[{path:$p,text:.}]}' \
  tokens/Tokens/Default.tokens.json > args.json
pairdraw tool call import_design_tokens design.fig --args-file args.json --write
```

Il lit un fichier par mode regroupés par dossier, un résolveur avec les fichiers qu’il référence, ou un fichier Tokens Studio avec `$themes`. Les collections et modes dont le nom existe déjà, ainsi que les variables et styles de même nom, sont mis à jour ; le reste est ajouté, et rien n’est supprimé. Le résultat liste ce qui a été ajouté, mis à jour et ignoré, avec la raison de chaque élément ignoré.

## Export Storybook

Générez un fichier CSF3 `.stories.ts` par ensemble de composants ou par composant :

```sh
pairdraw export design.fig -f storybook                      # React stories in ./design-stories/
pairdraw export design.fig -f storybook --framework vue -o src/stories
pairdraw export design.fig -f storybook --css tailwind     # components styled with Tailwind
pairdraw export design.fig -f storybook --framework html --page "Components"
pairdraw export design.pen -f storybook -o src/stories --watch  # re-export on every save
pairdraw export 'src/**/*.pen' -f storybook --beside --watch    # stories next to each design
pairdraw export design.fig -f storybook --rules stories.json    # stories and titles by rule
```

### Moins de stories dans la barre latérale

Chaque fichier de stories commence par une story `Default`, la variante que le design montre au repos, avec tous les contrôles. Toutes les autres stories de variante ou d’état portent le tag `variant`, et chaque fichier porte les tags `pairdraw` et `page:<page>`, par exemple `page:icons`. Le filtre de la barre latérale de Storybook sélectionne par ces tags, et `.storybook/main.ts` peut définir ce qu’il affiche par défaut, par exemple une story par composant et pas de page d’icônes :

```ts
const config: StorybookConfig = {
  // …
  tags: {
    variant: { defaultFilterSelection: 'exclude' },
    'page:icons': { excludeFromSidebar: true }
  }
}
```

### Stories et titres par règles

Ce que les tags ne permettent pas, comme écarter des composants ou présenter un jeu d’icônes en galerie, un fichier de règles le décide. L’export lit `pairdraw.stories.json` dans le répertoire de travail s’il existe, ou le fichier indiqué par `--rules`, et le relit à chaque export en mode surveillance :

```json
{
  "rules": [
    { "match": "**", "title": "Design system/{page}/{name}" },
    { "match": "Icons/**", "stories": "gallery" },
    { "match": "**/_*", "stories": "none" }
  ]
}
```

Une règle s’applique à chaque fichier de stories dont le chemin `<page>/<name>` correspond à son glob, d’après les noms du document : celui de la page, et celui de l’ensemble de composants ou du composant, ou le préfixe des composants nommés avec des barres obliques, comme `Icons/icon`. Toutes les règles correspondantes s’appliquent dans l’ordre : une règle ultérieure remplace une règle antérieure, champ par champ. `generate: false` conserve des stories statiques pour un export Vue ou React là où il générerait un composant, par exemple pour un jeu d’icônes. `stories` vaut `variants`, une story par variante ou état, comme sans règles ; `single`, la story `Default` seule ; `gallery`, `Default` et une story `Gallery` qui présente chaque variante avec son nom, pour les stories statiques ; ou `none`, qui écarte le fichier. `title` est le titre du fichier, où `{document}`, `{page}`, `{name}` et `{path}`, le titre qu’il aurait eu, sont remplacés ; les titres qui finissent identiques sont distingués comme d’habitude. Les règles portent sur les noms du document, jamais sur un titre renommé : renommer un fichier ne change donc jamais les règles qui s’y appliquent.

### Designs à côté de leurs stories

Gardez le fichier de design de chaque composant dans le dossier du composant et exportez avec `--beside` : les stories, les images de design et le manifeste `.pairdraw-stories.json` de chaque document vont dans le dossier de ce document, à côté du code du composant. Un glob `stories` de Storybook tel que `../src/**/*.stories.ts` dans `.storybook/main.ts` les prend alors en compte sans autre configuration.

Passez plusieurs documents, ou un glob entre guillemets tel que `'src/**/*.pen'` que Pairdraw développe lui-même (Node.js 22 ou version ultérieure). Plusieurs documents nécessitent `--beside` ou `--output` ; `--page` ne fonctionne qu’avec un seul document. Les documents sont exportés l’un après l’autre, et lorsqu’un export échoue, les autres sont tout de même exportés avant que la commande ne se termine par une erreur. `--watch` surveille tous les documents correspondants ; un document créé après le début de la surveillance nécessite une nouvelle exécution.

Les stories sont intitulées d’après le nom de fichier du document, puis d’après la page quand plusieurs pages contiennent des composants : `pricing.fig` donne `pricing/Plan picker`, si bien que des documents exportés ensemble gardent leurs stories séparées. Chaque variante d’un ensemble de composants devient une story, et ses propriétés de variante deviennent des contrôles `select` : changer un contrôle affiche la variante correspondante. Un ensemble doté d’un comportement reçoit plutôt les props propres au contrôle : un Switch ou une Checkbox a un booléen `checked`, un Toggle `pressed`, un Collapsible `open`, et `disabled` quand l’ensemble dessine un état désactivé ; le survol, l’appui et le focus restent des stories distinctes. Les composants autonomes dont le nom contient des barres obliques, comme `Button/Primary` et `Button/Secondary`, sont regroupés dans un seul fichier `Button` avec un contrôle `Variant`. Une combinaison pour laquelle le design n’a pas de variante déclenche dans Storybook une erreur nommée au lieu d’afficher une autre variante.

Les stories affichent le composant en HTML avec des styles en ligne, comme `-f html`, et n’ont donc besoin d’aucun runtime Pairdraw ; `--framework` (`react`, `vue` ou `html`) ne change que l’enveloppe et l’import de `Meta`/`StoryObj` depuis `@storybook/react-vite`, `@storybook/vue3-vite` ou `@storybook/html-vite`. Le texte utilise les familles de polices du document : l’export récupère leurs fichiers auprès des fournisseurs de polices web qu’utilise l’éditeur et les place dans `pairdraw/<document>/` avec un `fonts.css` que chaque fichier de stories importe ; les stories s’affichent ainsi dans ces polices, jamais d’abord dans une police de secours. Les variables de design du document y vont aussi, sous forme de propriétés personnalisées dans un `tokens.css` que chaque fichier de stories importe, pour que les styles liés à des variables se résolvent comme le design les dessine. Une famille qu’aucun fournisseur ne propose, comme Menlo, se rabat sur les polices du navigateur, ce que l’export signale ; `--fonts none` ne fournit aucun fichier de police. Les stories statiques n’exportent pas encore les propriétés de texte, booléennes ni d’échange d’instance.

Avec `--framework vue` ou `--framework react`, chaque ensemble de composants et chaque composant autonome devient plutôt un vrai composant, `<Name>.vue` ou `<Name>.tsx` avec un `<Name>.module.css` (avec `--css tailwind`, des utilitaires Tailwind dans son balisage et ses états sous forme de variantes comme `data-[state=checked]:`, pour un projet qui compile Tailwind v4), sauf les composants nommés avec des barres obliques regroupés dans un même fichier et ceux pour lesquels une règle définit `"generate": false`, qui gardent des stories statiques. Un composant sans comportement reprend les éléments propres au design : sa racine est l’élément que dessine le design, un `div` pour un cadre, et il accepte les props propres à l’élément racine, comme `onClick` et `class`. Ses propriétés de variante sont des props qu’il applique en attributs `data-*`, si bien qu’une variante `State=hover` est une prop comme une autre ; ses propriétés booléennes sont des props booléennes qui affichent ou masquent les calques qui leur sont liés ; et ses propriétés d’emplacement sont du contenu qu’il affiche à la place de celui du design, un `<slot>` nommé en Vue et une prop `ReactNode` en React, avec le contenu du design comme repli. Un composant dont le comportement est un Button, Switch, Checkbox, Toggle, Collapsible, Tabs, Radio group, Toggle group, Accordion, Slider, Progress, Number field, Text field ou Textarea est construit sur Reka UI ou sur le paquet `radix-ui` de Radix UI, et ses états d’interaction, comme le survol et la désactivation, deviennent de vrais styles `:hover` et `data-disabled`. Ses variantes sont compilées dans une feuille de style indexée sur les états que posent Reka et Radix (`data-state`, `data-disabled`, survol et focus), et chaque autre propriété de variante est une prop que le composant applique en attribut `data-*`. En Vue, sa valeur est un `v-model` comme `checked` ou `open` ; en React, le composant accepte les props de la racine Radix, comme `checked`, `defaultChecked` et `onCheckedChange`. Ses propriétés de texte sont des props de type chaîne, avec les mots du design comme valeur par défaut, que dessinent les calques qui leur sont liés, avec un contrôle de texte dans ses stories.

Les Tabs prennent l’onglet ouvert comme `value` (`v-model:value`, ou `defaultValue` et `onValueChange` en React), nommé d’après les mots de chaque déclencheur transformés en slug, comme `account` ou `password`, et commencent sur le premier ; chaque déclencheur et son panneau sont les parties `Tabs` de Reka ou de Radix autour des calques du design, chaque déclencheur étant dessiné comme les autres déclencheurs du design et prenant l’apparence du premier déclencheur tant que son onglet est actif, et les stories reçoivent un contrôle `select` et une story par onglet. Un Radio group, un Toggle group ou un Accordion écrit deux composants : le groupe, qui choisit un élément de la même façon en commençant par celui que le design dessine activé, et `<Group>Item` issu de l’ensemble de composants de ses éléments, construit comme la primitive d’élément du groupe (`RadioGroupItem`, `ToggleGroupItem` ou `AccordionItem` avec son déclencheur dans un en-tête) et qui prend la `value` qu’il représente. Le groupe l’utilise une fois par élément dans son emplacement d’éléments, avec la valeur de chaque élément, nommée d’après sa propriété de libellé ou à défaut ses mots, et ses valeurs de texte. Un Slider, un Progress ou un Number field lie son nombre en `value` (`v-model:value`, ou `defaultValue` en React, une liste pour le slider de Radix), dans la plage que fixe son comportement, en commençant là où commence le design ; la piste et le curseur du slider ainsi que l’indicateur de progression abandonnent la position où le design les dessine, puisque la valeur la fixe, et les stories reçoivent un contrôle de plage et une story à chaque extrémité. Un Text field ou un Textarea dessine son calque de texte comme un `input` ou un `textarea` natif lié à `value`, qui accepte en React les props du composant ; quand le design dessine le champ rempli et vide, les mots du champ vide deviennent le texte indicatif et son apparence celle du texte indicatif, et l’apparence remplie s’affiche tant que le champ contient du texte. Le number field de Reka UI dessine le champ et les boutons d’incrément en Vue ; Radix n’en a pas, si bien que celui de React est un champ numérique natif dont les boutons le modifient d’un pas et qui se ramène dans sa plage quand on le quitte. Le focus sur le curseur d’un slider ou sur le champ de saisie d’un champ dessine l’état de focus du contrôle. Un Radio n’est généré que comme élément d’un groupe ; un Toggle ou un Collapsible utilisé seul devient toujours son propre composant.

Dans un composant généré, une instance d’un autre composant généré dans le même export utilise ce composant au lieu de dessiner ses calques : `<Switch>` importé depuis `./Switch.vue` ou `./Switch`, réglé sur les valeurs de variante, de texte et de `disabled` que montre l’instance. Un contrôle que le design dessine activé, comme un switch coché, démarre activé et reste utilisable : une `ref` locale liée avec `v-model` en Vue, `defaultChecked` en React. Le parent ne fait que le placer, si bien que le contrôle garde sa propre apparence et ses styles d’état. Seule une instance qui se dessine exactement comme sa variante, hormis ses valeurs de propriétés et la position que lui donne son parent, utilise le composant ; une instance dont le texte a été modifié sans propriété, qui a son propre remplissage ou d’autres changements dessine ses propres calques, pour que la story garde ce que montre le design. Les instances de composants non exportés, ou exportés seulement en stories statiques, sont dessinées comme avant. Une propriété de variante dont le document laisse la valeur par défaut vide commence à la variante par défaut, celle du coin supérieur gauche de l’ensemble, qui ouvre ses stories. Une icône placée depuis un jeu, si ses tracés n’ont pas été modifiés, devient le composant d’Iconify, `<Icon icon="lucide:bell">` de `@iconify/vue` ou `@iconify/react`, qui charge l’icône à l’affichage.

Un calque rempli avec un shader le joue derrière son contenu avec le `<Shader>` de la bibliothèque `shaders`, depuis `shaders/vue` ou `shaders/react`, chaque effet étant un enfant avec les props du préréglage et la télémétrie désactivée (`disableTelemetry`) ; les navigateurs sans WebGPU n’affichent rien à sa place.

Ses stories affichent le composant, et une fonction play clique sur le contrôle et vérifie son état ; le projet Storybook a donc besoin de `reka-ui` ou `radix-ui`, de `@iconify/vue` ou `@iconify/react` quand les composants contiennent des icônes, et de `shaders` quand des calques sont remplis avec des shaders.

Les stories comportent des entrées `parameters.design` pour [`@storybook/addon-designs`](https://github.com/storybookjs/addon-designs) :

- **Pairdraw** : lorsque le chemin du document se trouve dans le répertoire courant, un [lien `pairdraw://`](../index#url-scheme) qui ouvre le document dans l’application de bureau et sélectionne la variante, ou son ensemble de composants lorsqu’un autre calque porte le même nom que la variante. Le schéma adresse les calques par nom : une story dont les noms de variante et de composant sont tous deux partagés par d’autres calques n’a donc pas de lien.
- **Design** : un PNG 2× de la variante, écrit dans `<Name>.design/` à côté de la story et référencé avec `new URL(…, import.meta.url)`, de sorte que Vite l’intègre. Copiez le paramètre sur la story de votre propre composant pour comparer l’implémentation au design. `--no-design-images` ignore le rendu ; la substitution de polices suit `--font-policy` comme pour l’export raster.

`-o` désigne le répertoire de sortie. Un manifeste `.pairdraw-stories.json` y indique quel document, sous forme de chemin relatif au répertoire de sortie, et quelle page ont généré chaque story et chaque image de design ; versionnez-le avec les stories. Un export remplace les fichiers générés là par un export précédent du même document, y compris ceux de composants supprimés ou renommés depuis ; avec `--page`, seulement ceux de cette page. Il refuse, avant toute modification, d’écraser un autre fichier : une story écrite à la main, celle d’un autre document ou une image isolée. Un export d’une seule page dont les noms de fichiers se sont décalés sur les stories d’une autre page demande à la place un export complet. Sans le manifeste, les stories existantes sont considérées comme appartenant à quelqu’un d’autre : supprimez-les avant d’exporter de nouveau. `--watch` garde la commande active et réexporte à chaque enregistrement du document, afin que le rechargement à chaud de Storybook suive le design ; un enregistrement illisible est signalé et la surveillance continue. Un `--page` introuvable ou une substitution refusée par `--font-policy strict` met toujours fin à la commande.

## Mode application en direct

Omettez le fichier pour exporter depuis l’application en cours d’exécution :

```sh
pairdraw export -f png                       # export the selection in the active document
pairdraw export --page "Components" -f png   # export every layer of a page
pairdraw export --node 1:23 -f png           # export one layer, on any page
```

`--page` prend un nom de page et `--page-id` un identifiant de page issu de `pairdraw documents list` ; l’un comme l’autre exporte cette page sans y basculer l’application. Ajoutez `--document-id` pour exporter depuis un document autre que le document actif.

Le mode application en direct prend en charge PNG, JPG, WEBP, SVG et PDF. Les exports PowerPoint, JSX, HTML, Storybook et `.fig` nécessitent un fichier en argument. L’export de vignettes en mode fichier n’est pas pris en charge pour l’instant.

Consultez `pairdraw export --help` pour les formats et options de la version installée.
