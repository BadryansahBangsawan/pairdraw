---
title: Esportare
description: Esportare il contenuto dei documenti in immagini, PDF, PowerPoint, draw.io, `.fig`, JSX, HTML o storie Storybook, con regole di sostituzione dei font per l'output raster e PDF.
---

# Esportare

Esporta i design dal terminale: immagini raster, grafica vettoriale, PDF, PowerPoint modificabile, diagrammi draw.io, sottoinsiemi `.fig`, codice JSX, HTML o storie Storybook.

L'app nelle build di Pairdraw non offre più l'esportazione in PowerPoint e draw.io; la CLI continua a scrivere entrambi i formati.

## Esportare immagini

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

Opzioni:

- `-f`: formato, tra `png`, `jpg`, `webp`, `svg`, `pdf`, `pptx`, `drawio`, `jsx`, `tailwind-jsx`, `html`, `fig`, `storybook`
- `-s`: scala dell'esportazione (predefinita: `1`)
- `-q`: qualità da `0` a `100` (solo JPG/WEBP)
- `-o`: percorso di output
- `--page`: nome della pagina
- `--node`: ID di un nodo specifico

La CLI segnala formati errati, nodi mancanti e percorsi non validi invece di produrre risultati parziali in silenzio. Consulta `pairdraw export --help` per tutti i formati e le opzioni.

## Regole di sostituzione dei font {#font-substitution-policy}

Per le esportazioni PNG, JPG, WEBP e PDF basate su file, e per `pairdraw convert`, scegli come gestire i font mancanti o sostituiti:

```sh
pairdraw export design.fig -f pdf --font-policy strict
pairdraw export design.fig -f png --font-policy warn
pairdraw export design.fig -f webp --font-policy allow
pairdraw convert design.pen --font-policy strict
```

- `warn` (predefinita): segnala le sostituzioni e prosegue con l'esportazione.
- `strict`: si interrompe con uno stato di uscita diverso da zero se la preparazione dei font non riesce a risolvere fedelmente gli stili richiesti.
- `allow`: esporta senza il controllo aggiuntivo sulla fedeltà dei font.

