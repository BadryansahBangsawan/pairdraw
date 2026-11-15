---
title: Selezionare e trasformare
description: Selezionare, spostare, ridimensionare, ruotare, duplicare e ordinare gli oggetti.
---

# Selezionare e trasformare

Seleziona gli oggetti per spostarli, ridimensionarli, ruotarli, duplicarli e organizzarli nell’area di lavoro.

## Selezione

- Un **clic** su un oggetto lo seleziona e sostituisce la selezione corrente. Come in Figma, un clic dentro un frame di primo livello seleziona un figlio diretto di quel frame, come un frame annidato o un gruppo, invece del livello più profondo; fai clic su un frame di primo livello dal suo titolo, in qualsiasi punto se è vuoto, o sui suoi spazi e margini interni se ha l’auto layout.
- **Passa con il puntatore** su un frame con auto layout per vedere i suoi figli diretti delineati da linee tratteggiate; con un solo livello selezionato, il bordo del suo genitore con auto layout è tratteggiato.
- Un **doppio clic** scende di un livello, così come un nuovo clic dentro un frame, componente o istanza selezionati; una volta selezionato un livello, i clic raggiungono direttamente i suoi fratelli e cugini.
- <kbd>⌘</kbd> + clic (<kbd>Ctrl</kbd> + clic su Windows e Linux) seleziona il livello più profondo sotto il cursore; tenendo premuto <kbd>⌘</kbd>, quel livello viene evidenziato prima del clic.
- <kbd>Shift</kbd> + clic aggiunge o rimuove un oggetto dalla selezione. Un livello e il suo genitore o figlio non sono mai selezionati insieme, quindi Shift + clic su uno sostituisce l’altro.
- **Fai doppio clic sul nome di un frame o componente** sopra di esso nell’area di lavoro per rinominarlo sul posto.
- **Selezione rettangolare**: trascina in un’area libera per disegnare un rettangolo di selezione; gli oggetti che interseca vengono selezionati al rilascio. Se parte dentro un frame di primo livello senza auto layout o dentro una sezione, seleziona i livelli di quel contenitore; dalla pagina, un frame o una sezione che contiene livelli viene selezionato solo se racchiuso interamente.
- <kbd>⌘</kbd> + trascinamento (<kbd>Ctrl</kbd> + trascinamento su Windows e Linux) crea una selezione rettangolare che seleziona i livelli annidati più profondi che tocca. Parte dove parte una selezione rettangolare normale: sulla tela vuota o sullo sfondo vuoto di un frame di primo livello o di una sezione. Su un livello o sullo sfondo di un frame, componente o istanza annidati, <kbd>⌘</kbd> + trascinamento seleziona quel livello e lo sposta. Premi o rilascia <kbd>⌘</kbd> durante il trascinamento per passare dalla selezione profonda a quella normale.
- <kbd>⌘</kbd><kbd>A</kbd> seleziona tutti gli oggetti della pagina corrente.
- <kbd>Enter</kbd> seleziona i figli dei livelli selezionati; su un vettore modifica il tracciato e su un testo modifica il testo.
- <kbd>Shift</kbd> + <kbd>Enter</kbd> o <kbd>\\</kbd> seleziona il genitore dei livelli selezionati.
- <kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> seleziona il fratello successivo o precedente, scendendo o salendo nel pannello dei livelli e ricominciando dall’altra estremità.
- Un clic su un’area libera annulla la selezione.

## Spostare

- Trascina un oggetto selezionato per spostarlo (tutti gli oggetti selezionati si spostano insieme).
- Le frecce spostano dello spostamento piccolo, 1 px di predefinito.
- <kbd>Shift</kbd> + frecce spostano dello spostamento grande, 10 px di predefinito.

Imposta entrambe le distanze in **Impostazioni → Editor → Spostamento con le frecce**.

## Ridimensionare

La selezione mostra otto maniglie (4 angoli e 4 punti centrali dei lati). Trascinane una per ridimensionare.

