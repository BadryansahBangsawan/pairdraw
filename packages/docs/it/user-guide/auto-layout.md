---
title: Disposizione automatica
description: Flexbox e CSS Grid in Pairdraw — direzione, spaziatura, margini interni, allineamento, dimensionamento dei figli e tracce della griglia.
---

# Disposizione automatica

La disposizione automatica (**Auto-layout** nel pannello delle proprietà) posiziona automaticamente gli oggetti figli all’interno di un frame. Ha due modalità: **flex** (flusso orizzontale o verticale) e **grid** (righe e colonne con dimensionamento delle tracce).

## Attivare la disposizione automatica

- Seleziona un frame e premi <kbd>⇧</kbd><kbd>A</kbd> (<kbd>Shift</kbd> + <kbd>A</kbd>) per attivarla o disattivarla.
- Seleziona oggetti liberi (senza un frame genitore) e premi <kbd>⇧</kbd><kbd>A</kbd> per racchiuderli in un nuovo frame con disposizione automatica.

Quando racchiudi una selezione, gli oggetti vengono ordinati per posizione visiva: da sinistra a destra per la disposizione orizzontale, dall’alto in basso per quella verticale.

## Direzione

Scegli come disporre i figli:

- **Orizzontale**: i figli scorrono da sinistra a destra.
- **Verticale**: i figli scorrono dall’alto in basso.
- **A capo**: i figli passano alla riga o colonna successiva quando finisce lo spazio.

## Spaziatura

### Spazio

La distanza tra figli adiacenti. Si imposta un solo valore, valido tra tutti i figli.

### Margini interni

La distanza tra il bordo del frame e i suoi figli. Imposta un valore uniforme per tutti i lati, o espandi il campo per impostare ogni lato separatamente (alto, destra, basso, sinistra).

## Allineamento

### Distribuzione (asse principale)

Controlla come si distribuiscono i figli lungo la direzione della disposizione:

- **Inizio**: i figli si raccolgono all’inizio.
- **Centro**: i figli sono centrati.
- **Fine**: i figli si raccolgono alla fine.
- **Spazio tra gli elementi**: i figli si distribuiscono con lo stesso spazio tra loro.
- **Spazio attorno**: ogni figlio riceve una parte uguale dello spazio libero, metà per lato, oltre allo spazio; si sceglie dal menu del campo di spaziatura.

### Allineamento (asse trasversale)

Controlla come si posizionano i figli in perpendicolare alla direzione della disposizione:

- **Inizio**: i figli si allineano all’inizio.
- **Centro**: i figli sono centrati.
- **Fine**: i figli si allineano alla fine.
- **Estensione**: i figli si estendono per riempire l’asse trasversale.

## Dimensionamento dei figli

Ogni figlio di un frame con disposizione automatica può avere la propria modalità di dimensionamento:

- **Fisso**: usa la larghezza o l’altezza esplicita del figlio.
- **Riempi**: si estende per riempire lo spazio disponibile nel genitore.
- **Adatta al contenuto**: si riduce per contenere esattamente il contenuto del figlio.

La prima modifica reale di una dimensione rende fisso solo quell’asse. Portare il focus sul campo non cambia la modalità.

## Includere i contorni nel layout

Per impostazione predefinita un frame con disposizione automatica dispone il contenuto come se nessun livello avesse un contorno, come fa Figma. Attiva **Includi i contorni nel layout** nella sezione Layout per fare spazio ai contorni: il contorno del frame spinge il contenuto verso l’interno, e i contorni esterni dei figli occupano spazio tra di loro.

## Riordinare trascinando

In un frame con disposizione automatica, trascina un figlio per riordinarlo tra i fratelli. Un indicatore di inserimento mostra dove verrà rilasciato. Trascinare un oggetto da un altro punto dentro un frame con disposizione automatica lo inserisce allo stesso modo; in un frame che va a capo, finisce nella riga sotto il cursore. Disegnare dentro un frame con disposizione automatica aggiunge il nuovo oggetto alla fine del suo flusso.

Tieni premuto <kbd>⌃</kbd> (<kbd>Ctrl</kbd> su Windows e Linux) durante il trascinamento per ignorare la disposizione automatica: l’oggetto viene rilasciato dove lasci il pulsante, come figlio con posizione assoluta.

## Pannello delle proprietà

Quando è selezionato un frame con disposizione automatica, la sezione Layout del pannello delle proprietà mostra tutti i controlli: direzione, spazio, margini interni, distribuzione e allineamento.

## Scorciatoie da tastiera

| Azione | Mac | Windows / Linux |
|--------|-----|-----------------|
| Attivare/disattivare la disposizione automatica | <kbd>⇧</kbd><kbd>A</kbd> | <kbd>Shift</kbd> + <kbd>A</kbd> |

## CSS Grid

La disposizione a griglia distribuisce i figli in righe e colonne con un dimensionamento esplicito delle tracce.

### Attivare la griglia

Seleziona un frame con disposizione automatica e fai clic sull’icona della griglia nella barra del layout per passare da flex a griglia.

### Dimensionamento delle tracce

Definisci le tracce di colonne e righe con tre modalità:

- **fr**: unità frazionaria, divide lo spazio disponibile in proporzione.
- **px**: dimensione fissa in pixel.
- **auto**: si adatta al contenuto.

Esempio: tre colonne `1fr 200px 1fr` creano un layout con una colonna centrale fissa e lati flessibili.

### Spazi della griglia

Imposta spazi separati orizzontali (tra colonne) e verticali (tra righe) tra le celle.

### Posizionamento dei figli

I figli vengono inseriti automaticamente nelle celle in ordine di riga. Puoi cambiare il posizionamento con i valori di inizio e di estensione di colonna e riga nelle proprietà di layout del figlio.

### Esportazione JSX e Tailwind

Le griglie si esportano in JSX con classi Tailwind: `grid grid-cols-3`, `gap-x-4 gap-y-2`, `col-start-2 row-span-2`.

## Suggerimenti

- La disposizione automatica si ricalcola subito dopo la creazione, quindi i limiti della selezione si aggiornano immediatamente.
- Annida frame con disposizione automatica per layout responsivi complessi (per esempio un frame verticale che contiene righe orizzontali).
- Usa il dimensionamento **Riempi** perché un figlio occupi lo spazio rimanente, come `flex-grow: 1` in CSS.
- Usa la griglia per pannelli di controllo, gallerie e moduli: tutto ciò che ha una struttura bidimensionale.
- Vedi [Disegnare forme](./drawing-shapes) per creare i frame a cui si applica la disposizione automatica.
- Vedi [Componenti](./components) per usare la disposizione automatica nei componenti riutilizzabili.
