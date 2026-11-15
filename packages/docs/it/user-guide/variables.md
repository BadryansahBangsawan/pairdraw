---
title: Variabili
description: Variabili di design, raccolte, modalità, formule e collegamenti ai riempimenti in Pairdraw.
---

# Variabili

Le variabili memorizzano token di design riutilizzabili, come colori, spaziature e altre proprietà, che possono essere collegati agli oggetti. Quando cambia il valore di una variabile, si aggiornano tutti gli oggetti che la usano.

## Aprire la finestra delle variabili

Aprila da **Visualizza → Variabili…**, cercando «Variabili» nella palette dei comandi oppure, quando non è selezionato alcun oggetto, dalla sezione Variabili della scheda **Design**. **Espandi**, nell’angolo della finestra, le dà gran parte dello spazio disponibile.

La finestra elenca a sinistra le variabili della raccolta attiva, modifica a destra la variabile selezionata o la raccolta e mostra sotto il foglio di stile che producono. In una finestra stretta o su telefono mostra una modalità alla volta, e una variabile, le impostazioni della raccolta o il foglio di stile si aprono sopra l’elenco con un pulsante per tornare indietro.

## Raccolte

Le variabili sono organizzate in raccolte. In una finestra larga sono elencate in una barra laterale con il numero di variabili di ciascuna; più stretta, diventano schede, oppure un menu su telefono.

- **Cambiare raccolta:** fai clic su di essa nella barra laterale o sulla sua scheda
- **Creare una raccolta:** fai clic su **+** accanto a **Raccolte**, oppure sul pulsante a forma di cartella nella barra degli strumenti (**Crea raccolta**)
- **Rinominare o eliminare:** senza alcuna variabile selezionata, la parte destra modifica la raccolta: cambia il nome, oppure eliminala dal menu **⋯** accanto al nome (**Elimina raccolta**)
- **Attributo di attivazione:** l’attributo che attiva le modalità attivate manualmente, `data-theme` per impostazione predefinita per una raccolta chiamata Theme; scrivi un altro nome, come `data-color-scheme`, per adattarlo a un codice esistente

## Modalità

Ogni raccolta può avere più modalità (per esempio Chiaro e Scuro). Le modalità compaiono come colonne di valori nell’elenco, e una variabile ha un valore per ciascuna modalità. Si gestiscono nelle **Impostazioni della raccolta**:

- **Aggiungere una modalità:** fai clic su **+** accanto a **Modalità**
- **Rinominare:** modifica il nome della modalità
- **Duplicare, impostare come predefinita, eliminare:** usa il menu **⋯** accanto alla modalità (**Duplica modalità**, **Imposta come predefinita**, **Elimina modalità**)

La modalità predefinita è **Sempre attivo** e va in `:root`. Ogni altra modalità ha **Si applica quando**, che indica quando la modalità subentra nel foglio di stile esportato; il CSS che scrive è mostrato sotto:

| Si applica quando | CSS |
| --- | --- |
| **viene attivata manualmente** | l’attributo di attivazione della raccolta con la modalità come valore, come `[data-theme="dark"]` per la modalità Scuro di una raccolta Theme |
| **il sistema è in modalità scura** / **il sistema è in modalità chiara** | `@media (prefers-color-scheme: dark)` / `light` |
| **il contrasto elevato è attivo** | `@media (prefers-contrast: more)` |
| **la riduzione del movimento è attiva** | `@media (prefers-reduced-motion: reduce)` |
| **lo schermo è più stretto di** / **lo schermo è più largo di** una larghezza | `@media (max-width: 640px)` / `min-width` |
| **il contenitore è più stretto di** / **il contenitore è più largo di** una larghezza | `@container (max-width: 640px)` / `min-width` |
| **CSS personalizzato** | qualsiasi selettore, oppure una query `@media`, `@supports` o `@container` |