- <kbd>Shift</kbd> + trascinamento di una maniglia angolare conserva le proporzioni.

## Strumento Scala

Premi <kbd>K</kbd>, o scegli **Ridimensiona in scala** nel menu dello strumento Sposta, per ridimensionare i livelli con tutto il loro contenuto: dimensioni del testo, tratti, effetti, raggi degli angoli e spaziature del layout automatico crescono e diminuiscono con il livello, come con lo strumento Scala di Figma. Trascina una maniglia della selezione per scalare dal lato opposto, oppure tieni premuto <kbd>Option</kbd>/<kbd>Alt</kbd> per scalare dal centro; più livelli selezionati scalano insieme attorno al loro riquadro comune.

Con lo strumento attivo, il pannello Design mostra larghezza e altezza della selezione, un fattore di scala e una griglia di ancoraggio. Digitando una larghezza o un’altezza la selezione scala in proporzione; il fattore accetta `2`, `2x` o `200%`. La griglia di ancoraggio sceglie il punto che resta fermo. Ogni ridimensionamento è un solo passaggio di annullamento.

## Entrare e uscire dai frame

Un oggetto trascinato finisce nel frame sotto il cursore quando lo rilasci, per quanto poco ne stia dentro, ed esce dal suo frame appena ne esce il cursore. I gruppi e i frame bloccati non accolgono mai oggetti rilasciati, e un set di componenti riaccoglie solo le proprie varianti; un oggetto dentro un gruppo vi resta finché non lo rilasci su un altro frame, e il gruppo si ridimensiona per adattarsi a ciò che contiene. Un gruppo da cui esce l’ultimo oggetto viene rimosso. Premere dentro un frame, gruppo o set di componenti selezionato trascina quest’ultimo invece dell’oggetto sotto il cursore.

- <kbd>Shift</kbd> + trascinamento blocca lo spostamento su un asse.
- Tieni premuto <kbd>Space</kbd> durante il trascinamento per lasciare gli oggetti nei loro genitori attuali.
- <kbd>⌃</kbd> + trascinamento (<kbd>Ctrl</kbd> + trascinamento su Windows e Linux) disattiva l’aggancio; rilasciato in un frame con auto layout, l’oggetto viene posizionato in modo assoluto.

Gli oggetti bloccati in una selezione restano fermi quando il resto si sposta.

## Ruotare

Porta il puntatore poco oltre una maniglia angolare finché compare il cursore di rotazione, quindi trascina.

- <kbd>Shift</kbd> + trascinamento allinea la rotazione a intervalli di 15°.

## Duplicare

- <kbd>Alt</kbd> + trascinamento (<kbd>⌥</kbd> + trascinamento su Mac) duplica l’oggetto selezionato e sposta la copia.
- <kbd>⌘</kbd><kbd>D</kbd> duplica nella stessa posizione; la copia di un frame di primo livello isolato, sulla pagina o in una sezione, va nel primo spazio libero alla sua destra.

I duplicati mantengono il loro nome. Duplicare così un componente principale crea una sua istanza.

## Incollare

<kbd>⌘</kbd><kbd>V</kbd> mantiene la posizione copiata. Incollati in un frame selezionato, gli oggetti mantengono la distanza dal frame da cui sono stati copiati e vengono centrati su ogni asse in cui non entrano; gli oggetti che finirebbero fuori dalla vista vengono centrati in essa. Usa **Incolla qui** nel [menu contestuale](./context-menu) per incollare nella posizione del cursore.

## Eliminare

Premi <kbd>Backspace</kbd> o <kbd>Delete</kbd> per rimuovere tutti gli oggetti selezionati.

## Ordine

Cambia l’ordine di sovrapposizione degli oggetti dentro il loro genitore:

