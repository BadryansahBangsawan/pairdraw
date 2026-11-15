---
title: Disegnare forme
description: Creare rettangoli, ellissi, linee, frame, sezioni, poligoni e stelle.
---

# Disegnare forme

La barra degli strumenti a sinistra dell’area di lavoro contiene gli strumenti per creare forme, frame e sezioni. Selezionane uno, poi fai clic e trascina nell’area di lavoro.

## Strumenti

| Strumento | Tasto | Risultato |
|-----------|-------|-----------|
| Rettangolo | <kbd>R</kbd> | Disegna un rettangolo |
| Ellisse | <kbd>O</kbd> | Disegna un’ellisse |
| Linea | <kbd>L</kbd> | Disegna una linea |
| Frame | <kbd>F</kbd> o <kbd>A</kbd> | Disegna un frame (contenitore di altri oggetti) |
| Sezione | <kbd>Shift</kbd> + <kbd>S</kbd> | Disegna una sezione (adotta gli oggetti allo stesso livello che copre interamente) |

## Inserire immagini

Scegli **File › Inserisci immagine…** (<kbd>⇧</kbd><kbd>⌘</kbd><kbd>K</kbd>, o <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>K</kbd> su Windows e Linux) o fai clic sul pulsante immagine della barra degli strumenti, poi seleziona file PNG, JPEG, WebP, GIF, AVIF o SVG. Compaiono selezionati al centro della vista, in un solo passaggio annullabile; un SVG diventa livelli modificabili.

Lo strumento **Nota adesiva** segue Testo nella barra degli strumenti. Non ha un tasto, quindi <kbd>N</kbd> continua a zoomare sul frame successivo.

## Menu delle forme

Il menu delle forme (dalla barra degli strumenti) contiene forme aggiuntive:

- **Poligono**: crea un poligono con 3 lati per impostazione predefinita (un triangolo).
- **Stella**: crea una stella a 5 punte con raggio interno di 0,38.

Poligono e Stella non hanno una scorciatoia da tastiera: si raggiungono dal menu delle forme nella barra degli strumenti.

## Personalizzare la barra degli strumenti

Fai clic destro sulla barra degli strumenti e scegli **Personalizza barra degli strumenti…**, o apri **Impostazioni → Editor**, per modificarla:

- Disattiva l’interruttore di uno strumento per nasconderlo. Gli strumenti nascosti mantengono le loro scorciatoie. **Sposta** è sempre visibile.
- Trascina uno strumento per riordinarlo. Rilasciato dentro un riquadro entra in quel menu; rilasciato nello spazio tra due riquadri diventa un pulsante a sé; rilasciato su un altro strumento, i due condividono un menu.
- Il menu **⋯** di uno strumento lo sposta in su o in giù, lo raggruppa con lo strumento sopra o lo separa dal suo menu. Anche la sua maniglia lo sposta con <kbd>↑</kbd> e <kbd>↓</kbd>.
- **Inserisci icona** esegue un comando invece di scegliere uno strumento, quindi può essere spostato e nascosto ma non entrare in un menu.

**Ripristina predefiniti** ripristina la disposizione originale. Gli strumenti aggiunti nelle versioni successive entrano nel loro menu predefinito, quindi anche una barra personalizzata li riceve.

## Mantenere le proporzioni

Tieni premuto <kbd>Shift</kbd> durante il trascinamento per vincolare la forma:

- Rettangolo → quadrato (larghezza e altezza uguali)
- Ellisse → cerchio
- Linea → si allinea a 0°, 45° o 90°

## Proprietà delle forme

Dopo aver disegnato una forma, selezionala per modificarne le proprietà nella scheda Design del pannello delle proprietà.

### Riempimento

Ogni forma può avere un riempimento. La sezione supporta:

