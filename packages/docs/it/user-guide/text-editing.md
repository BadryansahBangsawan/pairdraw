---
title: Modificare testo
description: Creare e modificare testo con formattazione avanzata, font e modifica diretta nell’area di lavoro.
---

# Modificare testo

Crea oggetti di testo e modificali direttamente nell’area di lavoro, con pieno supporto al testo formattato.

## Creare testo

Premi <kbd>T</kbd> per attivare lo strumento Testo, poi fai clic nell’area di lavoro. Appare un oggetto di testo vuoto con il cursore lampeggiante: inizia subito a scrivere.

## Modifica diretta

Fai doppio clic su un oggetto di testo esistente per entrare nella modalità di modifica diretta. Un contorno blu intorno al testo indica la modalità di modifica. Fai clic fuori dall’oggetto di testo per confermare e uscire.

Il testo viene disegnato direttamente nell’area di lavoro; non appare un campo sovrapposto indipendente.

## Spostare il cursore

| Azione | macOS | Windows / Linux |
|--------|-------|-----------------|
| Sinistra / destra | <kbd>←</kbd> / <kbd>→</kbd> | <kbd>←</kbd> / <kbd>→</kbd> |
| Su / giù | <kbd>↑</kbd> / <kbd>↓</kbd> | <kbd>↑</kbd> / <kbd>↓</kbd> |
| Per parola | <kbd>⌥</kbd><kbd>←</kbd> / <kbd>⌥</kbd><kbd>→</kbd> | <kbd>Ctrl</kbd> + <kbd>←</kbd> / <kbd>Ctrl</kbd> + <kbd>→</kbd> |
| Inizio / fine della riga | <kbd>⌘</kbd><kbd>←</kbd> / <kbd>⌘</kbd><kbd>→</kbd> | <kbd>Home</kbd> / <kbd>End</kbd> |

Tieni premuto <kbd>Shift</kbd> con qualsiasi tasto di spostamento per estendere la selezione.

## Selezione

- Un **clic** dentro un oggetto di testo posiziona il cursore.
- **Fai clic e trascina** per selezionare un intervallo di testo.
- Il **doppio clic** su una parola la seleziona.
- Il **triplo clic** seleziona tutto il testo dell’oggetto.

## Formattazione

Applica la formattazione al testo selezionato, o cambia lo stile dell’intero oggetto quando non c’è una selezione.

| Azione | macOS | Windows / Linux |
|--------|-------|-----------------|
| Grassetto | <kbd>⌘</kbd><kbd>B</kbd> | <kbd>Ctrl</kbd> + <kbd>B</kbd> |
| Corsivo | <kbd>⌘</kbd><kbd>I</kbd> | <kbd>Ctrl</kbd> + <kbd>I</kbd> |
| Sottolineato | <kbd>⌘</kbd><kbd>U</kbd> | <kbd>Ctrl</kbd> + <kbd>U</kbd> |

Il barrato si applica con il pulsante **S** nella sezione **Tipografia** del pannello delle proprietà (non ha scorciatoia: <kbd>⌘</kbd><kbd>S</kbd> serve a salvare).

La formattazione si applica carattere per carattere. Quando scrivi tra un tratto in grassetto e uno normale, il nuovo testo eredita lo stile del tratto che lo precede. La formattazione parziale partecipa ad annulla e ripristina.

Anche i pulsanti **B / I / U / S** nella sezione **Tipografia** del pannello delle proprietà applicano la formattazione. Lo stesso pannello modifica famiglia, stile, dimensione, interlinea, spaziatura tra lettere e allineamento.

## Link

Il testo può contenere un collegamento a una pagina web o a un indirizzo email, su tutto il testo o sui caratteri selezionati. Con il livello selezionato, scegli **Aggiungi link** nella sezione **Tipografia** del pannello delle proprietà, in **Testo → Aggiungi link** nella barra dei menu o nel menu contestuale della tela. L’editor dei link si apre sotto il testo: digita un indirizzo (un dominio semplice o `nome@host` riceve il suo `https://` o `mailto:`) e premi <kbd>Enter</kbd> per applicarlo, o <kbd>Escape</kbd> per chiudere senza modifiche. L’editor serve anche a modificare il link in seguito e a rimuoverlo.

⌘-clic (Ctrl-clic su Windows e Linux) su un link nella tela lo apre, così come un clic su di esso nell’anteprima.

## Operazioni di modifica

| Azione | macOS | Windows / Linux |
|--------|-------|-----------------|
| Elimina la parola prima del cursore | <kbd>⌥</kbd><kbd>⌫</kbd> | <kbd>Ctrl</kbd> + <kbd>Backspace</kbd> |
| Elimina fino all’inizio della riga | <kbd>⌘</kbd><kbd>⌫</kbd> | — |
| Taglia | <kbd>⌘</kbd><kbd>X</kbd> | <kbd>Ctrl</kbd> + <kbd>X</kbd> |
| Copia | <kbd>⌘</kbd><kbd>C</kbd> | <kbd>Ctrl</kbd> + <kbd>C</kbd> |
| Incolla | <kbd>⌘</kbd><kbd>V</kbd> | <kbd>Ctrl</kbd> + <kbd>V</kbd> |

## Ridimensionamento e troncamento