Sulla tela, un livello mostra una modalità quando lo imposti su di essa, qualunque sia la condizione. Nel codice esportato, una modalità attivata manualmente si attiva aggiungendo il suo attributo a un elemento, quindi i livelli impostati su di essa vengono esportati con quell’attributo. I livelli impostati su una modalità con qualsiasi altra condizione, selettori personalizzati compresi, vengono esportati con valori letterali invece dei token, perché è il foglio di stile, non il livello, a decidere quando quella modalità si applica.

## Gestire le variabili

### Valori con formula

Il campo valore di una variabile numerica accetta un numero, un’altra variabile o una formula. Inizia a scrivere il nome di una variabile e sceglila dall’elenco, oppure scegli **Usa una variabile**: compare come pillola, e il campo mostra il risultato della formula, per esempio `= 16px`. Le pillole sono salvate per ID, quindi rinominare una variabile non rompe la formula. Le variabili vero/falso, di testo e colore mantengono il loro interruttore, campo di testo o selettore colore; scegli **Usa una formula** accanto a uno di essi per scrivere invece una formula.

- I numeri usano `+`, `-`, `*`, `/` e le parentesi: `space/base * 4`.
- I valori vero/falso usano `and`, `or` e `not`, e confrontano numeri con `==`, `!=`, `<`, `<=`, `>` e `>=`: `viewport > 1024 and not loading`. `==` e `!=` confrontano anche il testo.
- Il testo si scrive tra virgolette doppie, e `+` lo unisce ad altro testo, a un numero o a un valore vero/falso: `"Hello, " + name`. `text(count)` scrive un numero come fa Figma, con due decimali se non è intero: `3`, `1.50`.
- `if(condizione, allora, altrimenti)` sceglie tra due numeri, testi, valori vero/falso o colori: `if(compact, 8, 16)`, `if(dark, gray/900, #FFFFFF)`. I colori si scrivono come `#RRGGBB`, o `#RRGGBBAA` con opacità.
- `truthy(valore)` è falso per `0`, il testo vuoto e le parole `false`, `no` e `off`, e vero per tutto il resto, come li legge Figma.
- Variabili sconosciute, riferimenti circolari, tipi misti e divisioni per zero vengono segnalati quando lasci il campo, e il valore salvato resta com’era.

Il risultato segue le modalità delle variabili di ciascun livello e aggiorna i livelli collegati quando cambia una variabile che usa. Le formule usano le unità salvate, quindi le lunghezze sono in pixel. L’elenco mostra il risultato di ogni formula; passa il puntatore sull’icona della formula per leggerla.

Nel foglio di stile, una formula numerica si scrive come `calc()` sulle variabili che usa, per esempio `calc(var(--spacing-md) * 2 - var(--spacing-base))`, e viene dichiarata di nuovo in ogni modalità che ne cambia una. Le formule che usano `if()`, testo o valori vero/falso non hanno una forma CSS e restano fuori dal foglio di stile. Un’**Espressione CSS** sostituisce il valore solo nel CSS. I file di design token contengono il risultato di ogni formula, con la formula sotto `$extensions`. Le formule sopravvivono a copia e incolla, condivisione, annullamento e salvataggi `.fig`, e le espressioni di colore e opacità di Figma mantengono i riferimenti alle variabili.

### Elenco delle variabili

Le variabili sono raggruppate in base alle cartelle nei loro nomi (`Brand/Primary` compare come *Primary* sotto *Brand*), con il nome CSS e un valore per modalità.

