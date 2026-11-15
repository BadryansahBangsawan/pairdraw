---
title: Modifica vettoriale
description: 'Modificare la geometria di un tracciato vettoriale: punti di ancoraggio, maniglie di Bézier, modificatori e azioni dello strumento Penna in modalità di modifica.'
---

# Modifica vettoriale

La modalità di modifica vettoriale cambia la **geometria** di una curva: posizione dei punti di ancoraggio, forma dei segmenti e maniglie di Bézier. In questa modalità modifichi il tracciato stesso, non le normali trasformazioni dell’oggetto.

## Entrare nella modalità

1. Seleziona un oggetto vettoriale con lo strumento Sposta.
2. **Fai doppio clic sulla curva** o premi <kbd>Enter</kbd>.

La modifica della geometria si attiva per il vettore selezionato.

## Uscire dalla modalità

- Premi <kbd>Escape</kbd>.
- Fai clic su uno spazio vuoto dell’area di lavoro.
- Oppure passa a un altro contesto di modifica.

## Cosa cambia in questa modalità

- Il normale riquadro di trasformazione dell’oggetto è disattivato.
- Diventa possibile modificare punti di ancoraggio, segmenti e maniglie.
- Sugli angoli del riquadro del livello il cursore non diventa di ridimensionamento o rotazione; lo diventa sul riquadro di trasformazione dei punti selezionati (vedi [Trasformare i punti selezionati](#trasformare-i-punti-selezionati)).

## Azioni di base

### Spostare un punto di ancoraggio

- Trascina un punto di ancoraggio.
- I segmenti collegati e la forma del tracciato si aggiornano in anteprima durante il movimento.

Fai clic su un punto per selezionarlo; <kbd>Shift</kbd> + clic lo aggiunge alla selezione o lo rimuove.

### Modificare una maniglia di Bézier

- Trascina una maniglia del punto di ancoraggio.
- Per impostazione predefinita il comportamento segue la composizione attuale delle maniglie di quel punto.

### Selezionare e spostare un segmento

- Fai clic su un segmento per selezionarlo. Il segmento diventa blu e mostra un pomello al centro; i suoi punti di ancoraggio restano non selezionati.
- <kbd>Shift</kbd> + clic aggiunge un segmento alla selezione, o rimuove un segmento già selezionato.
- Trascina un segmento per spostare i due punti che collega, insieme al resto della selezione.

### Selezionare con un rettangolo

- Trascina su uno spazio vuoto per selezionare i punti di ancoraggio dentro il rettangolo e i segmenti tra di essi.
- <kbd>Shift</kbd> + trascinamento li aggiunge alla selezione.

### Selezionare una regione

- Muovi il puntatore dentro un’area riempita: la regione sotto il puntatore viene tratteggiata con linee diagonali.
- Fai clic al suo interno per selezionare la regione e tutti i suoi punti; trascina per spostarla.
- <kbd>Shift</kbd> + clic aggiunge la regione alla selezione.

### Eliminare punti e segmenti

- Premi <kbd>Delete</kbd> o <kbd>Backspace</kbd> per eliminare la selezione.
- Un punto di ancoraggio eliminato porta via con sé i suoi segmenti.
- Un segmento eliminato porta via solo i punti che lascia scollegati, quindi eliminare il segmento centrale di un tracciato lo divide in due.
- Eliminare tutto elimina il livello.

## Tagliare, unire e rimodellare

| Azione                         | macOS                                     | Windows / Linux                         |
| ------------------------------ | ----------------------------------------- | --------------------------------------- |
| Strumento Taglia               | <kbd>X</kbd>                              | <kbd>X</kbd>                            |
| Punto morbido o angolare       | Doppio clic su un punto                   | Doppio clic su un punto                 |
| Raddrizzare un segmento        | <kbd>⌘</kbd> + doppio clic                | <kbd>Ctrl</kbd> + doppio clic           |
| Incurvare un segmento          | <kbd>⌘</kbd> + trascina un segmento       | <kbd>Ctrl</kbd> + trascina un segmento  |
| Incurvare, vicini fermi        | <kbd>⌘</kbd> + <kbd>Option</kbd> + trascina | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + trascina |
| Unire due estremi              | <kbd>⌘</kbd> + <kbd>J</kbd>               | <kbd>Ctrl</kbd> + <kbd>J</kbd>          |
| Duplicare punti                | <kbd>Option</kbd> + trascina              | <kbd>Alt</kbd> + trascina               |
| Spostare punti                 | Tasti freccia                             | Tasti freccia                           |

- **Taglia:** premi <kbd>X</kbd>, poi fai clic su un segmento per tagliarlo in quel punto, o su un punto per separare i segmenti che vi si incontrano. Le curve mantengono la loro forma, e una forma chiusa tagliata smette di essere riempita. <kbd>X</kbd> di nuovo, <kbd>Escape</kbd> o un altro tasto strumento lo disattivano.
- **Morbido o angolare:** fai doppio clic su un punto angolare per dargli maniglie lungo la linea tra i suoi vicini, e fai doppio clic su un punto morbido per rimuoverne le maniglie.
- **Raddrizzare:** <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + doppio clic su un segmento curvo ne rimuove entrambe le maniglie.
- **Unire:** seleziona due estremi e premi <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>J</kbd>. Se coincidono diventano un solo punto, altrimenti li collega un segmento dritto. Unire i due estremi di un tracciato lo chiude e lo riempie. Durante la modifica di un tracciato questa scorciatoia unisce i punti invece di aprire la chat.
- **Duplicare:** tieni premuto <kbd>Option</kbd>/<kbd>Alt</kbd> e trascina punti o segmenti selezionati per trascinarne una copia. La copia di un singolo punto resta collegata a esso, quindi il trascinamento prolunga il tracciato.
- **Spostare con le frecce:** i tasti freccia spostano i punti selezionati della distanza impostata in Impostazioni → Editor, e <kbd>Shift</kbd> + freccia della distanza grande.
- **Incurvare:** <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + trascina su un segmento lo incurva in modo che il punto afferrato segua il puntatore. Un estremo morbido resta morbido e l’altra sua maniglia ruota con esso. Aggiungi <kbd>Option</kbd>/<kbd>Alt</kbd> per lasciare dove sono le maniglie dei segmenti vicini; gli estremi diventano allora angoli.

## Trasformare i punti selezionati

Con due punti o segmenti selezionati compare un riquadro di trasformazione intorno a loro.

- Trascina un angolo o un lato per scalare i punti selezionati dal lato opposto. Tieni premuto <kbd>Shift</kbd> per mantenere le proporzioni e <kbd>Option</kbd>/<kbd>Alt</kbd> per scalare dal centro.
- Trascina appena fuori da un angolo per ruotarli attorno al centro del riquadro. Tieni premuto <kbd>Shift</kbd> per ruotare a passi di 15°.
- Punti e segmenti sotto il puntatore restano trascinabili sopra il riquadro, e ogni trasformazione si annulla in un solo passaggio.

## Modificatori per le maniglie

| Azione                                  | macOS                        | Windows / Linux             |
| --------------------------------------- | ---------------------------- | --------------------------- |
| Continua (morbida / continua)           | <kbd>⌘</kbd> + trascina      | <kbd>Ctrl</kbd> + trascina  |
| Angolo (maniglie indipendenti)          | <kbd>Option</kbd> + trascina | <kbd>Alt</kbd> + trascina   |
| Blocco della direzione (solo lunghezza) | <kbd>Shift</kbd> + trascina  | <kbd>Shift</kbd> + trascina |

### Continua: <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + trascina

- La maniglia attiva resta vincolata alla stessa retta della maniglia gemella.
- Cambia solo la lunghezza della maniglia attiva.
- Usalo per transizioni morbide senza spezzare la curva in un angolo.

### Angolo: <kbd>Option</kbd>/<kbd>Alt</kbd> + trascina

- La maniglia attiva si modifica in modo indipendente.
- La maniglia gemella resta ferma.
- Usalo per creare una transizione ad angolo vivo.

### Blocco della direzione: <kbd>Shift</kbd> + trascina

Per i punti con composizione **continua** o **simmetrica**:

- la direzione della maniglia resta bloccata sul valore che aveva **prima dell’inizio del trascinamento in corso**;
- il trascinamento cambia solo la lunghezza della maniglia (o delle maniglie, a seconda della composizione).

## Incurvare trascinando un punto

Quando trascini un punto di ancoraggio tenendo premuto <kbd>⌘</kbd>/<kbd>Ctrl</kbd>, l’editor sceglie la maniglia da modificare in base alla **direzione con cui il segmento si collega** a quel punto (non in base al punto vicino più prossimo). Funziona anche sui punti di reti vettoriali con più rami: una volta determinata, la maniglia resta bloccata per tutto il trascinamento.

## Usare la Penna in modalità di modifica

Con lo strumento Penna attivo:

- **Fai clic su un segmento** per inserire un nuovo punto di ancoraggio (dividendo il segmento).
- **Fai clic sull’estremità di un tracciato aperto** per riprendere a disegnare da quel punto.
- **Option/Alt + clic su un punto** per eliminarlo (quando la topologia lo consente).

Per la creazione e la chiusura dei tracciati vedi [Strumento Penna](./pen-tool).

## Flusso di lavoro pratico

1. Disegna una forma con lo strumento Penna.
2. Fai doppio clic sulla curva per entrare nella modalità di modifica vettoriale.
3. Sposta i punti di ancoraggio per rifinire la sagoma.
4. Trascina le maniglie:
   - con <kbd>⌘</kbd>/<kbd>Ctrl</kbd> per transizioni morbide e continue,
   - con <kbd>Option</kbd>/<kbd>Alt</kbd> per modifiche indipendenti,
   - con <kbd>Shift</kbd> per modificare solo la lunghezza.
5. Premi <kbd>Escape</kbd> per uscire.
