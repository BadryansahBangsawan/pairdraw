---
title: Livelli e pagine
description: Gestire l’albero dei livelli, le pagine e il pannello delle proprietà.
---

# Livelli e pagine

L’editor si apre con la sola area di lavoro. Gli strumenti stanno a sinistra dell’area di lavoro, con il pulsante del pannello dei livelli sopra, e lo zoom nell’angolo in basso a destra. Il pannello dei livelli si apre a sinistra, quello delle proprietà a destra e la chat con AI in una colonna accanto; tutti si ridimensionano trascinandone i bordi.

Mentre la chat con AI è chiusa, un prompt in fondo all’area di lavoro invia alla chat ciò che scrivi; disattivalo con **Prompt nell’area di lavoro** in **Impostazioni → Modelli → Chat**. <kbd>Escape</kbd> nel prompt torna all’area di lavoro.

## Livelli

Ogni oggetto appare nell’albero. Frame, gruppi e componenti possono essere espansi per mostrare i figli.

- Trascina un livello per cambiarne ordine o contenitore.
- Usa l’occhio per modificarne la visibilità.
- Usa il lucchetto per evitare modifiche accidentali.
- Fai doppio clic sul nome per modificarlo; conferma con <kbd>Enter</kbd> o annulla con <kbd>Escape</kbd>.

La selezione nell’albero e nell’area di lavoro resta sincronizzata. <kbd>Shift</kbd> permette di selezionare più livelli.

## Pagine

L’elenco consente di creare, aprire, rinominare ed eliminare pagine. Ogni pagina conserva posizione e livello di zoom della vista.

Il menu contestuale sposta la selezione in un’altra pagina. Al cambio di pagina Pairdraw ripristina vista e selezione.

## Slide

Il pannello delle slide elenca i frame di primo livello della pagina come miniature numerate, nell’ordine dei livelli. Fai clic su una slide per mostrare il suo frame sulla tela e trascina una slide — o premi <kbd>Alt</kbd> con una freccia su o giù — per riordinarla. **Esporta diapositive in PDF** scrive tutte le slide, in ordine, in un unico file PDF.

## Presenta

Presenta mostra le slide della pagina a schermo intero, una alla volta. Avvialo con <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Invio</kbd>, **Visualizza → Presenta** o il pulsante Presenta nella barra superiore. Le frecce, <kbd>Spazio</kbd>, <kbd>Invio</kbd>, <kbd>Pag su</kbd>/<kbd>Pag giù</kbd> e la rotellina scorrono le slide; <kbd>Esc</kbd> esce e restituisce la tela e il focus della tastiera a dove erano. Una slide più alta dello schermo viene mostrata al 100 % e si può scorrere.

## Documenti e recupero

Home si apre con un prompt: scegli sopra cosa creare (pagina di destinazione, app mobile, app web, diapositive, pannello di controllo o qualcos’altro), descrivilo e Pairdraw apre un nuovo design e invia il prompt alla sua chat con AI insieme a una guida per quel tipo; i prompt di esempio sotto lo riempiono con un’idea da modificare. Sotto il prompt puoi partire da un file Figma, da una pagina del browser integrato (app desktop) o da uno screenshot che l’agente ricrea. Le schede passano tra **Recenti**, **Bozze** e **Design system**, e il menu accanto elenca i luoghi aggiunti dal tuo server Cloud e dal tuo bucket di archiviazione. Un campo di ricerca filtra l’elenco, **Apri…** apre un file e **Design** avvia un design vuoto.

**Recenti** elenca i documenti locali recenti. Usa la vista a griglia o a elenco e ordina i file recenti per **Nome**, **Ultimo uso** o **Creazione**. <kbd>⌘</kbd>/<kbd>Ctrl</kbd>-clic aggiunge un file alla selezione, <kbd>Shift</kbd>-clic seleziona un intervallo e <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>A</kbd> seleziona tutti i file elencati; la barra di selezione li apre poi in schede dell’editor separate, li toglie da Recenti o elimina i documenti archiviati. Il menu <kbd>⋯</kbd> di un file o il suo menu contestuale offre **Rimuovi da Recenti**, che dimentica il file senza eliminarlo, e **Salva come…**, che salva una copia altrove. **Design system** elenca Pairdraw Basics, incluso nell’app, e le librerie di componenti che hai pubblicato; sceglierne una apre un nuovo design con quella libreria attiva nel pannello delle risorse.

Un nuovo design resta conservato come bozza su questo dispositivo mentre ci lavori: ogni modifica viene scritta poco dopo averla fatta, quindi chiudere la sua scheda non chiede nulla. **Bozze** in Home le elenca con un’anteprima; aprine una per continuare, o scegli **Elimina bozza** dal suo menu <kbd>⋯</kbd> o contestuale per eliminarla per sempre. Salvare una bozza in un file o in un archivio, nell’editor o con **Salva come…** in Home, la toglie dalle Bozze. Le bozze vivono solo in questo profilo del browser o in questa installazione desktop, e richiedono che **Conserva automaticamente il lavoro non salvato** sia attivo e un browser che conserva i dati del sito.

In **Impostazioni → Generali → Recupero**, **Conserva automaticamente il lavoro non salvato** controlla bozze e copie di recupero locali. Con il recupero attivo, i documenti non salvati senza percorso di file restano recuperabili anche dopo la chiusura delle loro schede. Quando Pairdraw offre **Recupera il lavoro non salvato**, scegli **Ripristina** per riaprire un documento o **Scarta** per eliminare la sua copia di recupero.

Un file che hai aperto conserva anche una copia di sicurezza delle modifiche che non sono ancora state salvate con lui, scritta mentre il salvataggio automatico è disattivato o quando la finestra si chiude prima che il salvataggio automatico le abbia scritte. La prossima volta che quel file si apre, **Modifiche recuperate** offre **Salva** per scriverle nel file, **Salva come…** per aprirle a parte e salvarle come un nuovo file, o **Non salvare** per lasciare il file com’è e scartare la copia. Chiudere la finestra di dialogo conserva la copia per la prossima volta. Salvare il file scarta le sue copie più vecchie, e nel browser una copia più vecchia dell’ultima modifica del file non viene offerta. Una copia il cui file non è stato aperto per una settimana, per esempio perché il file è stato spostato, compare anch’essa in **Recupera il lavoro non salvato**.

Disattivare il recupero arresta la conservazione automatica e rimuove le copie di recupero dei documenti attualmente aperti. Non elimina in blocco le istantanee dei documenti chiusi in precedenza. Il recupero è locale a questa installazione o a questo profilo del browser; non sostituisce il salvataggio di un file, la sincronizzazione sul cloud né un backup.

## Proprietà

Il pannello destro mostra i controlli applicabili alla selezione: posizione, dimensioni, aspetto, riempimenti, contorni, effetti, tipografia, disposizione ed esportazione.

Senza selezione mostra sfondo e variabili della pagina corrente.
