---
title: Componenti
description: Componenti riutilizzabili, istanze, set di componenti, sostituzioni, sincronizzazione automatica e librerie in Pairdraw.
---

# Componenti

I componenti sono oggetti riutilizzabili. Modifica il componente principale e tutte le sue istanze si aggiornano automaticamente.

## Esplorare e inserire

Apri la scheda **Risorse** nel pannello sinistro per sfogliare i componenti locali e le librerie abilitate. Usa la vista a griglia o a elenco, cerca per nome del componente e seleziona un componente per vederne i dettagli. Inserisci una risorsa con un clic, con <kbd>Enter</kbd> o trascinandola nell’area di lavoro.

Le risorse locali sono raggruppate per pagina di origine. Le risorse delle librerie pubblicate restano disponibili quando la loro revisione è stata scaricata, anche se il provider remoto è temporaneamente offline.

## Creare un componente

Seleziona un frame o un gruppo e premi <kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd> (<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>K</kbd>). La selezione diventa un componente riutilizzabile.

Qualsiasi altro livello, o più livelli, viene racchiuso in un nuovo componente bianco grande quanto il loro riquadro, al posto del livello più in alto nell’elenco dei livelli; un singolo livello racchiuso dà il proprio nome al componente.

Sopra i componenti compare un’etichetta viola con un’icona a diamante.

## Set di componenti e varianti

Seleziona due o più componenti e scegli **Crea set di componenti** dal menu contestuale per riunirli in un set di componenti: un contenitore con bordo viola tratteggiato e 20 px di margine interno attorno ai figli, come in Figma. I set creati da script con `figma.combineAsVariants()` racchiudono esattamente i loro componenti, come fa la Plugin API di Figma.

Ogni componente di un set può definire valori su più dimensioni di variante, come `Size=Small`, `State=Hover` e `Theme=Dark`. Pairdraw supporta combinazioni sparse, quindi un set non deve contenere ogni combinazione possibile. La variante in alto a sinistra è quella predefinita e fa da ripiego quando un aggiornamento non contiene più una combinazione esatta.

Seleziona un componente e premi **Aggiungi variante** nell’intestazione del pannello per trasformarlo in un set di componenti, come fa Figma: il componente diventa `Property 1=Default` e sotto compare una copia chiamata `Property 1=Variant2`. Su un set, **Aggiungi variante** copia l’ultima variante con il valore successivo. Le proprietà di variante del set sono righe del suo elenco **Proprietà**; fai clic su una per rinominarla o per aggiungere, rinominare, riordinare trascinando o rimuovere i suoi valori. Rimuovere un valore ancora usato da varianti le sposta prima su un altro valore, e le varianti che condividono tutti i valori sono indicate in un avviso che le seleziona.

## Proprietà del componente

Componenti e set di componenti supportano proprietà riutilizzabili di testo, visibilità booleana, scambio di istanza e slot. Seleziona un’istanza per modificarne i valori senza scollegarla. Proprietà e valori si conservano quando salvi e riapri file `.fig`.

Per collegare un livello di un componente principale a una proprietà, usa il pulsante di collegamento accanto al suo campo: **Tipografia** per il contenuto del testo, **Aspetto** per la visibilità e l’intestazione dell’istanza per il componente scambiato. Crea una proprietà dal valore attuale del livello o scegline una esistente; il campo mostra poi la proprietà al posto del valore. Scrivere in un testo collegato imposta la proprietà: il suo valore predefinito nel componente principale, il valore dell’istanza in un’istanza.

Seleziona il componente principale per vederne le **Proprietà**. Fai clic su una proprietà per rinominarla, cambiarne il valore predefinito, vedere e scollegare i livelli che controlla o eliminarla, e trascina le proprietà per riordinarle. **+** aggiunge una proprietà di testo, booleana o di scambio di istanza.

Per mostrare le proprietà di un’istanza annidata sulle istanze del componente, scegli **+ → Istanze nidificate** e spuntala, come fa **Expose properties from nested instances** in Figma. Le istanze del componente elencano allora le sue proprietà sotto il suo nome. Si può esporre solo un’istanza il cui componente ha proprietà.

## Slot

Uno slot è un frame di un componente principale il cui contenuto ogni istanza può cambiare. Seleziona un frame dentro un componente principale e scegli **Crea slot** dal menu contestuale o dalla sezione **Slot**, oppure seleziona altri livelli per racchiuderli in un nuovo frame slot. Le impostazioni dello slot definiscono una descrizione, i componenti preferiti e quanti elementi contiene; un’istanza fuori da quei limiti mostra un avviso. In un’istanza puoi aggiungere, riordinare e rimuovere gli elementi di uno slot, o ripristinare il contenuto del componente.

