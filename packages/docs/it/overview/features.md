# Funzionalità

## File Figma

Pairdraw apre e salva direttamente i file `.fig`. Import ed export usano lo stesso codec binario Kiwi di Figma: 194 definizioni dello schema e circa 390 campi per ogni nodo. Salva con <kbd>⌘</kbd><kbd>S</kbd> e salva con nome con <kbd>⇧</kbd><kbd>⌘</kbd><kbd>S</kbd>.

**Copia e incolla con Figma:** seleziona gli oggetti in Figma, premi <kbd>⌘</kbd><kbd>C</kbd>, passa a Pairdraw e premi <kbd>⌘</kbd><kbd>V</kbd>. Riempimenti, contorni, disposizione automatica, testo, effetti, raggi degli angoli e reti vettoriali vengono conservati in entrambe le direzioni.

## Disegno e modifica

- **Forme:** rettangolo (<kbd>R</kbd>), ellisse (<kbd>O</kbd>), linea (<kbd>L</kbd>), poligono e stella.
- **Penna:** reti vettoriali, curve di Bézier e maniglie tangenti.
- **Testo:** modifica diretta nel canvas e supporto IME.
- **Testo formattato:** grassetto, corsivo, sottolineato e barrato su intervalli di caratteri.
- **Disposizione automatica:** Flexbox e CSS Grid tramite Yoga WASM, con direzione, intervallo, rientri, allineamento, dimensionamento e tracce della griglia.
- **Componenti:** creazione di componenti e set, istanze, override e sincronizzazione automatica.
- **Livelli script:** Il contenuto di un livello è disegnato da un programma JavaScript salvato nel documento. I controlli `@input` si possono collegare alle variabili; le modifiche al codice, agli input o alla dimensione avviano una nuova esecuzione e il risultato si converte in livelli normali con un passaggio ([Livelli script](/user-guide/script-layers)).
- **Prototipi:** Le interazioni al clic o dopo un ritardo portano a un frame, aprono o chiudono una sovrapposizione o tornano indietro; si riproducono nell’area di lavoro con una transizione istantanea o in dissolvenza ([Riprodurre un prototipo](/user-guide/playing-a-prototype)).
- **Variabili:** token di design con collezioni, modalità Light/Dark, tipi Color/Float/String/Boolean e collegamenti.
- **Sezioni:** contenitori di primo livello che integrano gli oggetti sovrapposti.

## Pannello Proprietà

Le schede Design, Codice e Verifica cambiano in base alla selezione; la chat AI ha una colonna tutta sua.

- **Aspetto:** opacità, raggio comune o per angolo e visibilità.
- **Riempimento:** colore solido, gradienti lineare, radiale, angolare e diamante, immagini.
- **Contorno:** colore, spessore, allineamento, spessore per lato, estremità, giunzioni e tratteggio.
- **Effetti:** ombra esterna e interna, sfocatura del livello, dello sfondo e del primo piano.
- **Tipografia:** scelta del font con ricerca e scorrimento virtuale, stile, dimensione, allineamento e formattazione.
- **Layout:** impostazioni della disposizione automatica.
- **Export:** scala, PNG/JPG/WEBP/SVG e anteprima.
- **Codice:** Design JSX e Tailwind JSX per la selezione, con modifica bidirezionale in tempo reale del Design JSX che aggiorna il codice al variare dei livelli; l’elemento sotto il cursore evidenzia il proprio livello nell’area di lavoro e i problemi di design sono sottolineati sulla proprietà che li causa.
- **Verifica:** controllo di design in tempo reale per la pagina o la selezione (contrasto basso, aree di tocco piccole, colori non collegati, spaziature fuori scala), controllato mentre la scheda è aperta, con collegamento alle variabili con un clic ([Controllare i design](/user-guide/checking-designs)).

## Rendering

Pairdraw usa Skia tramite CanvasKit WASM, lo stesso motore grafico di Figma:

- gradienti lineari, radiali, angolari e a diamante;
- riempimenti immagine con diverse modalità di scala;
- cache degli effetti per oggetto;
- archi, ellissi parziali e anelli;
- esclusione degli oggetti fuori dalla vista e riuso delle vernici;
- guide di aggancio che considerano la rotazione;
- righelli con intervallo della selezione;
- evidenziazione al passaggio sulla geometria reale.

## Annulla e ripristina

È possibile annullare creazione, eliminazione, spostamento, ridimensionamento, modifica delle proprietà e del genitore, disposizione e variabili. Scorciatoie: <kbd>⌘</kbd><kbd>Z</kbd> e <kbd>⇧</kbd><kbd>⌘</kbd><kbd>Z</kbd>.

## Più pagine e documenti

Le pagine possono essere create, eliminate e rinominate e conservano posizione e scala proprie. Più documenti possono essere aperti in schede.

