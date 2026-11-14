---
title: Creare un design system
description: Un tutorial passo passo che crea una libreria con Button e Card, con temi, varianti, proprietà dei componenti e slot.
---

# Creare un design system

Questo tutorial crea da zero un piccolo design system: token di colore e dimensione con un tema chiaro e uno scuro, un **Button** con due varianti e una **Card** il cui contenuto e le cui azioni sono slot. Ogni passaggio usa funzioni descritte più in dettaglio in [Variabili](./variables), [Auto layout](./auto-layout) e [Componenti](./components).

[Scarica il file finito](/examples/design-system.fig){download} per confrontarlo con il tuo o per partire da lì. Ha due pagine: **Components** contiene i componenti principali ed **Examples** mostra le stesse card nelle modalità Light e Dark.

## 1. Definire i token

I token sono variabili che ogni componente legge, così un cambio di tema avviene in un solo punto.

1. Apri **Visualizza → Variabili…**.
2. Fai clic su **+** accanto a **Raccolte** e chiama la raccolta `Theme`. Rinomina la sua prima modalità in `Light`, poi fai clic su **+** accanto a **Modalità** e chiama la nuova modalità `Dark`.
3. Fai clic su **Crea variabile**, scegli **Colore** e aggiungi queste variabili con un valore per ogni modalità. Una barra nel nome raggruppa le variabili, quindi `color/primary` appare come *primary* sotto *color*.

   | Variabile | Light | Dark |
   | --- | --- | --- |
   | `color/background` | `#F4F5F7` | `#0F1115` |
   | `color/surface` | `#FFFFFF` | `#1A1D23` |
   | `color/border` | `#E1E4EA` | `#2D323B` |
   | `color/text` | `#191C21` | `#F1F3F6` |
   | `color/text-muted` | `#5A616E` | `#A2A9B5` |
   | `color/primary` | `#3451D1` | `#8098F7` |
   | `color/on-primary` | `#FFFFFF` | `#0D1222` |
   | `color/secondary` | `#E9ECF2` | `#272B33` |

4. Crea una seconda raccolta chiamata `Size` con variabili di tipo **Numero**: `radius/control` = 8, `radius/card` = 12, `space/sm` = 8, `space/md` = 16 e `space/lg` = 24. Le dimensioni non cambiano con il tema, quindi questa raccolta mantiene una sola modalità.

Il foglio di stile sotto l'elenco mostra già il risultato: i valori Light in `:root` e i valori Dark sotto `[data-theme="dark"]`.

## 2. Costruire il Button

1. Rinomina la pagina in `Components`. Disegna un frame, premi <kbd>⇧</kbd><kbd>A</kbd> per dargli l'auto layout e imposta entrambi gli assi su **Adatta al contenuto**.
2. Aggiungi un livello di testo con scritto `Button`, in Inter Medium a 14 px, e chiamalo `Label`.
3. Collega i token. In **Riempimento**, usa **Applica variabile** per collegare il riempimento del frame a `color/primary` e quello del testo a `color/on-primary`. I campi numerici accettano variabili allo stesso modo: collega il raggio degli angoli a `radius/control` e il padding sinistro e destro a `space/md`, e imposta il padding superiore e inferiore a 10.
4. Premi <kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd> (<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>K</kbd>) per trasformarlo in un componente.
5. Fai doppio clic nel componente e seleziona il livello Label. Accanto al suo testo, in **Tipografia**, usa **Applica variabile/proprietà → Crea proprietà…** per creare una proprietà di testo chiamata `Label`. Le istanze ora cambiano l'etichetta senza essere scollegate.
6. Seleziona il componente e fai clic su **Aggiungi variante** nell'intestazione del pannello. Il componente diventa un set con due varianti. In **Proprietà**, rinomina la proprietà di variante in `Variant` e i suoi valori in `Primary` e `Secondary`, poi chiama il set `Button`.
7. Nella variante Secondary, collega il riempimento a `color/secondary` e quello dell'etichetta a `color/text`.
8. Seleziona il set e, in **Comportamento**, fai clic su **+** e scegli **Button**. L'anteprima (<kbd>⌥</kbd><kbd>⌘</kbd><kbd>↩</kbd> / <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>Enter</kbd>) ora lo esegue come un vero pulsante.

## 3. Costruire la Card