- **Creare una variabile:** fai clic su **Crea variabile** (o su **+**) e scegli un tipo; la nuova variabile si apre per la modifica
- **Selezionare:** fai clic su una riga, oppure spostati con le frecce e premi Invio. Maiusc-clic seleziona un intervallo, e Cmd-clic (Ctrl-clic su Windows e Linux) aggiunge o rimuove una riga
- **Filtrare:** digita nella barra di ricerca per filtrare per nome, nome CSS, descrizione o valore, come `--color-brand`, un colore esadecimale o la variabile a cui punta un alias, tollerando gli errori di battitura come la tavolozza dei comandi; fai clic su un gruppo nella barra laterale per mostrare solo quel gruppo e quelli al suo interno, oppure usa il pulsante del filtro (**Filtra per tipo**) per mostrare solo alcuni tipi
- **Rinominare o modificare sul posto:** fai doppio clic su un nome, o su un valore numerico o di testo, nell’elenco
- **Clic destro:** rinomina, duplica (**Duplica**), sposta in un gruppo o in uno nuovo (**Sposta nel gruppo**, **Nuovo gruppo…**) oppure elimina (**Elimina variabili**) le variabili selezionate; anche Delete o Backspace le elimina
- **Riordinare:** trascina una riga; l’ordine viene conservato nel file
- **Più selezionate:** la parte destra le sposta in un gruppo, le duplica o le elimina
- **Annulla e ripeti:** Cmd+Z e Cmd+Maiusc+Z o Cmd+Y (Ctrl su Windows e Linux) funzionano nella finestra come sulla tela, un passaggio per modifica. Invio conferma un campo e torna all’elenco; finché un campo contiene testo non confermato, Cmd+Z annulla la digitazione

La selezione di una variabile permette di modificare:

- **Nome** e **Nome CSS:** lascia vuoto il nome CSS per ricavarlo da nome e ambiti, ad esempio `--color-brand-primary`. Digita il nome senza `--`; un nome che CSS non può usare viene segnalato e non viene salvato
- **Unità:** per i numeri, `px`, `rem`, `%`, `ms`, `s`, `deg` o nessuna; i valori si inseriscono in quell’unità
- **Valore** o **Valori:** uno per modalità; un colore apre il selettore colore. Il pulsante della variabile (**Usa una variabile**) accanto a un valore lo fa puntare a un’altra variabile dello stesso tipo, un alias che segue quella variabile; **Scollega variabile** lo riporta al valore che mostrava
- **Espressione CSS:** per i numeri, scegli **Aggiungi espressione CSS** nel menu **⋯** di un valore per scrivere CSS come `clamp(1rem, 4vw, var(--spacing-md))` al posto del valore, mentre la tela continua a disegnare il valore. I nomi dei token si completano come `var(--name)` e appaiono come pillole, il pulsante della variabile ne inserisce uno, e una funzione non chiusa, un token sconosciuto o un valore che l’unità del token non accetta vengono segnalati quando lasci il campo. L’espressione resta quando il valore passa tra numero, variabile e formula; rimuovila dallo stesso menu (**Rimuovi l’espressione CSS**)
- **Ambiti:** per quali proprietà viene proposta la variabile
- **Descrizione**
- **Nascondi dalla pubblicazione:** i file che usano questo come libreria non vedono la variabile

## Foglio di stile

La parte inferiore della finestra mostra la raccolta attiva come proprietà personalizzate CSS. Il pulsante di copia (**Copia tutte le variabili come CSS**) copia le variabili dell’intero documento come CSS o come tema Tailwind v4 (**Copia tutte le variabili come tema Tailwind**), così gli alias verso altre raccolte vengono risolti.

## Importare ed esportare design token