Il controllo **Ridimensionamento** nella sezione Layout stabilisce come la casella di testo segue il suo contenuto:

- **Larghezza automatica** — la casella cresce perché ogni riga stia su una sola riga (il ridimensionamento automatico di larghezza e altezza di Figma).
- **Altezza automatica** — la larghezza resta fissa e la casella cresce in altezza quando il testo va a capo.
- **Fisso** — la casella mantiene la dimensione che le dai.

**Troncamento** nella sezione Tipografia taglia il testo che supera la casella: **Puntini finali** aggiunge un’ellissi, e **Righe massime** limita quante righe vengono disegnate prima di troncare. Un testo troncato mantiene la sua casella nella disposizione automatica, così un frame adattato al contenuto si dimensiona a quella casella invece di ridursi a zero.

## Selettore dei font

Apri il selettore dei font nella sezione **Tipografia** del pannello delle proprietà per cambiare la famiglia. Il selettore offre:

- **Filtro di ricerca**: scrivi per restringere l’elenco dei font.
- **Anteprima**: ogni nome di font è scritto nel proprio carattere.
- **Scorrimento virtuale**: gestisce in modo efficiente elenchi di font molto lunghi.
- **Posizione attuale**: all’apertura il font corrente è evidenziato.

## Variabili per la famiglia di caratteri

Una famiglia di caratteri può provenire da una variabile di tipo stringa. Nella sezione **Tipografia**, scegli **Applica variabile alla famiglia di caratteri** accanto alla famiglia e seleziona una variabile il cui valore è il nome di una famiglia di caratteri. Il testo segue allora la variabile: cambiare la modalità della variabile, o il suo valore, cambia la famiglia, e l’editor carica i font della nuova famiglia. Scegliere un font nel selettore stacca la variabile e imposta direttamente quel font.

## Testo su un tracciato

I livelli di testo su tracciato importati da Figma mantengono la disposizione curva dei glifi. Puoi modificarne testo e tipografia, ridimensionarli e selezionarli, e salvare o esportare il risultato conservando la disposizione sul tracciato. Si tratta del supporto per livelli di testo su tracciato già importati, non di uno strumento di disegno per collegare un testo qualsiasi a un nuovo tracciato.

## Peso del font

Cambia il peso del font nella sezione **Tipografia** del pannello delle proprietà. I pesi disponibili dipendono dalla famiglia scelta (per esempio Regular, Medium, Bold, Black).

## Font variabili

Quando il font del testo è variabile, come Inter, la sezione **Tipografia** elenca i suoi assi (peso, dimensione ottica, larghezza e gli altri che il font possiede) con il valore a cui ciascuno è disegnato. Digita o trascina un valore per impostarlo; scegliere un peso, un’inclinazione o una famiglia riporta gli assi a quelli dello stile. La dimensione ottica mostra **Auto** finché segue la dimensione del font; imposta un valore, o scegli **Fisso** nel suo menu, per bloccarla, e **Auto** per farle seguire di nuovo la dimensione.

## Origini dei font

- **Font predefinito**: Inter viene caricato automaticamente.
- **App desktop**: font di sistema più i cataloghi abilitati di Google Fonts, Fontsource, Bunny Fonts e Fontshare.
- **Browser**: i font di sistema sono disponibili in Chrome ed Edge con il permesso di accesso ai font locali. I fornitori abilitati Fontsource, Bunny Fonts e Fontshare possono caricare font online, a seconda dell’accesso alla rete e delle regole CORS del browser; Google Fonts è disattivato nell’app Pairdraw per browser.
- **Font scaricati**: l’app desktop conserva in cache gli stili scaricati per riusarli sullo stesso computer.

Consenti l’accesso ai font di sistema e scegli i fornitori online in **Impostazioni › Font**, che si apre con l’ingranaggio accanto alla famiglia; nell’app desktop gestisce anche i font scaricati e i pacchetti di ripiego.

## Font del documento

Trascina un file TTF, OTF, WOFF o WOFF2 sulla tela per aggiungere la sua famiglia al documento stesso: appare nel selettore dei font, viaggia nel file `.fig` ed è inclusa nelle esportazioni web e Storybook. I font portati dal documento non richiedono installazione né fornitore.

## Font mancanti e sostituzioni

Quando una famiglia o uno stile richiesto non può essere caricato, Pairdraw mostra un avviso sopra l’editor invece di far passare in silenzio il carattere di ripiego per la tipografia originale.

Espandi l’avviso per vedere ogni stile interessato e il suo sostituto attivo. Usa **Seleziona livelli** per trovare tutti gli oggetti di testo interessati, o **Riprova i font** dopo aver cambiato l’accesso alla rete, il permesso per i font locali o le impostazioni dei fornitori. Uno stile può essere sintetizzato da un altro stile caricato della stessa famiglia; una famiglia mancante ripiega su Inter, se disponibile.

## Suggerimenti

- L’elenco dei font viene precaricato all’avvio, così il selettore si apre senza attese.
- L’inserimento tramite IME (cinese, giapponese, coreano) è pienamente supportato.
- La formattazione del testo si conserva quando apri e salvi file `.fig`.
- Vedi [Componenti](./components) per come funzionano le sostituzioni del testo nelle istanze dei componenti.
