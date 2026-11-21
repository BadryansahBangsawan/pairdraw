# Funzionalità

## File Figma

Pairdraw apre e salva direttamente i file `.fig`. Import ed export usano lo stesso codec binario Kiwi di Figma: 605 definizioni dello schema e circa 590 campi per ogni nodo. Salva con <kbd>⌘</kbd><kbd>S</kbd> e salva con nome con <kbd>⇧</kbd><kbd>⌘</kbd><kbd>S</kbd>.

**Copia e incolla con Figma:** seleziona gli oggetti in Figma, premi <kbd>⌘</kbd><kbd>C</kbd>, passa a Pairdraw e premi <kbd>⌘</kbd><kbd>V</kbd>. Riempimenti, contorni, disposizione automatica, testo, effetti, raggi degli angoli e reti vettoriali vengono conservati in entrambe le direzioni.

## Disegno e modifica

- **Forme:** rettangolo (<kbd>R</kbd>), ellisse (<kbd>O</kbd>), linea (<kbd>L</kbd>), poligono e stella.
- **Penna:** reti vettoriali (non semplici tracciati), curve di Bézier con maniglie tangenti.
- **Matita** (<kbd>⇧</kbd><kbd>P</kbd>): tratti a mano libera levigati in curve modificabili.
- **Testo:** modifica diretta nell’area di lavoro con supporto IME; doppio clic per entrare in modifica.
- **Testo formattato:** grassetto (<kbd>⌘</kbd><kbd>B</kbd>), corsivo (<kbd>⌘</kbd><kbd>I</kbd>), sottolineato (<kbd>⌘</kbd><kbd>U</kbd>) e barrato per singoli caratteri.
- **Disposizione automatica:** Flexbox e CSS Grid tramite Yoga WASM, con direzione, intervallo, rientri, distribuzione, allineamento, dimensionamento dei figli e tracce della griglia. <kbd>⇧</kbd><kbd>A</kbd> la attiva o disattiva.
- **Componenti:** creazione (<kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd>), set di componenti, istanze con override, slot e sincronizzazione automatica.
- **Comportamenti e anteprima:** i componenti funzionano come controlli Reka UI (interruttore, cursore, schede, campo di testo, fisarmonica, …) e si provano dal vivo sopra l’area di lavoro con <kbd>⌥</kbd><kbd>⌘</kbd><kbd>↩</kbd> ([Componenti](/it/user-guide/components)).
- **Livelli script:** il contenuto di un livello è disegnato da un programma JavaScript salvato nel documento. I controlli `@input` si possono collegare alle variabili; le modifiche al codice, agli input o alla dimensione avviano una nuova esecuzione e il risultato si converte in livelli normali con un passaggio ([Livelli script](/user-guide/script-layers)).
- **Prototipi:** le interazioni al clic, al passaggio del mouse, alla pressione, all’ingresso o all’uscita del mouse o dopo un ritardo portano a un frame, aprono o chiudono una sovrapposizione, tornano indietro, cambiano la variante di un componente o scorrono fino a un livello, con frame che scorrono; si riproducono nell’area di lavoro con una transizione istantanea, in dissolvenza o con animazione intelligente ([Riprodurre un prototipo](/user-guide/playing-a-prototype)).
- **Variabili:** token di design con collezioni, modalità (Light/Dark), tipi Color/Float/String/Boolean e collegamenti.
- **Sezioni:** contenitori organizzativi che adottano automaticamente i figli, con un’etichetta del titolo.

## Disposizione dell’editor

L’editor si apre con la sola area di lavoro. Gli strumenti stanno a sinistra dell’area di lavoro, con il pulsante del pannello dei livelli sopra, e lo zoom nell’angolo in basso a destra. Il pannello delle proprietà compare quando selezioni un livello e scompare con la selezione; un pannello aperto dal suo pulsante resta aperto. Mentre la chat AI è chiusa, un prompt in fondo all’area di lavoro le invia ciò che scrivi. L’app parte con il tema scuro; **Impostazioni → Generali → Tema** offre anche **Chiaro** e **Automatico**.

- **Trova livelli:** <kbd>⌘</kbd><kbd>F</kbd> cerca per nome tra i livelli della pagina mostrata, seleziona quello scelto e lo porta in vista.
- **Extra:** il pulsante con il regalo nella barra superiore raccoglie elementi da cui partire: stili da fissare alla chat AI, design system da attivare, script inseriti come livelli di codice e shader pronti.

## Pannello Proprietà

Le schede **Design** e **Codice** cambiano in base alla selezione, con **Verifica** accanto; la chat AI ha una colonna tutta sua.