## Comportamenti e anteprima

Un comportamento fa funzionare un componente principale o un set di componenti come un controllo vero, sul modello delle primitive di [Reka UI](https://reka-ui.com): Pulsante, Campo di testo, Area di testo, Campo numerico, Interruttore a pulsante, Interruttore, Casella di controllo, Pulsante di opzione, Gruppo radio, Gruppo di interruttori, Cursore, Avanzamento, Schede, Comprimibile o Fisarmonica. Seleziona il componente e usa **+** nella sezione **Comportamento** per sceglierne uno.

La sezione elenca ciò di cui il controllo ha bisogno:

- **Valori**: la proprietà che contiene ciascun valore. Una proprietà di variante o booleana per Acceso, Selezionato, Premuto, Aperto, Compilato o Disattivato (con i valori di variante che significano acceso e spento), una proprietà di testo per il testo di un campo, o minimo, massimo, passo e valore predefinito propri di un cursore.
- **Parti**: lo slot che disegna ciascuna parte, come il cursorino di un interruttore, la traccia, l’intervallo e il cursorino di un cursore, o l’elenco delle schede. Lo slot degli elementi di un gruppo contiene istanze dei suoi pulsanti di opzione, interruttori o comprimibili.
- **Stati**: una proprietà di variante i cui valori disegnano predefinito, hover, premuto, focus e disattivato. I valori con il nome di quegli stati vengono riconosciuti automaticamente.

Prima vengono le righe che il controllo richiede; le altre stanno sotto **Altre opzioni**. Quando un componente non ha ancora nulla da collegare, una riga propone di crearlo: un livello di testo e una proprietà di testo, le varianti Off e On, o uno slot, e **Stati** offre **Aggiungi varianti di stato**, che aggiunge al componente le varianti Default, Hover, Pressed, Focus e Disabled. Un componente principale isolato che riceve varianti in questo modo diventa un set di componenti, e uno slot aggiunto a un set compare in ogni variante. Finché il controllo non funziona, una riga sotto il suo nome dice cosa manca ancora; un clic porta lì.

Premi <kbd>⌥</kbd><kbd>⌘</kbd><kbd>↩</kbd> (<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>Enter</kbd>), scegli **Visualizza → Anteprima** o usa il pulsante ▶ Anteprima nella barra superiore per vedere l’anteprima dell’area di lavoro. Ogni livello di primo livello che contiene controlli funziona come componenti Reka UI dal vivo sopra l’area di lavoro, disegnati dalle varianti del componente: gli interruttori scattano, i cursori si trascinano, schede e fisarmoniche si aprono, e i campi di testo sono input veri con il cursore, la selezione e l’incolla del browser. L’anteprima non cambia mai il documento né la sua cronologia. **Ripristina** riporta ogni controllo com’è stato progettato, e <kbd>Esc</kbd> o il pulsante di chiusura della pillola tornano alla modifica. Nella vista divisa ogni area di lavoro mostra la propria anteprima.

I comportamenti si salvano nei file `.fig` e vengono pubblicati con i componenti delle librerie.

## Librerie di componenti {#component-libraries}

Una libreria di componenti pubblica componenti riutilizzabili come una revisione immutabile. Ogni risorsa pubblicata ha un’identità stabile di libreria, risorsa e revisione, così istanze diverse possono restare su revisioni diverse finché non le aggiorni esplicitamente.

**Pairdraw Basics** è il set originale incluso: componenti di pulsante, input, badge, scheda e avatar, pubblicati come `pairdraw-basics`. È nel pannello Risorse senza catalogo: abilitalo lì per inserirne i componenti, anche offline, e resta dopo un ricaricamento. `pairdraw libraries seed --root ./catalog` pubblica ancora lo stesso set in un catalogo su file system.

### Pubblicare una libreria

1. Crea i componenti e i set di componenti che vuoi condividere.
2. Apri **Risorse** e seleziona **Gestire le librerie**.
3. Seleziona **Pubblica libreria**.
4. Inserisci un ID di libreria stabile e un nome visualizzato. L’ID della libreria si blocca dopo la prima pubblicazione.
5. Facoltativamente cerca nell’elenco delle modifiche e inserisci una descrizione della revisione.
6. Seleziona le risorse aggiunte, modificate, rinominate o rimosse da includere.
7. Conferma la destinazione e seleziona **Pubblica libreria**.

Nelle pubblicazioni successive, le modifiche non spuntate restano in sospeso. Le risorse invariate mantengono le definizioni pubblicate in precedenza, e le definizioni rimosse restano disponibili finché i documenti fanno ancora riferimento alla loro revisione storica.

### Abilitare e inserire risorse di libreria

Apri **Risorse → Gestire le librerie** per abilitare una libreria pubblicata. I suoi componenti compaiono nel pannello Risorse accanto a quelli locali. Inseriscine uno con un clic, con la tastiera o trascinandolo nell’area di lavoro.

Le definizioni pubblicate sono di sola lettura nei documenti che le usano. Modifica il documento di origine e pubblica un’altra revisione per cambiare una definizione. Le istanze collegate a quelle definizioni restano modificabili tramite proprietà del componente e sostituzioni.

### Rivedere e accettare gli aggiornamenti

Apri **Gestire le librerie → Aggiornamenti** per trovare revisioni più recenti. La ricerca non modifica il documento. Puoi confrontare l’istanza attuale e quella aggiornata fianco a fianco, spostarti tra le istanze interessate e poi aggiornare:

- l’istanza selezionata;
- tutte le istanze di una risorsa;
- le istanze nella pagina corrente;
- le istanze in tutte le pagine.

Pairdraw conserva le assegnazioni compatibili di testo, visibilità e scambio di istanza. Se una variante esatta non esiste più, la revisione indica il ripiego in alto a sinistra prima che tu accetti. Applicare un aggiornamento crea un passo di annullamento.

### Uso locale, con archiviazione e offline

Le librerie possono usare il catalogo locale del browser o un provider di archiviazione configurato. La pubblicazione remota usa oggetti di revisione immutabili e un puntatore condizionale all’ultima revisione, così due persone che pubblicano non si sovrascrivono a vicenda senza accorgersene.

Le revisioni scaricate vengono conservate in cache localmente. Un documento può continuare a disegnare e inserire le definizioni scaricate mentre è offline. Gli errori di integrità vengono segnalati invece di essere nascosti dai dati in cache.

### Salvare i documenti che usano librerie

I collegamenti alle librerie abilitate e le definizioni materializzate si salvano con i documenti `.fig`. Riaprire un file che usa una libreria conserva le sue istanze collegate e le identità di revisione, anche quando la libreria remota non è disponibile.

## Creare un’istanza

Fai clic destro su un componente e seleziona **Crea istanza** dal menu contestuale. L’istanza compare 40 px a destra del componente di origine, visivamente identica. Puoi anche inserire un componente da **Risorse**. L’istanza mantiene un collegamento al componente principale.

Nella barra degli strumenti non c’è un pulsante per creare istanze: si usa il menu contestuale.

## Scollegare un’istanza

Seleziona un’istanza e premi <kbd>⌥</kbd><kbd>⌘</kbd><kbd>B</kbd> (<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>B</kbd>) per scollegarla. L’istanza diventa un frame normale senza collegamento al componente originale. Tutte le sostituzioni vengono incorporate.

## Convertire in frame

Seleziona un componente principale e premi <kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd> (<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>K</kbd>), gli stessi tasti di **Crea componente**, oppure scegli **Converti in cornice** dal suo menu contestuale, dal menu del tipo di livello o da **Oggetto › Converti in cornice**, per riportarlo a frame. Se il componente ha istanze, una conferma dice quante sono; la conversione scollega ogni istanza in un frame che mantiene il suo aspetto, comprese le copie annidate nelle istanze di altri componenti. L’intera modifica è un solo passo di annullamento.

## Vai al componente principale

Fai clic destro su un’istanza e seleziona **Vai al componente principale**. L’editor raggiunge e seleziona il componente principale, cambiando pagina se serve.

## Sincronizzazione automatica

Quando modifichi un componente, tutte le sue istanze si aggiornano automaticamente, come in Figma: ogni proprietà che un’istanza non sostituisce segue il componente. Questo vale per dimensioni, riempimenti, contorni e il loro spessore, allineamento, estremità, giunzioni e tratteggi, effetti, opacità, metodo di fusione, raggi e arrotondamento degli angoli, impostazioni di layout e griglie, ritaglio, stili condivisi e testo, dal carattere e la dimensione fino a spaziatura tra le lettere, interlinea, maiuscole, decorazione, allineamento e intervalli con stile.

Un livello dentro un’istanza prende dal componente anche posizione, rotazione, ribaltamenti, vincoli e maschera. Sposta o ruota un livello nel componente e si sposta in ogni istanza. Quando un’istanza ha dimensioni diverse dal suo componente, il livello viene posizionato secondo i suoi vincoli, così un livello fissato a destra mantiene la distanza dal bordo destro. Dentro una disposizione automatica, è la disposizione a posizionarlo.

La sincronizzazione parte automaticamente dopo modifiche, spostamenti e ridimensionamenti di oggetti all’interno di un componente.

## Sostituzioni

Le istanze possono sostituire proprietà specifiche senza rompere il collegamento. Quando una proprietà è sostituita in un’istanza, la sincronizzazione la salta; le altre proprietà continuano ad aggiornarsi dal componente principale.

### Proprietà sostituibili

Un livello dentro un’istanza può sostituire nome, testo, intervalli con stile e carattere, tutte le proprietà visive e di testo elencate sopra, le dimensioni e il fatto di essere visibile o bloccato. Posizione, rotazione, ribaltamenti, vincoli e maschera non si possono sostituire: vengono sempre dal componente. Gli script che ne impostano posizione, rotazione, vincoli o maschera ricevono l’errore di Figma. Il contenuto degli slot appartiene all’istanza e resta modificabile.

Le sostituzioni in un file `.fig` tornano come sostituzioni quando lo apri, e vengono salvate come le scrive Figma.

### Nuovi figli

Quando aggiungi un figlio a un componente, tutte le istanze esistenti ne ricevono automaticamente una copia. L’ordine dei figli nelle istanze corrisponde sempre a quello del componente.

### Modalità delle variabili

Un’istanza, o un livello al suo interno, che imposta la modalità di una raccolta di variabili mantiene quella modalità e continua a ricevere le modalità del componente per tutte le altre raccolte. Cambia la modalità di densità del componente principale e un’istanza che ha cambiato solo il tema segue la nuova densità.

### Scambiare un’istanza

Seleziona un’istanza, anche annidata, e fai clic sul pulsante di scambio nella sua intestazione per mostrare un altro componente al suo posto. L’elenco contiene tutti i componenti del documento; uno che conterrebbe sé stesso è disattivato. Un’istanza annidata scambiata resta scambiata quando cambia il componente che la contiene. Quando lo scambio è collegato a una proprietà di scambio di istanza, l’intestazione mostra la proprietà.

### Sostituire un livello dentro un’istanza

Copia un livello, seleziona un livello dentro un’istanza e premi <kbd>⌥</kbd><kbd>⇧</kbd><kbd>R</kbd> (<kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd>) o scegli **Sostituisci nell’istanza** dal menu Modifica o dal menu contestuale. Il livello copiato prende posto e posizione di quello selezionato come sostituzione dell’istanza, senza scollegarla: il resto dell’istanza continua a seguire il componente, e il livello sostitutivo resta quando il componente cambia, finché il componente non elimina il livello che ha sostituito. Con più livelli selezionati, ognuno riceve la propria copia. Se dentro un’istanza non è selezionato nulla, gli stessi tasti incollano sostituendo.

Seleziona il livello sostitutivo e fai clic su **Ripristina livello del componente** nella sua intestazione per riportare il livello del componente. Le sostituzioni si salvano nei file `.fig` come dati di plugin di Pairdraw sull’istanza; Figma mostra invece il livello del componente.

## Selezione con il clic

Componenti e istanze sono contenitori opachi: un clic su un figlio seleziona il componente stesso, non il figlio. **Fai doppio clic** per entrare nel componente e selezionare i figli al suo interno.

## Aspetto visivo

| Elemento | Aspetto |
|----------|---------|
| Etichetta del componente | Viola con icona a diamante, sempre visibile |
| Etichetta dell’istanza | Viola con icona a diamante, sempre visibile |
| Bordo del set di componenti | Contorno viola tratteggiato |

## Scorciatoie da tastiera

| Azione | Mac | Windows / Linux |
|--------|-----|-----------------|
| Creare un componente | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd> | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>K</kbd> |
| Scollegare un’istanza | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>B</kbd> | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>B</kbd> |
| Anteprima | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>↩</kbd> | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>Enter</kbd> |

## Suggerimenti

- Modificare il testo dentro un’istanza crea una sostituzione: il testo non viene sovrascritto quando il componente cambia.
- Usa i set di componenti per organizzare varianti multidimensionali come dimensione, stato e tema.
- Pubblica le risorse riutilizzabili dal loro documento di origine; le definizioni pubblicate sono volutamente di sola lettura nei documenti che le usano.
- Rivedi gli aggiornamenti prima di accettarli quando una revisione rimuove una combinazione esatta di varianti.
- Vedi [Menu contestuale](./context-menu) per tutte le azioni relative ai componenti.
