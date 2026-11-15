---
title: Esportare
description: Esportare immagini, SVG e sottoinsiemi `.fig`, e aprire documenti `.fig` o `.pen` in Pairdraw.
---

# Esportare

Esporta singoli oggetti come immagini o sottoinsiemi `.fig`, e apri documenti `.fig` o `.pen` completi.

## Esportazione di immagini

Seleziona un oggetto e usa la sezione **Esporta** nel pannello delle proprietà.

### Impostazioni di esportazione

- **Scala**: 0.5×, 0.75×, 1×, 1.5×, 2×, 3× o 4× (nascosta per SVG, perché i vettori non dipendono dalla risoluzione).
- **Formato**: PNG (sfondo trasparente), JPG (sfondo bianco), WEBP (sfondo trasparente), SVG (vettoriale), PDF o HTML.

**File → Esporta selezione…** esporta la selezione in PNG, SVG o `.fig`, e <kbd>⇧</kbd><kbd>⌘</kbd><kbd>E</kbd> la esporta subito in PNG.

L’app non offre l’esportazione in PowerPoint (`.pptx`) né in draw.io. La [CLI](/reference/cli#export) esporta ancora entrambi: `pairdraw export design.fig -f pptx` o `-f drawio`.

Puoi aggiungere più impostazioni di esportazione per esportare lo stesso oggetto in scale o formati diversi in un colpo solo. Un’anteprima dal vivo su sfondo a scacchi mostra cosa verrà esportato e permette di verificare la trasparenza.

### Modi di esportare

| Modo | Mac | Windows / Linux |
|------|-----|-----------------|
| Scorciatoia da tastiera (PNG) | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>E</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>E</kbd> |
| Menu File | **File → Esporta selezione** (PNG, SVG o `.fig`) | **File → Esporta selezione** (PNG, SVG o `.fig`) |
| Pannello delle proprietà | Clic sul pulsante «Esporta» | Clic sul pulsante «Esporta» |

Il file esportato si salva con una finestra nativa (app desktop) o come download del browser.

## HTML, PDF e qualità

- **Le righe JPG e WEBP** hanno un campo qualità da 1 a 100 (90 se non modificato), salvato con il livello.
- **PDF** con più livelli selezionati crea un solo PDF con una pagina per livello, nell’ordine di selezione, ciascuna grande quanto il suo livello.
- **File › Esporta cornici in PDF…** salva le cornici della pagina in un solo PDF, una pagina per cornice nell’ordine dei livelli, ciascuna grande quanto la sua cornice. Contano anche le cornici dentro le sezioni; forme, testi e gruppi sciolti no. Con livelli selezionati, si esportano solo quelli.
- **HTML** scrive il livello come pagina web. Il pulsante delle opzioni accanto al formato sceglie se includere la struttura HTML (una pagina intera o un frammento da incollare in una pagina), lo stile CSS o Tailwind, immagini incorporate o file separati (salvati insieme in un `.zip`) e se scrivere come attributi i nomi dei livelli (`data-name`, attivo per impostazione predefinita) e gli ID dei livelli (`data-pairdraw-node-id`, disattivo per impostazione predefinita). La vista HTML del pannello Codice esporta allo stesso modo, con lo stile che mostra.
- Nel pannello Codice i componenti Vue e React possono prendere le icone da Lucide, Heroicons o Font Awesome invece che da Iconify, e i componenti React anche da React Icons; un’icona che il pacchetto non ha resta su Iconify.

## Copia/Incolla come

Oltre all’esportazione su file, puoi copiare la selezione negli appunti in più formati dal menu contestuale (clic destro → **Copia/Incolla come**):

| Azione | Scorciatoia (Mac) | Scorciatoia (Win/Linux) |
|--------|-------------------|-------------------------|
| Copia come testo | — | — |
| Copia come SVG | — | — |
| Copia come PNG | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>C</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>C</kbd> |
| Copia come JSX | — | — |

- **Copia come testo**: copia il contenuto testuale visibile della selezione.
- **Copia come SVG**: copia la selezione come markup SVG (da incollare in editor di codice, Inkscape e simili).
- **Copia come PNG**: esegue il rendering a 2× e lo copia negli appunti (pronto da incollare in Slack, Notion e simili).
- **Copia come JSX**: copia la rappresentazione Pairdraw JSX (compatibile con `renderJsx()`).

## Operazioni sui file .fig

Pairdraw usa il formato `.fig` per i documenti completi: lo stesso formato binario di Figma.

### Aprire file

| Azione | Mac | Windows / Linux |
|--------|-----|-----------------|
| Aprire un file | <kbd>⌘</kbd><kbd>O</kbd> | <kbd>Ctrl</kbd> + <kbd>O</kbd> |

Si apre una finestra di selezione filtrata sui file `.fig` e `.pen`. Nell’app desktop usa la finestra nativa del sistema operativo.

Puoi anche trascinare sulla finestra un file `.fig`, `.pen` o un altro documento supportato; si apre in una nuova scheda. Immagini e file SVG rilasciati sull’area di lavoro vengono invece inseriti nel documento, e qualsiasi altro file segnala che non può essere aperto.

Un documento `.pen` che importa librerie `.pen` si apre con i componenti di libreria che usa, letti dai file che indica in modo relativo a sé stesso. Nel documento sono componenti di libreria di sola lettura; modificali nella libreria. Un browser non può leggere i file accanto a un documento, quindi lì quei componenti appaiono come segnaposto tratteggiati e un messaggio indica le librerie; apri il file nell’app desktop o nella CLI per caricarle. L’app desktop legge le librerie fino a due cartelle sopra il documento, ma mai dalla tua cartella home o più in alto, né attraverso collegamenti; un file trascinato sulla finestra non ne legge nessuna, quindi aprilo con **File → Apri…**. La CLI legge le librerie dentro la directory di lavoro. Anche i nodi script e browser, che Pairdraw non esegue, si aprono come segnaposto che conservano il loro file di script o l’indirizzo della pagina.

### Salvare file

| Azione | Mac | Windows / Linux |
|--------|-----|-----------------|
| Salva | <kbd>⌘</kbd><kbd>S</kbd> | <kbd>Ctrl</kbd> + <kbd>S</kbd> |
| Salva con nome | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>S</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>S</kbd> |

- **Salva** sovrascrive il file aperto senza finestre di dialogo.
- **Salva con nome…** apre una finestra di salvataggio per scegliere una nuova posizione.

L’app desktop usa finestre native; Chrome ed Edge possono usare la File System Access API; gli altri browser scaricano il file.

I file salvati sono compressi e includono una miniatura per l’anteprima nei gestori di file. Componenti e set di componenti vengono conservati per riaprire il file in Figma.

Senza selezione, la sezione **Documento** del pannello Design imposta quanto comprimere il documento. **Veloce** corrisponde ai salvataggi di Figma. **Ridotta** e **Minima** rendono il file più piccolo e richiedono più tempo per salvare, cosa che si nota soprattutto nei documenti grandi e meno nei file fatti per lo più di immagini. La scelta viene salvata nel file, e Figma apre tutte e tre.

### Compatibilità di andata e ritorno

I file esportati da Pairdraw si aprono in Figma, e viceversa. Il formato `.fig` conserva tutti i tipi di oggetto, le proprietà, i riempimenti, i contorni, gli effetti, i dati vettoriali e le impostazioni di layout.

## Scorciatoie da tastiera

| Azione | Mac | Windows / Linux |
|--------|-----|-----------------|
| Esportare la selezione in PNG | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>E</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>E</kbd> |
| Copia come PNG | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>C</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>C</kbd> |
| Aprire un file | <kbd>⌘</kbd><kbd>O</kbd> | <kbd>Ctrl</kbd> + <kbd>O</kbd> |
| Salva | <kbd>⌘</kbd><kbd>S</kbd> | <kbd>Ctrl</kbd> + <kbd>S</kbd> |
| Salva con nome | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>S</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>S</kbd> |

## Suggerimenti

- Usa la scala 2× o 3× quando esporti per schermi ad alta densità.
- JPG usa sempre uno sfondo bianco: usa PNG o WEBP se ti serve la trasparenza. JPG riduce le dimensioni delle fotografie, WEBP offre una buona compressione per il Web.
- Usa l’esportazione SVG quando ti serve un formato vettoriale da modificare in Illustrator, Inkscape o nel codice; è adatta a icone e codice.
- La miniatura nei file `.fig` esportati abilita l’anteprima nei gestori di file e nel selettore di file di Figma.
