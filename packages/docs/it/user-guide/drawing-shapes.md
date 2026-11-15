---
title: Disegnare forme
description: Creare rettangoli, ellissi, linee, frame, sezioni, poligoni e stelle.
---

# Disegnare forme

La barra degli strumenti a sinistra dell’area di lavoro contiene gli strumenti per creare forme, frame e sezioni. Selezionane uno e trascina nell’area di lavoro.

## Strumenti

| Strumento | Tasto | Risultato |
|-----------|-------|-----------|
| Rettangolo | <kbd>R</kbd> | Rettangolo |
| Ellisse | <kbd>O</kbd> | Ellisse |
| Linea | <kbd>L</kbd> | Linea |
| Frame | <kbd>F</kbd> | Contenitore di altri oggetti |
| Sezione | <kbd>Shift</kbd> + <kbd>S</kbd> | Contenitore di primo livello |

Poligono e Stella sono disponibili nel menu delle forme.

## Inserire immagini

Scegli **File › Inserisci immagine…** (<kbd>⇧</kbd><kbd>⌘</kbd><kbd>K</kbd>, o <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>K</kbd> su Windows e Linux) o fai clic sul pulsante immagine della barra degli strumenti, poi seleziona file PNG, JPEG, WebP, GIF, AVIF o SVG. Compaiono selezionati al centro della vista, in un solo passaggio annullabile; un SVG diventa livelli modificabili.

Lo strumento **Nota adesiva** segue Testo nella barra degli strumenti. Non ha un tasto, quindi <kbd>N</kbd> continua a zoomare sul frame successivo.

## Mantenere le proporzioni

Con <kbd>Shift</kbd>, un rettangolo diventa quadrato, un’ellisse diventa cerchio e una linea si allinea a 0°, 45° o 90°.

## Proprietà

### Riempimento

Colore uniforme, sfumatura lineare, radiale, angolare o a diamante, immagine e shader: uno shader GLSL animato; parti dalla galleria del selettore di riempimento shader, aggiungigli effetti, o incolla un preset copiato da shaders.com.

Una sfumatura a **maglia** fonde una griglia di punti sul livello: nella scheda maglia scegli un punto per cambiarne il colore oppure modifica **Colonne** e **Righe** per ricampionare la griglia.
Per ritagliare o reinquadrare un’immagine sulla tela, fai doppio clic sul livello, premi <kbd>Invio</kbd> con il livello selezionato o scegli **Ritaglia immagine** dal menu contestuale o dal riempimento immagine. L’immagine appare intera, sbiadita fuori dal livello. Trascina gli angoli o le barre dei bordi del livello per ritagliarlo sopra l’immagine ferma, trascina l’immagine per spostarla dietro al livello e trascina i suoi punti d’angolo per ridimensionarla. <kbd>Shift</kbd> mantiene le proporzioni o un asse e <kbd>Alt</kbd> lavora dal centro. Ogni trascinamento è un passaggio annullabile; <kbd>Invio</kbd>, <kbd>Esc</kbd>, un doppio clic o un clic fuori dall’immagine termina. I vettori, i livelli con figli e i livelli posizionati dall’auto layout mantengono i loro bordi: su questi puoi solo spostare e ridimensionare l’immagine.

### Modalità shader

La modalità shader mostra un riempimento shader da solo e in grande, con riproduzione e pausa, un cursore di fase e le impostazioni dello shader accanto. Aprila con **Apri in modalità shader** nel selettore di riempimento shader, o con **Visualizza → Modalità shader** mentre la selezione ha un riempimento shader.

### Contorno

Spessore comune o per lato, colore, allineamento interno/centrale/esterno, estremità, giunzioni e tratteggio.

### Raggio degli angoli

Comune o indipendente per rettangoli, frame, componenti e istanze.

### Effetti

Ombre esterna e interna, sfocatura del livello, dello sfondo o del primo piano.

## Frame e sezioni

Un frame è un contenitore. Gli oggetti trascinati al suo interno diventano figli. Il ritaglio è disattivato per impostazione predefinita. I frame supportano la [disposizione automatica](./auto-layout).

Una sezione è un contenitore di primo livello che adotta automaticamente gli oggetti sovrapposti durante la creazione.