- **Aspetto:** opacità, raggio comune o per angolo e visibilità.
- **Riempimento:** colore solido, gradienti (lineare, radiale, angolare, diamante, mesh), immagini.
- **Contorno:** colore, spessore, allineamento (interno, centrato, esterno), spessore per lato, estremità, giunzioni e tratteggio.
- **Effetti:** ombra esterna e interna, sfocatura del livello, dello sfondo e del primo piano.
- **Tipografia:** scelta del font con ricerca e scorrimento virtuale, peso, dimensione, allineamento e pulsanti di stile.
- **Layout:** impostazioni della disposizione automatica, quando è attiva.
- **Export:** scala, formato (PNG, JPG, WEBP, SVG, PDF, HTML), qualità e anteprima in tempo reale.
- **Codice:** Design JSX, HTML e componenti Vue e React per la selezione, con stili CSS o Tailwind, e modifica bidirezionale in tempo reale del Design JSX che aggiorna il codice al variare dei livelli; l’elemento sotto il cursore evidenzia il proprio livello nell’area di lavoro e i problemi di design sono sottolineati sulla proprietà che li causa.
- **Verifica:** controllo di design in tempo reale per la pagina o la selezione (contrasto basso, aree di tocco piccole, colori non collegati, spaziature fuori scala), controllato mentre la scheda è aperta, con collegamento alle variabili con un clic ([Controllare i design](/user-guide/checking-designs)).

## Rendering

Pairdraw usa Skia tramite CanvasKit WASM, lo stesso motore grafico di Figma:

- gradienti lineari, radiali, angolari e a diamante;
- riempimenti immagine con diverse modalità di scala e regolazioni (esposizione, contrasto, saturazione, temperatura, tinta, luci, ombre);
- cache degli effetti per oggetto;
- archi (ellissi parziali, anelli);
- esclusione degli oggetti fuori dalla vista e riuso delle vernici;
- guide di aggancio che considerano la rotazione;
- righelli con indicatori della selezione;
- evidenziazione al passaggio che segue la geometria reale.

## Annulla e ripristina

Ogni operazione si può annullare: creazione, eliminazione, spostamento, ridimensionamento, modifica delle proprietà e del genitore, disposizione e operazioni sulle variabili. Pairdraw usa uno schema a comandi inversi. Scorciatoie: <kbd>⌘</kbd><kbd>Z</kbd> e <kbd>⇧</kbd><kbd>⌘</kbd><kbd>Z</kbd>.

## Documenti con più pagine

Le pagine possono essere aggiunte, eliminate e rinominate, e ognuna conserva la propria vista. Fai doppio clic su una pagina per rinominarla.

## Più file in schede

Apri più documenti in schede: <kbd>⌘</kbd><kbd>T</kbd> apre una nuova scheda, <kbd>⌘</kbd><kbd>W</kbd> la chiude e <kbd>⌘</kbd><kbd>O</kbd> apre un file.

## Export

- **Immagini:** PNG, JPG e WEBP con scala configurabile (da 0,5× a 4×), dal pannello, dal menu contestuale o con <kbd>⇧</kbd><kbd>⌘</kbd><kbd>E</kbd>.
- **SVG:** forme, testo con intervalli di stile, gradienti, effetti e metodi di fusione.
- **PDF:** un livello per pagina, oppure **File → Esporta cornici in PDF…** per i frame della pagina.
- **HTML:** una pagina o un frammento con CSS semplice o classi Tailwind.
- **Tailwind JSX:** HTML con classi Tailwind v4 per React o Vue.
- **Copia come:** testo, SVG, PNG (<kbd>⇧</kbd><kbd>⌘</kbd><kbd>C</kbd>) o JSX dal menu contestuale.

CLI:

```sh
pairdraw export design.fig -f jsx --style tailwind
```

## Chat AI

