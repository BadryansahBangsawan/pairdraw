---
title: Navigazione nell’area di lavoro
description: Spostare la vista, usare lo zoom, le guide dei righelli, l’aggancio e le misure delle distanze.
---

# Navigazione nell’area di lavoro

L’area di lavoro è illimitata. Spostamento e zoom permettono di raggiungere liberamente qualsiasi parte del design.

## Spostare la vista

Sposta l’area visibile senza modificare alcun oggetto.

- <kbd>Space</kbd> + trascinamento: tieni premuto Space e trascina in qualsiasi punto dell’area di lavoro.
- Trascina con il pulsante centrale del mouse.
- Scorri con due dita sul trackpad.
- <kbd>Shift</kbd> + rotellina sposta la vista in orizzontale.

## Strumento Mano

Premi <kbd>H</kbd> per attivare lo strumento Mano e spostare la vista di continuo. Finché è attivo, qualsiasi trascinamento sposta la vista senza tenere premuto <kbd>Space</kbd>. Passa a un altro strumento (per esempio <kbd>V</kbd> per Sposta) per disattivarlo.

## Zoom

Lo zoom è centrato sulla posizione del puntatore.

- <kbd>Ctrl</kbd> + rotellina (o <kbd>⌘</kbd> + rotellina su Mac): rotellina in su per ingrandire, in giù per ridurre.
- **Pizzicamento**: pizzica sul trackpad per ingrandire o ridurre.
- **Scorciatoie da tastiera**: vedi la tabella sotto.

Con il mouse, attiva **Zoom con la rotellina** in **Impostazioni → Editor → Navigazione** per ingrandire con la sola rotellina; <kbd>Shift</kbd> + rotellina sposta ancora la vista di lato. **Inverti la direzione dello zoom** inverte il verso della rotellina, mentre il pizzicamento sul trackpad mantiene il suo.

Il pizzicamento sui pannelli dell’interfaccia (livelli, proprietà) è bloccato, così non cambia per errore lo zoom del browser.

## Strumento Zoom

Tieni premuto <kbd>Z</kbd> e fai clic per ingrandire sul puntatore, oppure fai clic con <kbd>Option</kbd>/<kbd>Alt</kbd> per ridurre; trascina per ingrandire l’area che delimiti. Rilasciando <kbd>Z</kbd> torni allo strumento precedente. Un tocco breve di <kbd>Z</kbd> lascia attivo lo strumento Zoom, presente anche nel menu dello strumento Mano nella barra degli strumenti.

Adatta alla vista, alla selezione e al 100%, i livelli del menu di zoom e il frame successivo o precedente scorrono fino alla loro vista invece di saltare. Saltano quando le animazioni sono disattivate, la **Modalità ultraleggera** è attiva o il sistema chiede di ridurre il movimento.

## Scorciatoie da tastiera