- **]** porta in primo piano (in cima all’elenco dei fratelli); <kbd>⌘</kbd><kbd>]</kbd> o <kbd>Ctrl</kbd><kbd>]</kbd> avanza di un livello.
- **[** manda sullo sfondo (in fondo all’elenco dei fratelli); <kbd>⌘</kbd><kbd>[</kbd> o <kbd>Ctrl</kbd><kbd>[</kbd> arretra di un livello.

## Visibilità e blocco

- <kbd>⇧</kbd><kbd>⌘</kbd><kbd>H</kbd> cambia la visibilità. Gli oggetti nascosti non vengono disegnati ma restano nel pannello dei livelli.
- <kbd>⇧</kbd><kbd>⌘</kbd><kbd>L</kbd> cambia il blocco. Gli oggetti bloccati non possono essere selezionati né spostati nell’area di lavoro.

## Spostare in un’altra pagina

Sposta gli oggetti selezionati in un’altra pagina dal [menu contestuale](./context-menu). Gli oggetti diventano figli della tela della pagina di destinazione.

## Modificare più livelli

Con più livelli selezionati, il pannello delle proprietà mostra ciò che hanno in comune e indica **Misto** dove differiscono; una modifica li cambia tutti in un solo passaggio di annullamento.

- **Layout** mostra le loro dimensioni, il ridimensionamento del testo quando è selezionato del testo, il flusso quando tutti i livelli sono frame e il ritaglio del contenuto per i frame tra di essi. Quando i livelli formano una sola riga o colonna, **Spaziatura** mostra lo spazio tra di loro; digitando un valore li distanzia in modo uniforme a partire dal primo livello.
- **Tipografia** compare ogni volta che è selezionato del testo e cambia solo il testo.
- **Contorno** mostra il contorno dei livelli che ne hanno uno; modificarlo applica il contorno a tutti i livelli selezionati.
- **Colori della selezione** elenca tutti i colori di riempimento e contorno della selezione, anche dentro frame e gruppi, dal più usato. Cambiarne uno lo ricolora ovunque sia usato.

## Sezioni

Una sezione adotta gli oggetti allo stesso livello che copre interamente quando la disegni, la sposti o la ridimensioni sopra di essi.

## Scorciatoie da tastiera

| Azione | macOS | Windows / Linux |
|--------|-------|-----------------|
| Seleziona tutto | <kbd>⌘</kbd><kbd>A</kbd> | <kbd>Ctrl</kbd> + <kbd>A</kbd> |
| Duplica | <kbd>⌘</kbd><kbd>D</kbd> | <kbd>Ctrl</kbd> + <kbd>D</kbd> |
| Duplica e sposta | <kbd>⌥</kbd> + trascina | <kbd>Alt</kbd> + trascina |
| Strumento Scala | <kbd>K</kbd> | <kbd>K</kbd> |
| Sposta su un asse | <kbd>⇧</kbd> + trascina | <kbd>Shift</kbd> + trascina |
| Mantieni il genitore attuale | <kbd>Space</kbd> durante il trascinamento | <kbd>Space</kbd> durante il trascinamento |
| Sposta senza aggancio | <kbd>⌃</kbd> + trascina | <kbd>Ctrl</kbd> + trascina |
| Elimina | <kbd>⌫</kbd> / Delete | <kbd>Backspace</kbd> / Delete |
| Sposta di 1 px | Tasti freccia | Tasti freccia |
| Sposta di 10 px | <kbd>⇧</kbd> + tasti freccia | <kbd>Shift</kbd> + tasti freccia |
| Porta in primo piano | ] | ] |
| Manda sullo sfondo | [ | [ |
| Cambia visibilità | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>H</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>H</kbd> |
| Cambia blocco | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>L</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>L</kbd> |

## Suggerimenti

- Usa il pannello [Livelli e pagine](./layers-and-pages) per vedere e riordinare gli oggetti quando si sovrappongono.
- Vedi [Menu contestuale](./context-menu) per altre azioni, come raggruppare e creare componenti.