Variabili e stili passano tra Pairdraw, Figma e il codice come [design token W3C](https://www.designtokens.org/):

- **Esportare:** nel menu di copia del foglio di stile scegli **Esporta come design token**. Lo zip contiene un file per ogni modalità di raccolta, che Figma importa come modalità; gli stili di testo ed effetto come token di tipografia e ombra; e un resolver che li combina per strumenti come Style Dictionary
- **Importare:** fai clic su **Importa design token** nella barra degli strumenti e scegli file di token o uno zip. Funzionano i file di Figma, un resolver con i file che nomina e i temi di Tokens Studio
- **Scegliere la destinazione:** prima che cambi qualcosa, la finestra mostra ogni raccolta e modalità trovata e dove va: in una nuova raccolta o modalità, in una esistente o da nessuna parte. Variabili e stili con lo stesso nome vengono aggiornati e il resto viene aggiunto; nulla viene eliminato. Conta cosa verrà aggiunto, aggiornato e saltato, e spiega perché ogni token saltato è stato escluso
- L’importazione è un solo passaggio: **Annulla** la ritira tutta
- **Riga di comando:** `pairdraw tokens app.fig --import theme.css --write` importa le proprietà personalizzate di un foglio locale senza aprire l’app; `:root` tiene i valori predefiniti e gli altri selettori diventano modalità
- **Cartella del progetto:** `pairdraw tokens app.fig --project ./app --write` importa le variabili CSS di un progetto locale, compreso un `@theme` di Tailwind v4 e la coppia `:root` / `.dark` di shadcn/ui come modalità Light e Dark. Una configurazione JavaScript come `tailwind.config.js` viene segnalata e non eseguita

## Sincronizzare con un foglio di stile

Le proprietà personalizzate di un file CSS diventano variabili, e le variabili ci tornano. Fai clic su **Sincronizza con CSS** nella barra delle variabili:

- **Importa variabili CSS…** legge un file `.css`. `:root`, `html` e il `@theme` di Tailwind contengono i valori predefiniti di ogni raccolta; `[data-theme="dark"]`, una classe come `.dark` e i blocchi `:root` dentro `@media`, `@supports` o `@container` diventano modalità con quella condizione. Colori, lunghezze in `px` o `rem`, durate, numeri, testo tra virgolette ed elenchi di font diventano variabili, `var(--name)` un alias, e `calc()` o `clamp()` mantiene il suo CSS come espressione CSS. La stessa finestra di importazione mostra dove va ogni raccolta e modalità prima che cambi qualcosa
- **Recupera da** rilegge il file collegato e mostra cosa è cambiato. Un foglio di stile esportato dal documento torna sulle stesse variabili e modalità
- **Invia a** scrive le variabili direttamente nel file collegato: i valori cambiati vengono riscritti nella loro notazione, quelli mancanti aggiunti al loro blocco, e commenti, altre regole e proprietà senza variabile restano come sono. Non viene rimosso nulla. Se il browser non può scrivere il file, ne salva una copia
- **Recupera quando il file cambia** importa ogni salvataggio del file collegato, su desktop e nei browser che danno accesso ai file, come un unico passo di annullamento

## Incollare tra documenti

I livelli copiati in un documento aperto e incollati in un altro possono portare con sé le variabili e gli stili che usano. Prima di incollare, una finestra chiede come:

- **Sì, importa** — aggiunge le variabili e gli stili, così i livelli incollati restano collegati
- **Incolla così com’è** — incolla i livelli con i valori che mostravano, senza collegamenti a variabili o stili
- **Usa esistenti** o **Aggiungi rinominati** — quando questo documento ha già una collezione o uno stile con lo stesso nome, scegli per ogni riga: usare quello presente, dove le variabili corrispondono per nome e quelle mancanti vengono aggiunte, oppure aggiungere la copia con un nuovo nome come “Spacing 2”

Incollare è un solo passaggio: **Annulla** rimuove i livelli e tutto ciò che è stato aggiunto. **Incolla proprietà** usa allo stesso modo le collezioni e gli stili con lo stesso nome.

## Collegare le variabili ai riempimenti

Nella sezione Riempimento del pannello delle proprietà, usa il selettore delle variabili per collegare una variabile colore al riempimento di un oggetto.

- **Collegare:** scegli una variabile colore dal selettore. Il riempimento mostra un’etichetta viola con il nome della variabile.
- **Scollegare:** fai clic sul pulsante di scollegamento sull’etichetta per rimuovere il collegamento. Il riempimento torna al valore di colore risolto.

Quando il valore della variabile cambia (o si cambia modalità), tutti i riempimenti collegati si aggiornano automaticamente.

## Suggerimenti

- Usa le raccolte per raggruppare token correlati (per esempio `Primitives` per i colori di base, `Semantic` per gli alias basati sul ruolo e `Spacing` per i valori di layout).
- Le modalità sono utili per cambiare tema: definisci i valori Chiaro e Scuro nella stessa raccolta.
- Le variabili supportano gli alias: una raccolta `Semantic` può fare riferimento a valori di una raccolta `Primitives`.
- Consulta [Disegnare forme](./drawing-shapes) per capire come funzionano i riempimenti e il selettore colore.
