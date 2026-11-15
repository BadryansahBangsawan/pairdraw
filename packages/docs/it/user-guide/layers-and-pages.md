---
title: Livelli e pagine
description: Gestire l’albero dei livelli, le pagine e il pannello delle proprietà in Pairdraw.
---

# Livelli e pagine

L’editor si apre con la sola area di lavoro. Gli strumenti stanno a sinistra dell’area di lavoro, con il pulsante del pannello dei livelli sopra, e lo zoom nell’angolo in basso a destra. Il pannello dei livelli si apre a sinistra, quello delle proprietà a destra e la chat con AI in una colonna accanto; tutti si ridimensionano trascinandone i bordi. Vedi [Pannelli laterali](./canvas-navigation#side-panels) per sapere quando compare ciascun pannello.

Mentre la chat con AI è chiusa, un prompt in fondo all’area di lavoro invia alla chat ciò che scrivi; disattivalo con **Prompt nell’area di lavoro** in **Impostazioni → Modelli → Chat**. <kbd>Escape</kbd> nel prompt torna all’area di lavoro.

## Pannello dei livelli

Il pannello dei livelli a sinistra mostra la gerarchia del documento come un albero.

### Vista ad albero

Ogni oggetto appare nell’albero, che si può comprimere. Fai clic sulla freccia accanto a un frame, un gruppo o un componente per espandere o comprimere i suoi figli.

### Riordinare trascinando

Trascina un livello per cambiarne ordine o contenitore. I livelli più in alto nell’elenco vengono disegnati sopra gli altri.

### Visibilità e blocco

Fai clic sull’occhio accanto a un livello per nasconderlo o mostrarlo nell’area di lavoro; i livelli nascosti restano nell’albero. Usa il lucchetto per evitare modifiche accidentali.

### Rinominare

Fai doppio clic sul nome di un livello per modificarlo sul posto. Conferma con <kbd>Enter</kbd> o facendo clic altrove, annulla con <kbd>Escape</kbd>.

### Selezione sincronizzata

Un clic su un livello nel pannello seleziona l’oggetto corrispondente nell’area di lavoro, e viceversa. <kbd>Shift</kbd> permette di selezionare più livelli.

### Trova livelli

Premi <kbd>⌘</kbd><kbd>F</kbd> (<kbd>Ctrl</kbd> + <kbd>F</kbd>), scegli **Modifica → Trova livelli…** o avvialo dalla tavolozza dei comandi per cercare per nome tra i livelli della pagina mostrata. Scegliere un risultato seleziona quel livello e lo porta in vista.

## Pannello delle pagine

Il pannello delle pagine mostra tutte le pagine del documento.

- **Cambiare pagina**: fai clic sulla scheda di una pagina per attivarla. L’area di lavoro passa a quella pagina e ne ripristina la posizione della vista.
- **Aggiungere una pagina**: fai clic sul pulsante di aggiunta per creare una nuova pagina.
- **Eliminare una pagina**: rimuove la pagina corrente.
- **Rinominare una pagina**: fai doppio clic sul nome della pagina per modificarlo sul posto. <kbd>Enter</kbd>, <kbd>Escape</kbd> o un clic altrove confermano il nuovo nome.

Ogni pagina ha la propria area di lavoro e conserva posizione e livello di zoom della vista. Il menu contestuale sposta la selezione in un’altra pagina. Al cambio di pagina Pairdraw ripristina vista e selezione.

## Pannello delle slide

Il pannello delle slide elenca i frame di primo livello della pagina come miniature numerate, nell’ordine dei livelli. Fai clic su una slide per mostrare il suo frame sulla tela e trascina una slide — o premi <kbd>Alt</kbd> con una freccia su o giù — per riordinarla. **Esporta diapositive in PDF** scrive tutte le slide, in ordine, in un unico file PDF.

## Presenta

Presenta mostra le slide della pagina a schermo intero, una alla volta. Avvialo con <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Invio</kbd>, **Visualizza → Presenta** o il pulsante Presenta nella barra superiore. Le frecce, <kbd>Spazio</kbd>, <kbd>Invio</kbd>, <kbd>Pag su</kbd>/<kbd>Pag giù</kbd> e la rotellina scorrono le slide; <kbd>Esc</kbd> esce e restituisce la tela e il focus della tastiera a dove erano. Una slide più alta dello schermo viene mostrata al 100 % e si può scorrere.

## Documenti e recupero

Home si apre con un prompt: scegli sopra cosa creare (pagina di destinazione, app mobile, app web, diapositive, pannello di controllo o qualcos’altro), descrivilo e Pairdraw apre un nuovo design e invia il prompt alla sua chat con AI insieme a una guida per quel tipo; i prompt di esempio sotto lo riempiono con un’idea da modificare. Sotto il prompt puoi partire da un file Figma, da una pagina del browser integrato (app desktop) o da uno screenshot che l’agente ricrea. Le schede passano tra **Recenti**, **Bozze** e **Design system**, e il menu accanto elenca i luoghi aggiunti dal tuo server Cloud e dal tuo bucket di archiviazione. Un campo di ricerca filtra l’elenco, **Apri…** apre un file e **Design** avvia un design vuoto.

**Recenti** elenca i documenti locali recenti. Usa la vista a griglia o a elenco e ordina i file recenti per **Nome**, **Ultimo utilizzo** o **Creazione**. <kbd>⌘</kbd>/<kbd>Ctrl</kbd>-clic aggiunge un file alla selezione, <kbd>Shift</kbd>-clic seleziona un intervallo e <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>A</kbd> seleziona tutti i file elencati; la barra di selezione li apre poi in schede dell’editor separate, li toglie da Recenti o elimina i documenti archiviati. Il menu <kbd>⋯</kbd> di un file o il suo menu contestuale offre **Rimuovi dai recenti**, che dimentica il file senza eliminarlo, e **Salva con nome…**, che salva una copia altrove. **Design system** elenca Pairdraw Basics, incluso nell’app, e le librerie di componenti che hai pubblicato, come fa **Extra**; sceglierne una apre un nuovo design con quella libreria attiva nel pannello delle risorse.

Un nuovo design resta conservato come bozza su questo dispositivo mentre ci lavori: ogni modifica viene scritta poco dopo averla fatta, quindi chiudere la sua scheda non chiede nulla. **Bozze** in Home le elenca con un’anteprima; aprine una per continuare, o scegli **Elimina bozza** dal suo menu <kbd>⋯</kbd> o contestuale per eliminarla per sempre. Salvare una bozza in un file o in un archivio, nell’editor o con **Salva con nome…** in Home, la toglie dalle Bozze. Le bozze vivono solo in questo profilo del browser o in questa installazione desktop, e richiedono che **Conserva automaticamente il lavoro non salvato** sia attivo e un browser che conserva i dati del sito.

In **Impostazioni → Generali → Ripristino**, **Conserva automaticamente il lavoro non salvato** controlla bozze e copie di recupero locali. Con il recupero attivo, i documenti non salvati senza percorso di file restano recuperabili anche dopo la chiusura delle loro schede. Quando Pairdraw offre **Recupera il lavoro non salvato**, scegli **Ripristina** per riaprire un documento o **Scarta** per eliminare la sua copia di recupero.

Un file che hai aperto conserva anche una copia di sicurezza delle modifiche che non sono ancora state salvate con lui, scritta mentre il salvataggio automatico è disattivato o quando la finestra si chiude prima che il salvataggio automatico le abbia scritte. La prossima volta che quel file si apre, **Modifiche recuperate** offre **Salva** per scriverle nel file, **Salva con nome…** per aprirle a parte e salvarle come un nuovo file, o **Non salvare** per lasciare il file com’è e scartare la copia. Chiudere la finestra di dialogo conserva la copia per la prossima volta. Salvare il file scarta le sue copie più vecchie, e nel browser una copia più vecchia dell’ultima modifica del file non viene offerta. Una copia il cui file non è stato aperto per una settimana, per esempio perché il file è stato spostato, compare anch’essa in **Recupera il lavoro non salvato**.

Disattivare il recupero arresta la conservazione automatica e rimuove le copie di recupero dei documenti attualmente aperti. Non elimina in blocco le istantanee dei documenti chiusi in precedenza. Il recupero è locale a questa installazione o a questo profilo del browser; non sostituisce il salvataggio di un file, la sincronizzazione sul cloud né un backup.

## Extra {#goodies}

Il pulsante con il regalo nella barra superiore, **Oggetto → Extra…** o la tavolozza dei comandi aprono **Extra**, una raccolta di punti di partenza: stili da fissare nella chat con AI, i design system che puoi attivare, script che arrivano nell’area di lavoro come [livelli script](/user-guide/script-layers) e gli shader della galleria, che riempiono i livelli selezionati o un nuovo rettangolo.

## Pannello delle proprietà

Il pannello delle proprietà a destra passa tra **Design** e **Codice**, con [**Verifica**](/user-guide/checking-designs) come scheda a icona accanto. La chat con AI si apre in una colonna propria accanto a esso.

### Scheda Design

Mostra le proprietà degli oggetti selezionati, organizzate in sezioni:

- **Aspetto**: opacità, raggio degli angoli (con interruttore per angoli indipendenti), visibilità.
- **Riempimento**: colore pieno, gradienti (lineare, radiale, angolare, a diamante), riempimenti immagine, collegamenti a variabili.
- **Contorno**: colore, spessore, estremità, giunzione, tratteggio.
- **Effetti**: ombra esterna, ombra interna, sfocatura del livello, sfocatura dello sfondo, sfocatura in primo piano.
- **Tipografia**: famiglia di caratteri, dimensione, peso, pulsanti di grassetto, corsivo, sottolineato e barrato (visibile per i livelli di testo).
- **Layout**: controlli di [auto-layout](./auto-layout) (visibile per i frame con auto-layout).
- **Esporta**: scala, formato e pulsante di esportazione (vedi [Esportazione](./exporting)).

Senza selezione, la scheda Design mostra le proprietà della pagina, tra cui il colore di sfondo dell’area di lavoro e le variabili.

### Scheda Codice

Mostra l’oggetto selezionato come codice con evidenziazione della sintassi, numeri di riga e un pulsante di copia. Un selettore di formato passa tra due modalità di output:

- **Pairdraw JSX**: albero di componenti personalizzato compatibile con `renderJSX()`, per andata e ritorno programmatici.
- **Tailwind CSS v4**: HTML con classi di utilità (`<div className="flex gap-4 p-3">`) pronto da incollare in progetti React/Vue.

## Colonna della chat con AI

La [chat con AI](../programmable/ai-chat) crea e modifica elementi del design a partire da richieste in linguaggio naturale. Si apre in una colonna propria a destra del pannello delle proprietà, così la scheda Design resta visibile mentre un agente lavora. Aprila e chiudila con il pulsante con le scintille tra le azioni del documento nella barra superiore o con <kbd>⌘</kbd><kbd>J</kbd>; trascinane il bordo per ridimensionarla. La colonna resta aperta o chiusa, alla larghezza in cui l’hai lasciata, anche dopo un ricaricamento. Configura modelli e connessioni ai provider riutilizzabili nelle Impostazioni, e sfoglia le conversazioni salvate localmente dal menu della cronologia della chat.

## Scorciatoie da tastiera

| Azione | Mac | Windows / Linux |
|--------|-----|-----------------|
| Aprire o chiudere la colonna della chat con AI | <kbd>⌘</kbd><kbd>J</kbd> | <kbd>Ctrl</kbd> + <kbd>J</kbd> |
| Trovare livelli | <kbd>⌘</kbd><kbd>F</kbd> | <kbd>Ctrl</kbd> + <kbd>F</kbd> |

## Layout mobile

Su dispositivi mobili e schermi piccoli, i pannelli laterali sono sostituiti da un cassetto inferiore scorrevole. Le schede in cima al cassetto passano tra le viste Livelli, Proprietà, Design, Codice e AI. La barra degli strumenti si riduce a una striscia orizzontale compatta con cambio di categoria.

## Suggerimenti

- Le larghezze dei pannelli, compresa quella della colonna della chat con AI, vengono salvate automaticamente e restano dopo un ricaricamento.
- Usa il pannello dei livelli per trovare oggetti sovrapposti difficili da cliccare nell’area di lavoro.
- Il [menu contestuale](./context-menu) offre azioni aggiuntive per gli oggetti selezionati.
- Vedi [Selezione e manipolazione](./selection-and-manipulation) per le scorciatoie dell’ordine di sovrapposizione (]/[) e per mostrare, nascondere e bloccare.