Esegui prima [`pairdraw fonts`](./inspecting#font-diagnostics) per esaminare gli stili interessati. La preparazione dell'esportazione può usare i fornitori di font configurati, quindi il suo risultato può differire dalla diagnostica offline del file.

`convert` carica i font per i file `.pen`, draw.io e Mermaid, che memorizzano l'intento del layout invece delle dimensioni: prima di scriverli li dispone di nuovo, misurando il testo con i loro font, quindi `strict` lo ferma prima che venga scritto qualsiasi cosa. Un diagramma di flusso Mermaid (`.mmd` o `.mermaid`) viene disposto durante la lettura, con il testo misurato nei font con cui è disegnato.

Queste regole non si applicano alle esportazioni dall'app in esecuzione, né alle esportazioni SVG, PowerPoint, JSX, HTML e `.fig`. Controllano la risoluzione dei font, non l'equivalenza visiva completa con Figma.

## Esportare JSX

Esporta in JSX con classi di utilità Tailwind:

```sh
pairdraw export design.fig -f tailwind-jsx    # or: -f jsx --style tailwind
```

Output:

```html
<div className="flex flex-col gap-4 p-6 bg-white rounded-xl">
  <p className="text-2xl font-bold text-[#1D1B20]">Card Title</p>
  <p className="text-sm text-[#49454F]">Description text</p>
</div>
```

È supportato anche `--style pairdraw` per il formato JSX nativo (vedi [Renderer JSX](../jsx-renderer)).

## Esportare HTML

Esporta un frammento HTML, con stili inline per impostazione predefinita oppure con classi di utilità Tailwind:

```sh
pairdraw export design.fig -f html
pairdraw export design.fig -f html --css tailwind
```

Usa `--html standalone` per un documento HTML apribile nel browser, con stili di reset e un contenitore di pagina. L'HTML autonomo è pensato come utile consegna visiva e di codice, non come sostituto identico al pixel del renderer:

```sh
pairdraw export design.fig -f html --html standalone --css inline
pairdraw export design.fig -f html --html standalone --css tailwind
pairdraw export design.fig -f html --html standalone --css tailwind --assets external
```

L'output Tailwind autonomo viene compilato durante l'esportazione e non dipende dal runtime di Tailwind nel browser. Usa `--assets external` per scrivere il CSS e le immagini estratte accanto al file HTML. Usa `--fonts assets` insieme agli asset esterni per risolvere i font di testo rilevati nello SceneGraph tramite i fornitori di web font configurati in Pairdraw ed emettere file `@font-face` locali.

L'esportazione HTML scrive il nome di ogni livello nell'attributo `data-name`. `--no-layer-names` omette i nomi e `--layer-ids` aggiunge l'ID di ogni livello come `data-pairdraw-node-id`, per gli strumenti che collegano il markup al documento.

L'esportazione HTML è disponibile in modalità file.

### Token nel codice esportato

HTML e Tailwind JSX scrivono le proprietà collegate a variabili come i token di design da cui provengono: un riempimento collegato a `Primary` diventa `background-color: var(--color-primary)` e, in Tailwind, `bg-primary`, oppure `bg-(--name)` per un token fuori dai namespace di Tailwind. Un livello impostato su un'altra modalità riceve l'attributo di quella modalità, come `data-theme="dark"`, così i token si risolvono come li disegna l'area di lavoro.

Un valore resta letterale dove il CSS non lo riprodurrebbe: il livello non disegna più il valore della variabile, il token è senza unità dove serve una lunghezza, oppure il livello si trova in una modalità che può essere selezionata solo dalla propria condizione, come una query `@media`. L'HTML autonomo include il foglio di stile per i token che usa; per frammenti e JSX generalo con `pairdraw tokens` (vedi sotto).

## Token di design

Scrivi le variabili del documento come proprietà personalizzate CSS:

```sh
pairdraw tokens design.fig > tokens.css
pairdraw tokens design.fig --format tailwind > theme.css
pairdraw tokens design.fig --collection Theme --type COLOR
```

La modalità predefinita di ogni raccolta va in `:root`. Ogni altra modalità sovrascrive i valori che cambiano sotto la sua condizione: `[data-theme="dark"]` per la modalità Dark di una raccolta Theme, oppure il selettore o la query `@media` indicati dalla modalità. Gli alias restano riferimenti `var()` e vengono dichiarati di nuovo in ogni modalità che cambia ciò a cui puntano, quindi impostare `data-theme` su un elemento qualsiasi cambia lo stile di tutto ciò che vi è costruito sopra.

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

`--format tailwind` mette in `@theme` i token con un namespace di Tailwind v4 (`--color-*`, `--spacing-*`, `--radius-*`, `--text-*`, …), così `bg-primary` e `rounded-card` funzionano, e aggiunge un `@custom-variant` per ogni modalità, così `dark:bg-surface` segue la stessa condizione. Importa il file dopo `@import "tailwindcss";`. I nomi derivano dalla sintassi del codice della variabile quando questa indica una proprietà personalizzata (`--x` o `var(--x)`), altrimenti dal nome e dal tipo: `Blue/500` come colore diventa `--color-blue-500`.

I token che non possono essere scritti, come le variabili booleane o una condizione che non è un selettore o una query, vengono elencati su stderr e omessi. Il comando funziona in modalità file e sull'app in esecuzione.

### Token di design W3C

`--format dtcg` scrive variabili e stili come [token di design W3C](https://www.designtokens.org/tr/2025.10/format/) in una cartella:

```sh
pairdraw tokens design.fig --format dtcg --out tokens
```

Ogni modalità di una raccolta è un file, `Theme/Light.tokens.json` e `Theme/Dark.tokens.json`, nella forma che Figma importa come modalità: lunghezze in `px`, tempi in `s`, booleani come numeri contrassegnati con `com.figma.type` e alias verso un'altra raccolta che la indicano in `com.figma.aliasData`. Gli stili di testo e di effetto diventano token di tipografia e di ombra in `styles.tokens.json`, tenuti separati perché l'importazione di Figma rifiuta i token compositi. `tokens.resolver.json` è un resolver DTCG che cambia le modalità di ogni raccolta e sovrappone le altre, per strumenti come Style Dictionary. I campi propri di Pairdraw, come l'unità `rem` di un token, il nome CSS, gli ambiti o un'espressione `clamp()`, e la condizione di ogni modalità, viaggiano in `$extensions["dev.pairdraw"]`, così l'esportazione si rilegge esattamente.

Importa i file di token in un documento con lo strumento `import_design_tokens`, passando percorso e testo di ogni file:

```sh
pairdraw tool call import_design_tokens design.fig --args-file tokens.json --write
```

Legge un file per modalità raggruppato per cartella, un resolver con i file a cui fa riferimento oppure un file Tokens Studio con `$themes`. Raccolte e modalità con nomi già esistenti, e variabili e stili con lo stesso nome, vengono aggiornati; il resto viene aggiunto e nulla viene eliminato. Il risultato elenca ciò che è stato aggiunto, aggiornato e saltato, con il motivo di ogni elemento saltato.

## Esportare per Storybook

Genera un file CSF3 `.stories.ts` per ogni set di componenti o componente:

```sh
pairdraw export design.fig -f storybook                      # React stories in ./design-stories/
pairdraw export design.fig -f storybook --framework vue -o src/stories
pairdraw export design.fig -f storybook --css tailwind     # components styled with Tailwind
pairdraw export design.fig -f storybook --framework html --page "Components"
pairdraw export design.pen -f storybook -o src/stories --watch  # re-export on every save
pairdraw export 'src/**/*.pen' -f storybook --beside --watch    # stories next to each design
pairdraw export design.fig -f storybook --rules stories.json    # stories and titles by rule
```

### Meno storie nella barra laterale

Ogni file di storie si apre con una storia `Default`, la variante che il design mostra a riposo, con tutti i controlli. Ogni altra storia di variante o di stato è contrassegnata con il tag `variant`, e ogni file con i tag `pairdraw` e `page:<page>`, come `page:icons`. Il filtro della barra laterale di Storybook seleziona in base a questi tag, e `.storybook/main.ts` può stabilire cosa mostrare per impostazione predefinita, per esempio una storia per componente e nessuna pagina di icone:

```ts
const config: StorybookConfig = {
  // …
  tags: {
    variant: { defaultFilterSelection: 'exclude' },
    'page:icons': { excludeFromSidebar: true }
  }
}
```

### Storie e titoli tramite regole

Ciò che i tag non possono fare, come escludere componenti o disporre un set di icone come galleria, lo decide un file di regole. L'esportazione legge `pairdraw.stories.json` dalla cartella di lavoro se esiste, oppure il file indicato da `--rules`, di nuovo a ogni esportazione durante l'osservazione:

```json
{
  "rules": [
    { "match": "**", "title": "Design system/{page}/{name}" },
    { "match": "Icons/**", "stories": "gallery" },
    { "match": "**/_*", "stories": "none" }
  ]
}
```

Una regola si applica a ogni file di storie il cui percorso `<page>/<name>` corrisponde al suo glob, in base ai nomi nel documento: quello della pagina e quello del set di componenti o del componente, oppure il prefisso dei componenti con nomi separati da barre, come `Icons/icon`. Tutte le regole corrispondenti si applicano in ordine, quindi una regola successiva sovrascrive una precedente, campo per campo. `generate: false` mantiene storie statiche in un'esportazione Vue o React dove verrebbe generato un componente, per esempio per un set di icone. `stories` può essere `variants`, una storia per variante o stato, come senza regole; `single`, la sola storia `Default`; `gallery`, `Default` più una storia `Gallery` che dispone ogni variante con il suo nome, per le storie statiche; oppure `none`, che esclude il file. `title` è il titolo del file, in cui vengono sostituiti `{document}`, `{page}`, `{name}` e `{path}`, il titolo che avrebbe altrimenti; i titoli che risultano uguali vengono tenuti distinti come avviene sempre. Le regole corrispondono ai nomi del documento, mai a un titolo rinominato, quindi rinominare un file non cambia mai quali regole gli si applicano.

### Design accanto alle storie

Tieni il file di design di ogni componente nella cartella del componente ed esporta con `--beside`: storie, immagini del design e manifest `.pairdraw-stories.json` di ciascun documento finiscono nella cartella del documento stesso, accanto al codice del componente. Un glob `stories` di Storybook come `../src/**/*.stories.ts` in `.storybook/main.ts` le raccoglie senza altra configurazione.

Puoi passare più documenti, oppure un glob tra apici come `'src/**/*.pen'` che Pairdraw espande da solo (Node.js 22 o successivo). Più documenti richiedono `--beside` oppure `--output`; `--page` funziona solo con un documento. I documenti vengono esportati uno dopo l'altro e, se uno fallisce, gli altri vengono comunque esportati prima che il comando termini con un errore. `--watch` osserva tutti i documenti trovati; un documento creato dopo l'avvio dell'osservazione richiede una nuova esecuzione.

Le storie prendono il titolo dal nome del file del documento e poi dalla pagina, quando più di una pagina contiene componenti: `pricing.fig` dà `pricing/Plan picker`, così i documenti esportati insieme tengono separate le loro storie. Ogni variante di un set di componenti diventa una storia e le sue proprietà di variante diventano controlli `select`, quindi cambiando un controllo si vede la variante corrispondente. Un set con un comportamento riceve invece le prop del controllo: uno Switch o una Checkbox un booleano `checked`, un Toggle `pressed`, un Collapsible `open` e `disabled` quando il set disegna uno stato disabilitato; hover, pressed e focus restano storie a sé. I componenti singoli con nomi separati da barre, come `Button/Primary` e `Button/Secondary`, sono raggruppati in un unico file `Button` con un controllo `Variant`. Una combinazione per cui il design non ha una variante genera in Storybook un errore con nome invece di mostrare un'altra variante.

Le storie disegnano il componente come HTML con stili inline, come `-f html`, quindi non richiedono il runtime di Pairdraw; `--framework` (`react`, `vue` o `html`) cambia solo il wrapper e l'import di `Meta`/`StoryObj` da `@storybook/react-vite`, `@storybook/vue3-vite` o `@storybook/html-vite`. Il testo usa le famiglie di font del documento: l'esportazione ne scarica i file dai fornitori di web font usati dall'editor in `pairdraw/<document>/`, con un `fonts.css` importato da ogni file di storie, così le storie vengono disegnate con quei font e mai prima con un font di ripiego. Lì finiscono anche le variabili di design del documento, come proprietà personalizzate in un `tokens.css` importato da ogni file di storie, così gli stili collegati a variabili si risolvono come li disegna il design. Una famiglia che nessun fornitore offre, come Menlo, ripiega sui font del browser, e l'esportazione lo segnala con un avviso; `--fonts none` non include file di font. Le storie statiche non esportano ancora le proprietà di testo, booleane e di sostituzione dell'istanza.

Con `--framework vue` o `--framework react`, ogni set di componenti e ogni componente singolo diventa invece un componente vero, `<Name>.vue` o `<Name>.tsx` con un `<Name>.module.css` (con `--css tailwind`, utilità Tailwind nel markup e stati come varianti del tipo `data-[state=checked]:`, per un progetto che compila Tailwind v4), tranne i componenti con nomi separati da barre raggruppati in un unico file e quelli per cui una regola imposta `"generate": false`, che mantengono storie statiche. Un componente senza comportamento è fatto degli elementi stessi del design: la sua radice è l'elemento che il design disegna, un `div` per un frame, e accetta le prop proprie dell'elemento radice, come `onClick` e `class`. Le sue proprietà di variante sono prop che imposta come attributi `data-*`, quindi una variante `State=hover` è una prop come le altre; le sue proprietà booleane sono prop booleane che mostrano o nascondono i livelli collegati; e le sue proprietà slot sono contenuti che mostra al posto di quelli del design, uno `<slot>` con nome in Vue e una prop `ReactNode` in React, con il contenuto del design come ripiego. Un componente il cui comportamento è un Button, Switch, Checkbox, Toggle, Collapsible, Tabs, Radio group, Toggle group, Accordion, Slider, Progress, Number field, Text field o Textarea è costruito su Reka UI o sul pacchetto `radix-ui` di Radix UI, e i suoi stati di interazione, come hover e disabilitato, diventano veri stili `:hover` e `data-disabled`. Le sue varianti sono compilate in un foglio di stile basato sugli stati impostati da Reka e Radix (`data-state`, `data-disabled`, hover e focus), e ogni altra proprietà di variante è una prop che il componente imposta come attributo `data-*`. In Vue il suo valore è un `v-model` come `checked` o `open`; in React il componente accetta le prop della radice di Radix, come `checked`, `defaultChecked` e `onCheckedChange`. Le sue proprietà di testo sono prop stringa, con le parole del design come valore predefinito, disegnate dai livelli collegati, con un controllo di testo nelle storie.

Le Tabs ricevono la scheda aperta come `value` (`v-model:value`, oppure `defaultValue` e `onValueChange` in React), identificata dallo slug delle parole di ogni trigger, come `account` o `password`, e partono dalla prima; ogni trigger e il relativo pannello sono le parti `Tabs` di Reka o Radix attorno ai livelli del design, ogni trigger è disegnato come gli altri trigger del design e prende l'aspetto del primo trigger mentre la sua scheda è attiva, e le storie ricevono un controllo `select` e una storia per scheda. Un Radio group, Toggle group o Accordion genera due componenti: il gruppo, che sceglie un elemento allo stesso modo partendo da quello che il design mostra attivo, e `<Group>Item`, ricavato dal set di componenti dei suoi elementi, costruito come primitiva dell'elemento del gruppo (`RadioGroupItem`, `ToggleGroupItem` o `AccordionItem` con il trigger in un'intestazione) e con il `value` che rappresenta. Il gruppo lo usa una volta per elemento nel proprio slot degli elementi, con il valore di ciascun elemento, ricavato dalla sua proprietà etichetta o altrimenti dalle sue parole, e con i suoi valori di testo. Uno Slider, Progress o Number field collega il proprio numero come `value` (`v-model:value`, oppure `defaultValue` in React, una lista per lo slider di Radix), entro l'intervallo stabilito dal comportamento, partendo dal valore del design; l'intervallo e il cursore dello slider e l'indicatore di avanzamento lasciano perdere la posizione in cui il design li disegna, perché la determina il valore, e le storie ricevono un controllo di intervallo e una storia per ciascun estremo. Un Text field o una Textarea disegna il proprio livello di testo come `input` o `textarea` nativo collegato a `value`, che in React accetta le prop del componente; quando il design disegna il campo pieno e vuoto, le parole del campo vuoto diventano il segnaposto e il suo aspetto quello del segnaposto, mentre l'aspetto pieno compare quando il campo contiene testo. In Vue il number field di Reka UI disegna input e pulsanti di incremento; Radix non ne ha uno, quindi in React è un input numerico nativo, i cui pulsanti lo cambiano di un passo e che si riporta nell'intervallo quando perde il focus. Il focus sul cursore di uno slider o sull'input di un campo disegna lo stato di focus del controllo. Un Radio viene generato solo come elemento di un gruppo; un Toggle o un Collapsible usati da soli diventano comunque un componente a sé.

All'interno di un componente generato, un'istanza di un altro componente generato nella stessa esportazione usa quel componente invece di disegnarne i livelli: `<Switch>` importato da `./Switch.vue` o `./Switch`, impostato sui valori di variante, testo e `disabled` che l'istanza mostra. Un controllo che il design mostra attivo, come uno switch attivato, parte attivo e resta utilizzabile: un `ref` locale collegato con `v-model` in Vue, `defaultChecked` in React. Il genitore si limita a posizionarlo, così il controllo mantiene il proprio aspetto e i propri stili di stato. Usa il componente solo un'istanza che viene disegnata esattamente come la sua variante, a parte i valori delle proprietà e la posizione in cui la colloca il genitore; un'istanza con testo modificato non impostato da alcuna proprietà, un riempimento proprio o altre modifiche disegna i propri livelli, così la storia conserva ciò che il design mostra. Le istanze di componenti non esportati, o esportati solo come storie statiche, vengono disegnate come prima. Una proprietà di variante il cui valore predefinito il documento lascia vuoto parte dalla variante predefinita, quella nell'angolo in alto a sinistra del set, che apre le sue storie. Un'icona inserita da un set, a meno che i suoi tracciati non siano stati modificati, è il componente di Iconify, `<Icon icon="lucide:bell">` da `@iconify/vue` o `@iconify/react`, che carica l'icona quando viene mostrata.

Un livello riempito con uno shader lo riproduce dietro il proprio contenuto con il `<Shader>` della libreria `shaders`, da `shaders/vue` o `shaders/react`, con ogni effetto come figlio con le prop della preimpostazione e la telemetria disattivata (`disableTelemetry`); i browser senza WebGPU non mostrano nulla al suo posto.

Le sue storie disegnano il componente e una funzione play fa clic sul controllo e ne verifica lo stato, quindi il progetto Storybook ha bisogno di `reka-ui` o `radix-ui` installati, di `@iconify/vue` o `@iconify/react` quando i componenti contengono icone e di `shaders` quando i livelli sono riempiti con shader.

Le storie includono voci `parameters.design` per [`@storybook/addon-designs`](https://github.com/storybookjs/addon-designs):

- **Pairdraw:** quando il percorso del documento è dentro la cartella corrente, un [link `pairdraw://`](../index#url-scheme) che apre il documento nell'app desktop e seleziona la variante, o il suo set di componenti se un altro livello ha lo stesso nome della variante. Lo schema indirizza i livelli per nome, quindi una storia i cui nomi di variante e di componente sono entrambi condivisi con altri livelli non ottiene alcun link.
- **Design:** un PNG 2× della variante, scritto in `<Name>.design/` accanto alla storia e referenziato con `new URL(…, import.meta.url)`, così Vite lo include nel bundle. Copia il parametro sulla storia del tuo componente per confrontare l'implementazione con il design. `--no-design-images` salta il rendering; la sostituzione dei font segue `--font-policy` come nell'esportazione raster.

`-o` indica la cartella di output. Un manifest `.pairdraw-stories.json` registra, con un percorso relativo alla cartella di output, quale documento e quale pagina hanno generato ogni storia e immagine; includilo nel commit insieme alle storie. Un'esportazione sostituisce i file generati da una precedente esportazione dello stesso documento, compresi quelli di componenti nel frattempo eliminati o rinominati; con `--page`, solo quelli di quella pagina. Prima di modificare qualsiasi cosa, rifiuta di sovrascrivere qualunque altro file: una storia scritta a mano, quella di un altro documento o un'immagine estranea. Un'esportazione di una sola pagina i cui nomi di file sono slittati su storie di un'altra pagina richiede invece un'esportazione completa. Senza il manifest, le storie esistenti sono considerate di qualcun altro, quindi rimuovile prima di esportare di nuovo. `--watch` mantiene il comando in esecuzione e riesporta a ogni salvataggio del documento, così l'hot reload di Storybook segue il design; un salvataggio che non può essere letto viene segnalato e l'osservazione continua. Una `--page` mancante o una sostituzione con `--font-policy strict` terminano comunque il comando.

## Modalità app in esecuzione

Ometti il file per esportare dall'app in esecuzione:

```sh
pairdraw export -f png                       # export the selection in the active document
pairdraw export --page "Components" -f png   # export every layer of a page
pairdraw export --node 1:23 -f png           # export one layer, on any page
```

`--page` accetta il nome di una pagina e `--page-id` l'ID di una pagina da `pairdraw documents list`; entrambi esportano quella pagina senza portare l'app su di essa. Aggiungi `--document-id` per esportare da un documento diverso da quello attivo.

La modalità app supporta PNG, JPG, WEBP, SVG e PDF. Le esportazioni PowerPoint, JSX, HTML, Storybook e `.fig` richiedono un file come argomento. L'esportazione di miniature in modalità file non è attualmente supportata.