| Azione | macOS | Windows / Linux |
|--------|-------|-----------------|
| Sposta la vista | <kbd>Space</kbd> + trascina | <kbd>Space</kbd> + trascina |
| Strumento Mano | <kbd>H</kbd> | <kbd>H</kbd> |
| Strumento Zoom | <kbd>Z</kbd> | <kbd>Z</kbd> |
| Ingrandisci | <kbd>⌘</kbd><kbd>+</kbd> | <kbd>Ctrl</kbd> + <kbd>+</kbd> |
| Riduci | <kbd>⌘</kbd><kbd>−</kbd> | <kbd>Ctrl</kbd> + <kbd>−</kbd> |
| Ingrandisci / riduci | <kbd>+</kbd> / <kbd>−</kbd> | <kbd>+</kbd> / <kbd>−</kbd> |
| Zoom al 100% | <kbd>⇧</kbd><kbd>0</kbd> o <kbd>⌘</kbd><kbd>0</kbd> | <kbd>Shift</kbd> + <kbd>0</kbd> o <kbd>Ctrl</kbd> + <kbd>0</kbd> |
| Adatta allo schermo | <kbd>⇧</kbd><kbd>1</kbd> | <kbd>Shift</kbd> + <kbd>1</kbd> |
| Zoom sulla selezione | <kbd>⇧</kbd><kbd>2</kbd> | <kbd>Shift</kbd> + <kbd>2</kbd> |
| Zoom sul frame successivo / precedente | <kbd>N</kbd> / <kbd>⇧</kbd><kbd>N</kbd> | <kbd>N</kbd> / <kbd>Shift</kbd> + <kbd>N</kbd> |
| Pagina successiva / precedente | <kbd>Page Down</kbd> / <kbd>Page Up</kbd> | <kbd>Page Down</kbd> / <kbd>Page Up</kbd> |
| Griglia di pixel | <kbd>⇧</kbd><kbd>'</kbd> | <kbd>Shift</kbd> + <kbd>'</kbd> |
| Aggancia alla griglia di pixel | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>'</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>'</kbd> |
| Righelli | <kbd>⇧</kbd><kbd>R</kbd> | <kbd>Shift</kbd> + <kbd>R</kbd> |
| Cursori multigiocatore | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>\\</kbd> | <kbd>Alt</kbd> + <kbd>Ctrl</kbd> + <kbd>\\</kbd> |

## Frame e pagine

<kbd>N</kbd> seleziona il frame di primo livello successivo della pagina e ci zooma sopra; <kbd>Shift</kbd> + <kbd>N</kbd> torna indietro. Contano anche i frame dentro le sezioni, non quelli nascosti, e l’ordine va da sinistra a destra, poi dall’alto in basso, ricominciando dall’altra estremità. Con selezionato un livello dentro un frame, il passo parte da quel frame.

<kbd>Page Down</kbd> e <kbd>Page Up</kbd> aprono la pagina successiva e precedente nell’ordine del pannello Pagine.

## Griglia di pixel

Con uno zoom tale che ogni pixel del documento copra otto pixel dello schermo (800% su uno schermo normale, 400% su uno Retina), l’area di lavoro mostra una linea a ogni pixel, come in Figma. Disattivala o attivala con **Visualizza → Griglia di pixel**, <kbd>Shift</kbd> + <kbd>'</kbd> o **Mostra griglia di pixel** in **Impostazioni → Editor**; la scelta vale per tutti i documenti aperti e si conserva tra le sessioni.

## Pannelli laterali {#side-panels}

Il pulsante del pannello dei livelli sta sopra gli strumenti, a sinistra dell’area di lavoro, e quello del pannello delle proprietà nella barra superiore. Il pannello delle proprietà compare quando selezioni un livello e scompare con la selezione; un pannello aperto dal suo pulsante resta aperto finché non lo chiudi, anche tra una sessione e l’altra. L’area di lavoro occupa lo spazio di un pannello chiuso, che si riapre alla larghezza che aveva. **Visualizza → Pannello livelli** e **Visualizza → Pannello proprietà** fanno lo stesso. <kbd>⌘</kbd><kbd>\\</kbd> (<kbd>Ctrl</kbd> + <kbd>\\</kbd>) nasconde comunque tutti i pannelli in una volta. L’elenco dei commenti e la cronologia delle versioni si mostrano nel pannello delle proprietà, quindi lo strumento commento e la cronologia delle versioni lo aprono mentre li usi e lo richiudono dopo.

## Modalità ultraleggera

Su un computer lento o a batteria, attiva **Modalità ultraleggera** in **Impostazioni → Editor → Rendering**. Disattiva subito le animazioni dell’interfaccia e, dopo un ricaricamento, disegna l’area di lavoro a riquadri con un pixel del dispositivo per pixel dello schermo e tralascia sfocature dello sfondo e rumore, disegnando le ombre a risoluzione più bassa quando lo zoom è alto. Il rendering progressivo resta attivo con la modalità ultraleggera. Le immagini esportate mantengono tutti gli effetti.

## Guide dei righelli