- **Colore uniforme**: sceglilo con il selettore HSV o digita un valore esadecimale.
- **Sfumatura**: lineare, radiale, angolare o a diamante, con punti di colore modificabili. Mentre il selettore della sfumatura è aperto, la tela mostra le sue maniglie: trascina un’estremità o un punto del raggio per spostarlo, tieni premuto <kbd>Shift</kbd> per ruotarla a passi di 15° e trascina il quadratino di un punto di colore per farlo scorrere lungo la linea.
- **Maglia**: una griglia di punti colorati che si fondono sul livello. La scheda **Maglia** mostra ogni punto: selezionane uno per cambiarne il colore, o modifica **Colonne** e **Righe** per ricampionare la griglia (fino a 4 per lato). La maglia si applica a riempimenti e contorni; i file `.fig` conservano la griglia e altrove mostrano il suo colore, e i riempimenti `mesh_gradient` dei file `.pen` vengono importati.
- **Immagine**: scegli un file immagine come riempimento, o incolla un indirizzo in **URL dell'immagine** e scegli **Carica** per scaricare dal web un’immagine PNG, JPEG, GIF o WebP (o un URL `data:`) fino a 64 MB.
- **Shader**: uno shader GLSL animato; parti dalla galleria del selettore di riempimento shader, aggiungigli effetti, o incolla un preset copiato da shaders.com.

Un riempimento immagine si posiziona in una di cinque modalità: **Riempi** copre il livello e ritaglia l’immagine, **Adatta** mostra l’immagine intera dentro il livello, **Allunga** deforma l’immagine intera alle proporzioni del livello, **Ritaglia** permette di scegliere la parte dell’immagine da mostrare e **Affianca** ripete l’immagine. Allunga viene salvato come ritaglio dell’immagine intera, come lo salvano i file `.pen` e come lo legge Figma.

Per ritagliare o reinquadrare un’immagine sulla tela, fai doppio clic sul livello, premi <kbd>Enter</kbd> con il livello selezionato o scegli **Ritaglia immagine** dal menu contestuale o dal riempimento immagine. L’immagine appare intera, sbiadita fuori dal livello. Trascina gli angoli o le barre dei bordi del livello per ritagliarlo sopra l’immagine ferma, trascina l’immagine per spostarla dietro al livello e trascina i suoi punti d’angolo per ridimensionarla. <kbd>Shift</kbd> mantiene le proporzioni o un asse e <kbd>Alt</kbd> lavora dal centro. Ogni trascinamento è un passaggio annullabile e salva il riempimento come ritaglio; <kbd>Enter</kbd>, <kbd>Escape</kbd>, un doppio clic o un clic fuori dall’immagine termina. I vettori, i livelli con figli e i livelli posizionati dall’auto layout mantengono i loro bordi: su questi puoi solo spostare e ridimensionare l’immagine.

### Modalità shader

La modalità shader mostra un riempimento shader da solo e in grande, con riproduzione e pausa, un cursore di fase e le impostazioni dello shader accanto. Aprila con **Apri in modalità shader** nel selettore di riempimento shader, o con **Visualizza → Modalità shader** mentre la selezione ha un riempimento shader.

### Contorno

Aggiunge un contorno a qualsiasi forma. Le proprietà del contorno sono:

- **Spessore**: uniforme o per lato (sopra, destra, sotto, sinistra) con il menu di selezione dei lati.
- **Colore**: colore uniforme con opacità.
- **Allineamento**: **Interno**, **Centro** o **Esterno** rispetto al bordo della forma (il rendering basato sul ritaglio corrisponde al comportamento di Figma).
- **Estremità**: nessuna, arrotondata, quadrata, freccia a linee, freccia triangolare (per i tracciati aperti).
- **Giunzione**: a mitra, smussata, arrotondata.
- **Tratteggio**: lunghezza di tratto e spazio.

### Raggio degli angoli

Disponibile per rettangoli, frame, componenti, istanze, poligoni e stelle. Fai clic sul pulsante degli angoli indipendenti per impostare ogni angolo (in alto a sinistra, in alto a destra, in basso a sinistra, in basso a destra) separatamente; gli angoli di un poligono o di una stella condividono un unico raggio, che arrotonda anche gli angoli interni.