Premi <kbd>⌘</kbd><kbd>J</kbd> per aprire l’assistente AI nella sua colonna accanto al pannello delle proprietà, oppure scrivi nel prompt in fondo all’area di lavoro o in Home. Senza un modello configurato, la chat usa un agente di programmazione già installato sul computer: Claude Code, Codex o Gemini CLI. Più di 130 strumenti creano forme, cambiano stili e disposizione, lavorano con componenti e variabili, eseguono operazioni booleane, analizzano token di design ed esportano risorse. Puoi collegare Anthropic, OpenAI, Google AI, OpenRouter, qualsiasi endpoint compatibile o l’AI offerta dal tuo server [Pairdraw Cloud](/user-guide/pairdraw-cloud#ai-on-cloud). Ogni provider, modello e agente mostra il logo del suo produttore.

Le chiamate degli strumenti appaiono come voci comprimibili di una sequenza. Per la verifica visiva, l’assistente renderizza il risultato e lo confronta con la richiesta. Tutte le modifiche AI possono essere annullate.

Puoi guardare un agente disegnare: ogni livello che aggiunge si disegna uno dopo l’altro, i frame in cui lavora luccicano e, quando ha finito, un avviso conta ciò che ha aggiunto e modificato. **Anima le modifiche dell’IA** nelle Impostazioni lo disattiva ([Guardare l’assistente disegnare](/it/programmable/ai-chat#watching-the-assistant-draw)).

Vedi [Chat con AI](/it/programmable/ai-chat) per la configurazione e i dettagli sui provider.

## Browser integrato

Le pagine `http` e `https` si aprono in una finestra desktop propria, che non condivide nulla con l’editor, e si possono portare nell’area di lavoro: importa l’intera pagina o un elemento scelto come livelli, oppure inserisci uno screenshot della vista, della pagina o di un elemento. La chat può leggere la pagina, contrassegnare un elemento nella risposta e fare clic, digitare, premere un tasto, scorrere o attendere su di essa, chiedendo prima conferma quando le impostazioni la chiedono per le modifiche.

In una board già esistente lo stesso browser diventa ricerca: la chat cita la pagina in una nota adesiva che conserva indirizzo, titolo, citazione e tempo di lettura ([Ricerca su una board](/user-guide/research)). Pairdraw non crea nuove board.

## Server MCP

Claude Code, Cursor, Windsurf e qualsiasi client MCP leggono e modificano il documento aperto nell’editor in esecuzione. Sono disponibili 139 strumenti e due trasporti: stdio e HTTP.

```sh
npm install -g @pairdraw/mcp
```

```json
{
  "mcpServers": {
    "pairdraw": {
      "command": "pairdraw-mcp"
    }
  }
}
```

Vedi il [riferimento degli strumenti MCP](/programmable/mcp-server) per l’elenco completo.

## CLI

Ispeziona, esporta e analizza i file `.fig` dal terminale:

```sh
pairdraw tree design.fig              # Albero degli oggetti
pairdraw find design.fig --type TEXT  # Ricerca
pairdraw export design.fig -f png     # Esporta
pairdraw analyze colors design.fig    # Analisi colori
pairdraw analyze clusters design.fig  # Strutture ripetute
pairdraw eval design.fig -c "..."     # Figma Plugin API
```

Quando l’app desktop è in esecuzione, ometti il file per controllare l’editor aperto tramite RPC:

```sh
pairdraw tree                     # Documento aperto
pairdraw export -f png            # Screenshot dell’area di lavoro
```

Tutti i comandi supportano `--json`. Installazione: `npm install -g @pairdraw/cli` oppure `bun add -g @pairdraw/cli`.

## Collaborazione

Pairdraw non ha stanze live peer-to-peer: per un documento locale non c’è un link **Condividi**, non si entra tramite ID di stanza e non ci sono chiamate vocali. I documenti su un server [Pairdraw Cloud](/user-guide/pairdraw-cloud) si condividono tramite quel server, e chiunque ne apra uno lo modifica in tempo reale ([Collaborazione](/it/programmable/collaboration)).

- Cursori in tempo reale con frecce colorate ed etichette con il nome, per le persone in un documento Cloud e per gli agenti AI.
- Avatar di presenza; il tuo compare nella barra superiore solo mentre elenca i tuoi agenti AI o qualcun altro ha aperto il documento Cloud.
- Modalità di seguito: fai clic su una persona o un agente per seguirne la vista.
- **Visualizza → Cursori multigiocatore** (<kbd>⌥</kbd><kbd>⌘</kbd><kbd>\\</kbd>) nasconde e mostra i cursori.

## Desktop e Web

**Desktop:** Tauri v2, con un programma di installazione macOS di circa 20 MB. Le versioni pronte sono pubblicate per macOS su Apple Silicon; Windows, Linux e i Mac Intel si compilano dal codice sorgente. Menu nativi, uso senza rete e salvataggio automatico.

**Web:** funziona nel browser da una tua build (`bun run dev` o un’installazione che ospiti tu) o da un server Pairdraw Cloud; non esiste una copia ospitata. Installabile come PWA su dispositivi mobili, con interfaccia ottimizzata per il tocco.

**VS Code:** un editor dedicato ai documenti `.fig` e `.pen` che esegue l’editor web in una webview e salva ciò che mostra. Non è pubblicato in alcun marketplace, quindi si compila dal repository ([Estensione VS Code](/programmable/vscode)).

## Plugin

In **Impostazioni → App → Estensioni** si installano i manifest dei plugin, e il comando di un plugin si esegue dalla palette dei comandi, dove lavora sul documento aperto dopo aver chiesto cosa può fare. Un solo plugin viene eseguito alla volta e l’accesso alla rete viene rifiutato ([Plugin](/user-guide/plugins)).

## Caricamento alternativo da Google Fonts

Se un font non è disponibile localmente, Pairdraw lo scarica automaticamente da Google Fonts. Non serve alcuna installazione manuale quando apri file `.fig` con font sconosciuti.