1. Disegna un frame largo 320 px, dagli un auto layout verticale e imposta la sua altezza su **Adatta al contenuto**. Collega il padding a `space/lg`, la spaziatura a `space/md`, il raggio a `radius/card`, il riempimento a `color/surface` e un tratto di 1 px a `color/border`.
2. Aggiungi un livello di testo con scritto `Card title`, in Inter Semi Bold a 18 px, e chiamalo `Title`. Collega il suo riempimento a `color/text` e imposta la sua larghezza su **Riempi**.
3. Sotto, aggiungi un frame chiamato `Content` con auto layout verticale, senza riempimento, larghezza **Riempi** e altezza **Adatta al contenuto**. Inserisci un livello di testo, per esempio `Slots hold content that each card chooses for itself.`, in Inter Regular a 14 px, collegato a `color/text-muted`, e chiamalo `Body`.
4. Aggiungi un frame chiamato `Actions` con auto layout orizzontale e una spaziatura collegata a `space/sm`. Trascinaci dentro un Button da **Risorse**.
5. Seleziona il frame esterno e trasformalo in un componente chiamato `Card`. Collega il titolo a una proprietà di testo chiamata `Title`, come per l'etichetta del pulsante.
6. Seleziona il frame `Content` e scegli **Crea slot** dal menu contestuale o dalla sezione **Slot**. Fai lo stesso per `Actions`. Ogni istanza può ora sostituire ciò che contengono questi frame, e il contenuto del componente principale diventa quello predefinito.

Le impostazioni di uno slot lo descrivono, limitano quanti livelli contiene e indicano i componenti preferiti; per esempio `Actions` potrebbe preferire `Button` e contenere al massimo 2 livelli.

## 4. Usare i componenti

1. Aggiungi una pagina chiamata `Examples` e disegna un frame chiamato `Light` con auto layout verticale, padding e spaziatura collegati a `space/lg` e un riempimento collegato a `color/background`.
2. Inserisci due istanze di Card: fai clic destro sulla Card e scegli **Crea istanza**, oppure trascinala da **Risorse**. Imposta la loro proprietà **Title** su `Welcome back` e `Pro plan`.
3. Nella seconda card, seleziona il pulsante nello slot `Actions` ed eliminalo, poi incolla o trascina dentro due istanze di Button: una Secondary con l'etichetta `Not now` e una Primary con `Upgrade`. Modifica il testo del suo slot `Content`. Il contenuto di uno slot appartiene all'istanza e resta quando la Card cambia; **Ripristina slot** nel menu dello slot riporta il contenuto del componente.
4. Duplica il frame `Light` e chiama la copia `Dark`. In **Aspetto**, usa **Applica modalità variabile** per impostare la raccolta `Theme` su `Dark`. Tutti i colori collegati nel frame cambiano, e le card restano collegate ai loro componenti.

Ora modifica un token o un componente principale, per esempio `radius/card` o il padding del Button, e guarda entrambi i frame aggiornarsi.

## 5. Andare oltre

- **Pubblicalo come libreria.** Apri **Risorse → Gestire le librerie → Pubblica libreria** perché altri file possano usare Button e Card e accettare gli aggiornamenti quando li modifichi ([Librerie di componenti](/user-guide/components#component-libraries)).
- **Porta i token nel codice.** `pairdraw tokens design-system.fig` stampa le variabili come proprietà personalizzate CSS, `--format tailwind` come tema Tailwind v4 e `--format dtcg --out tokens/` come file di design token W3C. L'esportazione HTML scrive i valori collegati come riferimenti `var()` alle stesse proprietà ([Esportare](./exporting)).
- **Verificalo.** [Verificare i design](/user-guide/checking-designs) e `pairdraw lint design-system.fig --fix -o fixed.fig` trovano i colori che corrispondono a un token ma non vi sono collegati, e li collegano.
- **Tieni traccia delle modifiche.** Conserva il file in Git e rivedi le modifiche con [`pairdraw diff files`](/it/programmable/cli/git).

## Generare l'esempio con uno script

Il file di esempio è generato da questo script, che usa la stessa [API dei plugin compatibile con Figma](/it/programmable/cli/scripting) di `pairdraw eval`. Eseguilo per creare il file da solo, oppure modificalo per provare i tuoi token:

```sh
echo '{"children":[]}' > empty.pen
pairdraw eval empty.pen --stdin -o design-system.fig < design-system.js
```

<<< @/public/examples/design-system.js