Sulla tela, porta il puntatore su un rettangolo selezionato per mostrare una maniglia dentro ogni angolo e trascinane una per arrotondare gli angoli. Gli angoli uguali cambiano insieme e quelli diversi uno alla volta; tieni premuto <kbd>⌥</kbd> per invertire questo comportamento e <kbd>⇧</kbd> per arrotondare alle decine. Un poligono o una stella ha una sola maniglia del raggio, sotto la punta superiore, che arrotonda tutti i suoi angoli; trascina la maniglia sulla punta successiva attorno al centro per cambiare il numero di punte, e la maniglia di una stella sul primo punto interno verso il centro o lontano da esso per cambiarne il rapporto. Le maniglie si nascondono finché la forma misura meno di 108 pixel sullo schermo; ingrandisci per raggiungerle.

### Archi di ellisse

Seleziona un’ellisse per vederne l’arco nella sezione **Aspetto**: **Inizio** è l’angolo da cui parte l’arco, in gradi; **Ampiezza** è la parte del giro completo che copre, in percentuale; **Rapporto** è la dimensione del foro centrale, in percentuale dell’ellisse, per anelli e grafici a ciambella. Digita un valore o trascina il campo; le maniglie dell’ellisse sulla tela cambiano gli stessi tre valori.

### Effetti

Aggiungi effetti visivi dalla sezione Effetti:

- **Ombra esterna**: spostamento, raggio di sfocatura, espansione, colore.
- **Ombra interna**: stessi controlli, disegnata all’interno della forma.
- **Sfocatura livello**: sfoca l’intero oggetto.
- **Sfocatura sfondo**: sfoca il contenuto dietro l’oggetto.
- **Sfocatura primo piano**: sfoca il contenuto davanti.

Fai clic su **+** per aggiungere un effetto. Ogni riga di effetto è comprimibile e ha i controlli in linea. Usa l’icona a forma di occhio per attivare o disattivare un effetto.

## Frame e sezioni

I **frame** sono contenitori. Trascina forme dentro un frame per renderle figlie, o inizia a disegnare al suo interno: una nuova forma finisce nel frame sotto il punto in cui inizi, salvo i frame bloccati, e si aggiunge in fondo a un flusso di auto layout. Disegnare un frame sopra oggetti esistenti mette al suo interno quelli non bloccati che copre interamente. I nuovi frame ritagliano il loro contenuto, come in Figma (disattiva **Ritaglia contenuto** per mostrare i figli anche fuori), e supportano la [disposizione automatica](./auto-layout).

Seleziona lo strumento Frame per sfogliare nel pannello Design le preimpostazioni comprimibili per telefoni, tablet, desktop, presentazioni, orologi, carta, social media, risorse della Figma Community e dispositivi archiviati. Scegliere una preimpostazione crea un frame con nome centrato nella vista e torna allo strumento Sposta. Con un frame esistente selezionato, usa il suo menu **Preimpostazione cornice** per ridimensionarlo senza cambiarne il nome.

Le **sezioni** sono contenitori di primo livello che adottano gli oggetti allo stesso livello che coprono interamente quando vengono disegnate, spostate o ridimensionate. Servono a organizzare tele grandi in aree logiche. Le sezioni mostrano un’etichetta con il titolo che puoi trascinare.

## Scorciatoie da tastiera

| Azione | macOS | Windows / Linux |
|--------|-------|-----------------|
| Rettangolo | <kbd>R</kbd> | <kbd>R</kbd> |
| Ellisse | <kbd>O</kbd> | <kbd>O</kbd> |
| Linea | <kbd>L</kbd> | <kbd>L</kbd> |
| Frame | <kbd>F</kbd> o <kbd>A</kbd> | <kbd>F</kbd> o <kbd>A</kbd> |
| Sezione | <kbd>⇧</kbd><kbd>S</kbd> | <kbd>Shift</kbd> + <kbd>S</kbd> |
| Vincola a quadrato o cerchio | <kbd>Shift</kbd> + trascina | <kbd>Shift</kbd> + trascina |

## Suggerimenti

- Le sezioni esistono solo al primo livello: non possono essere annidate nei frame.
- Usa i frame con la [disposizione automatica](./auto-layout) per creare layout adattivi.
- [Esporta](./exporting) singole forme o gruppi come immagini dal pannello delle proprietà o dal menu contestuale.