I righelli sono nascosti finché non li attivi con **Visualizza → Righelli** o <kbd>Shift</kbd> + <kbd>R</kbd>. Poi trascina dal righello superiore per una guida orizzontale o da quello sinistro per una guida verticale. Rilasciala sulla pagina per una guida della tela, o su un frame per una guida nelle coordinate di quel frame.

- Fai clic su una guida per selezionarla; trascinala per riposizionarla o trasferirla tra la pagina e un frame.
- Tieni premuto <kbd>Option</kbd> / <kbd>Alt</kbd> mentre trascini una guida esistente per duplicarla.
- Trascina una guida di nuovo su un righello per rimuoverla, o usa **Rimuovi guida** nel suo menu contestuale.
- Le modifiche alle guide supportano annulla e ripristina e si conservano nei file `.fig`.

## Aggancio

In **Visualizza → Preferenze**, attiva **Aggancia alla geometria**, **Aggancia agli oggetti** e **Aggancia alla griglia di pixel** in modo indipendente. Le preferenze si conservano tra le sessioni.

L’aggancio alla geometria e agli oggetti aiuta ad allineare i punti vettoriali, i livelli spostati e i bordi ridimensionati con la geometria, gli oggetti, le guide e i bordi dei frame vicini. Per questi obiettivi appaiono linee di allineamento; l’arrotondamento alla griglia di pixel non disegna una linea di allineamento per ogni pixel.

Con **Aggancia agli oggetti** attivo, un livello spostato si aggancia anche alla spaziatura uguale: si centra tra i suoi due vicini, o si colloca alla stessa distanza da un vicino quanto quella tra altri due vicini della stessa riga o colonna. Ogni spazio di quella dimensione mostra un indicatore rosa con la sua misura. Il ridimensionamento non si aggancia alla spaziatura.

Con **Aggancia alla griglia di pixel** attivo, i livelli spostati, i bordi ridimensionati e i livelli disegnati atterrano su pixel interi a qualsiasi zoom, anche se sono partiti tra i pixel. Un aggancio a un oggetto o a una guida vince sulla griglia. I movimenti con le frecce e i valori digitati nel pannello delle proprietà conservano le loro frazioni.

Attiva **Aggancia ai mezzi pixel** in **Impostazioni → Editor** perché l’aggancio alla griglia di pixel possa atterrare anche sui mezzi pixel, così che un tratto di 1 px possa stare centrato sul bordo di un pixel. Una lavagna conserva la sua griglia di 16 unità.

Tieni premuto <kbd>Control</kbd> durante il trascinamento di un livello per aggirare temporaneamente l’aggancio a oggetti e pixel, anche su macOS, dove è Control e non Command.

## Misure delle distanze

Seleziona un livello, tieni premuto <kbd>Option</kbd> su macOS o <kbd>Alt</kbd> su Windows/Linux e passa con il puntatore su un altro livello per vedere misure temporanee delle distanze. Rilasciando il tasto la sovrapposizione scompare; non aggiunge guide né modifica il documento.

## Palette dei comandi

Premi <kbd>⌘</kbd><kbd>K</kbd> su macOS o <kbd>Ctrl</kbd> + <kbd>K</kbd> su Windows/Linux per cercare azioni dell’editor e dell’applicazione. Seleziona un risultato per eseguirlo; le azioni non disponibili restano soggette alla selezione e allo stato del documento.

La palette permette anche di passare da una pagina all’altra. Prima che tu scriva, elenca le pagine visitate di recente in questa scheda, dalla più recente, e **Vai alla pagina…** apre l’elenco di tutte le pagine. Anche digitare il nome di una pagina la trova. Le pagine in cui lavorano collaboratori o agenti AI ne riportano i nomi; il pannello Pagine le contrassegna con gli stessi colori.

## Suggerimenti

- Lo zoom punta sempre alla posizione del cursore: indica ciò che vuoi vedere più da vicino.
- Lo strumento Mano è utile quando devi spostare spesso la vista: resta attivo finché non cambi strumento.
- Vedi [Selezionare e trasformare](./selection-and-manipulation) per lavorare con gli oggetti nell’area di lavoro.
