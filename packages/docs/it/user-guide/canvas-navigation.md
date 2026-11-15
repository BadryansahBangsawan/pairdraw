---
title: Navigazione nell’area di lavoro
description: Spostare la vista, usare lo zoom e lo strumento Mano.
---

# Navigazione nell’area di lavoro

L’area di lavoro è illimitata. Spostamento e zoom permettono di raggiungere qualsiasi parte del documento.

## Spostare la vista

- Tieni premuto <kbd>Space</kbd> e trascina.
- Trascina con il pulsante centrale del mouse.
- Scorri con due dita sul trackpad.

## Strumento Mano

Premi <kbd>H</kbd>. Finché è attivo, qualsiasi trascinamento sposta la vista senza tenere premuto <kbd>Space</kbd>. Premi <kbd>V</kbd> per tornare a Selezione.

## Zoom

Lo zoom è centrato sul puntatore. Usa <kbd>Ctrl</kbd>/<kbd>⌘</kbd> + rotella, il gesto di pizzicamento o le scorciatoie.

Con **Zoom con la rotellina** in **Impostazioni → Editor**, la rotellina ingrandisce senza tasti; <kbd>Shift</kbd> + rotella scorre ancora in orizzontale. **Inverti la direzione dello zoom** inverte il verso della rotellina; il pizzico sul trackpad mantiene il suo.

| Azione | macOS | Windows / Linux |
|--------|-------|-----------------|
| 100% | <kbd>⌘</kbd><kbd>0</kbd> | <kbd>Ctrl</kbd><kbd>0</kbd> |
| Adatta documento | <kbd>⌘</kbd><kbd>1</kbd> | <kbd>Ctrl</kbd><kbd>1</kbd> |
| Inquadra selezione | <kbd>⌘</kbd><kbd>2</kbd> | <kbd>Ctrl</kbd><kbd>2</kbd> |

## Strumento Zoom

Tieni premuto <kbd>Z</kbd> e fai clic per ingrandire sul puntatore, oppure fai clic con <kbd>Option</kbd>/<kbd>Alt</kbd> per ridurre; trascina per ingrandire l'area che delimiti. Rilasciando <kbd>Z</kbd> torni allo strumento precedente. Un tocco breve di <kbd>Z</kbd> lascia attivo lo strumento Zoom, presente anche nel menu dello strumento Mano nella barra degli strumenti.

Adatta alla vista, alla selezione e al 100%, i livelli del menu di zoom e la cornice successiva o precedente scorrono fino alla loro vista invece di saltare. Saltano quando le animazioni sono disattivate, la modalità Ultralight è attiva o il sistema chiede di ridurre il movimento.

## Righelli

I righelli sono nascosti finché non li attivi con **Visualizza → Righelli** o <kbd>Shift</kbd> + <kbd>R</kbd>.

## Aggancio

In **Visualizza → Preferenze**, attiva **Aggancia alla geometria**, **Aggancia agli oggetti** e **Aggancia alla griglia di pixel** in modo indipendente. Le preferenze si conservano tra le sessioni.

L’aggancio alla geometria e agli oggetti aiuta ad allineare i punti vettoriali, i livelli spostati e i bordi ridimensionati con la geometria, gli oggetti, le guide e i bordi dei frame vicini. Per questi obiettivi appaiono linee di allineamento; l’arrotondamento alla griglia di pixel non disegna una linea di allineamento per ogni pixel.

Con **Aggancia agli oggetti** attivo, un livello spostato si aggancia anche alla spaziatura uguale: si centra tra i suoi due vicini, o si colloca alla stessa distanza da un vicino quanto quella tra altri due vicini della stessa riga o colonna. Ogni spazio di quella dimensione mostra un indicatore rosa con la sua misura. Il ridimensionamento non si aggancia alla spaziatura.

Con **Aggancia alla griglia di pixel** attivo, i livelli spostati, i bordi ridimensionati e i livelli disegnati atterrano su pixel interi a qualsiasi zoom, anche se sono partiti tra i pixel. Un aggancio a un oggetto o a una guida vince sulla griglia. I movimenti con le frecce e i valori digitati nel pannello delle proprietà conservano le loro frazioni.

Attiva **Aggancia ai mezzi pixel** in **Impostazioni → Editor** perché l’aggancio alla griglia di pixel possa atterrare anche sui mezzi pixel, così che un tratto di 1 px possa stare centrato sul bordo di un pixel. Una lavagna conserva la sua griglia di 16 unità.

Tieni premuto <kbd>Control</kbd> durante il trascinamento di un livello per aggirare temporaneamente l’aggancio a oggetti e pixel — anche su macOS, dove è Control, non Command.

## Palette dei comandi

Premi <kbd>⌘</kbd><kbd>K</kbd> su macOS o <kbd>Ctrl</kbd> + <kbd>K</kbd> su Windows/Linux per cercare azioni dell’editor e dell’applicazione. Seleziona un risultato per eseguirlo; le azioni non disponibili restano soggette alla selezione e allo stato del documento.

La palette permette anche di passare da una pagina all’altra. Prima che tu scriva, elenca le pagine visitate di recente in questa scheda, dalla più recente, e **Vai alla pagina…** apre l’elenco di tutte le pagine. Anche digitare il nome di una pagina la trova. Le pagine in cui lavorano collaboratori o agenti AI ne riportano i nomi; il pannello Pagine le contrassegna con gli stessi colori.