## Export

- **Immagini:** PNG, JPG e WEBP da 0,5× a 4×.
- **SVG:** forme, testo con intervalli di stile, gradienti, effetti e metodi di fusione.
- **Tailwind JSX:** HTML con classi Tailwind v4 per React o Vue.
- **Copia come:** testo, SVG, PNG o JSX dal menu contestuale.

```sh
pairdraw export design.fig -f jsx --style tailwind
```

## Chat AI

Premi <kbd>⌘</kbd><kbd>J</kbd>. Più di 90 strumenti creano forme, cambiano stili e disposizione, lavorano con componenti e variabili, eseguono operazioni booleane, analizzano token di design ed esportano risorse. Sono supportati Anthropic, OpenAI, Google AI, OpenRouter ed endpoint compatibili.

Le chiamate degli strumenti appaiono in una sequenza comprimibile. Per la verifica visiva, l’assistente renderizza il risultato e lo confronta con la richiesta. Tutte le modifiche AI possono essere annullate.

Puoi guardare un agente disegnare: ogni livello che aggiunge si disegna uno dopo l’altro, i frame in cui lavora luccicano e, quando ha finito, un avviso conta ciò che ha aggiunto e modificato. **Anima le modifiche dell’IA** nelle Impostazioni lo disattiva ([Watching the assistant draw](/programmable/ai-chat#watching-the-assistant-draw)).

## Browser integrato

Le pagine `http` e `https` si aprono in una finestra propria dell’app desktop, che non condivide nulla con l’editor, e si possono portare nell’area di lavoro: importa l’intera pagina o un elemento scelto come livelli, oppure inserisci uno screenshot della vista, della pagina o di un elemento. Il chat può leggere la pagina, contrassegnare un elemento nella risposta e fare clic, digitare, premere un tasto, scorrere o attendere su di essa, chiedendo prima conferma quando le impostazioni la chiedono per le modifiche.

In una board già esistente lo stesso browser diventa ricerca (Pairdraw non offre nuove board): la chat cita la pagina in una nota adesiva che conserva indirizzo, titolo, citazione e ora di lettura ([Ricerca su una board](/user-guide/research)).

## Server MCP

Claude Code, Cursor, Windsurf e altri client MCP possono leggere e modificare `.fig` senza interfaccia. Sono disponibili più di 90 strumenti e i trasporti stdio e HTTP.

```sh
npm install -g @pairdraw/mcp
```

## CLI

```sh
pairdraw tree design.fig              # Albero degli oggetti
pairdraw find design.fig --type TEXT  # Ricerca
pairdraw export design.fig -f png     # Esporta
pairdraw analyze colors design.fig    # Analisi colori
pairdraw analyze clusters design.fig  # Strutture ripetute
pairdraw eval design.fig -c "..."     # Figma Plugin API
```

Tutti i comandi supportano `--json`. Installazione: `npm install -g @pairdraw/cli` oppure `bun add -g @pairdraw/cli`.

## Collaborazione

Gli agenti AI mostrano sull’area di lavoro i loro cursori e i livelli che modificano, e la vista li segue mentre lavorano. Più persone modificano insieme i documenti Cloud attraverso un server [Pairdraw Cloud](/user-guide/pairdraw-cloud) ospitato in proprio, con cursori, presenza e modalità di seguito. Le stanze live per i documenti locali, l’accesso tramite link e le chiamate vocali non fanno parte di Pairdraw ([Collaborazione](/it/programmable/collaboration)).

## Desktop e Web

**Desktop:** Tauri v2, programma di installazione di circa 20 MB su macOS; le versioni pronte sono pubblicate per macOS su Apple Silicon, mentre Windows, Linux e i Mac Intel si compilano dal codice sorgente, con menu nativi, uso senza rete e salvataggio automatico.

**Web:** nel browser, da una tua build o da un server Pairdraw Cloud, installabile come PWA e adattato agli schermi touch.

**VS Code:** Un editor dedicato ai documenti `.fig` e `.pen` che esegue l’editor web in una webview e salva ciò che mostra. Non è pubblicato in alcun marketplace, quindi si compila dal repository ([Estensione VS Code](/programmable/vscode)).

## Plugin

In **Impostazioni → App → Estensioni** si installano i manifest dei plugin, e il comando di un plugin si esegue dalla palette dei comandi sul documento aperto, dopo aver chiesto cosa può fare. Un solo plugin viene eseguito alla volta e l’accesso alla rete viene rifiutato ([Plugin](/user-guide/plugins)).

## Caricamento alternativo da Google Fonts

Se un font non è disponibile localmente, Pairdraw lo scarica automaticamente da Google Fonts. Non è necessaria l’installazione manuale.
