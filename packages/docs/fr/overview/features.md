# Fonctionnalités

## Fichiers Figma .fig

Pairdraw ouvre et enregistre directement les fichiers Figma natifs. L’import et l’export utilisent le même codec binaire Kiwi que Figma : 605 définitions de schéma et environ 590 champs par objet. Enregistrer : <kbd>⌘</kbd><kbd>S</kbd>. Enregistrer sous : <kbd>⇧</kbd><kbd>⌘</kbd><kbd>S</kbd>.

**Copier et coller avec Figma :** sélectionnez des objets dans Figma, appuyez sur <kbd>⌘</kbd><kbd>C</kbd>, passez à Pairdraw puis utilisez <kbd>⌘</kbd><kbd>V</kbd>. Remplissages, contours, disposition automatique, texte, effets, rayons des coins et réseaux vectoriels sont conservés, dans les deux sens.

## Dessin et édition

- **Formes :** rectangle (<kbd>R</kbd>), ellipse (<kbd>O</kbd>), ligne (<kbd>L</kbd>), polygone et étoile.
- **Plume :** réseaux vectoriels (et non de simples tracés), courbes de Bézier avec poignées tangentes.
- **Crayon** (<kbd>⇧</kbd><kbd>P</kbd>) : traits à main levée lissés en courbes modifiables.
- **Texte :** édition directe sur la zone de travail avec prise en charge des IME ; double-cliquez pour passer en mode édition.
- **Texte enrichi :** gras (<kbd>⌘</kbd><kbd>B</kbd>), italique (<kbd>⌘</kbd><kbd>I</kbd>), souligné (<kbd>⌘</kbd><kbd>U</kbd>) et barré, caractère par caractère.
- **Disposition automatique :** Flexbox et CSS Grid via Yoga WASM, avec direction, espacement, marges internes, distribution, alignement, dimensionnement des enfants et pistes de grille. <kbd>⇧</kbd><kbd>A</kbd> l’active ou la désactive.
- **Composants :** création (<kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd>), ensembles de composants, instances avec substitutions, slots et synchronisation en direct.
- **Comportements et aperçu :** faites fonctionner des composants comme des contrôles Reka UI (interrupteur, curseur, onglets, champ de texte, accordéon…) et essayez-les en direct au-dessus de la zone de travail avec <kbd>⌥</kbd><kbd>⌘</kbd><kbd>↩</kbd> ([Composants](/fr/user-guide/components#behaviours-and-preview)).
- **Calques de script :** le contenu d’un calque est dessiné par un programme JavaScript enregistré dans le document. Les contrôles `@input` se lient à des variables ; un changement du code, des entrées ou de la taille relance l’exécution, et le résultat se convertit en calques ordinaires en une étape ([Calques de script](/user-guide/script-layers)).
- **Prototypes :** des interactions au clic ou après un délai mènent à un cadre, ouvrent ou ferment une superposition ou reviennent en arrière ; elles se lisent sur la zone de travail avec une transition instantanée ou en fondu ([Lire un prototype](/user-guide/playing-a-prototype)).
- **Variables :** jetons de design organisés en collections et modes (Light/Dark), avec les types Color, Float, String et Boolean et des liaisons de variables.
- **Sections :** conteneurs d’organisation qui intègrent automatiquement les objets superposés et affichent leur titre dans une pastille.

## Disposition de l’éditeur

L’éditeur s’ouvre sur la zone de travail seule. Les outils se trouvent à gauche de la zone de travail, avec au-dessus le bouton du panneau des calques, et le zoom se trouve dans le coin inférieur droit. Le panneau de propriétés apparaît quand un calque est sélectionné et disparaît avec la sélection ; un panneau ouvert depuis son bouton reste ouvert. Tant que le chat avec l’IA est fermé, un champ en bas de la zone de travail lui envoie ce que vous écrivez. L’application démarre avec le thème sombre ; **Paramètres → Général → Thème** propose aussi Clair et Automatique.

- **Rechercher des calques :** <kbd>⌘</kbd><kbd>F</kbd> cherche les calques de la page affichée par leur nom, sélectionne celui que vous choisissez et l’amène dans la vue.
- **Bonus :** le bouton cadeau de la barre supérieure rassemble des points de départ : des styles à épingler au chat avec l’IA, des systèmes de design à activer, des scripts placés comme calques de code et des shaders prêts à l’emploi.

## Panneau de propriétés

Les onglets Design et Code s’adaptent à la sélection, avec l’onglet Vérifier à côté :

- **Apparence :** opacité, rayon des coins (uniforme ou par coin) et visibilité.
- **Remplissage :** couleur unie, dégradé (linéaire, radial, angulaire, diamant, maillé) et image.
- **Contour :** couleur, épaisseur, alignement (intérieur, centré, extérieur), épaisseur par côté, extrémités, jointures et tirets.
- **Effets :** ombre portée, ombre intérieure, flou de calque, flou d’arrière-plan et flou de premier plan.
- **Typographie :** choix de police avec défilement virtuel et recherche, graisse, taille, alignement et boutons de style.
- **Disposition :** réglages de la disposition automatique lorsqu’elle est activée.
- **Export :** échelle, format (PNG, JPG, WEBP, SVG, PDF, HTML), qualité et aperçu en direct.
- **Code :** Design JSX, HTML et composants Vue et React pour la sélection, stylés en CSS ou avec Tailwind, avec édition bidirectionnelle en direct du Design JSX qui met à jour votre code à mesure que les calques changent ; l’élément situé sous le curseur met en évidence son calque sur la zone de travail, et les problèmes de design sont soulignés sur la propriété qui les cause.
- **Vérifier :** analyse de design en direct pour la page ou la sélection : contraste insuffisant, cibles tactiles trop petites, couleurs non liées, espacements hors échelle, vérifiée tant que l’onglet est ouvert, avec une liaison à une variable en un clic ([Checking Designs](/user-guide/checking-designs)).

## Rendu

Pairdraw utilise Skia via CanvasKit WASM, le même moteur graphique que Figma :

- dégradés linéaires, radiaux, angulaires et diamant ;
- remplissages d’image avec modes d’échelle et réglages (exposition, contraste, saturation, température, teinte, hautes lumières, ombres) ;
- effets avec cache par objet ;
- données d’arc (ellipses partielles, anneaux) ;
- exclusion des objets hors champ et réutilisation des peintures ;
- guides d’accrochage avec alignement tenant compte de la rotation ;
- règles avec badges de sélection ;
- surbrillance au survol qui suit la géométrie réelle.

## Annuler et rétablir

Toutes les opérations peuvent être annulées : création, suppression, déplacements, redimensionnements, changements de propriétés, changements de parent, changements de disposition et opérations sur les variables. Pairdraw utilise un modèle de commandes inverses. Raccourcis : <kbd>⌘</kbd><kbd>Z</kbd> et <kbd>⇧</kbd><kbd>⌘</kbd><kbd>Z</kbd>.

## Documents multipages

Vous pouvez ajouter, supprimer et renommer des pages ; chacune conserve son propre état d’affichage. Double-cliquez sur une page pour la renommer sur place.

## Onglets multifichiers

Plusieurs documents peuvent être ouverts dans des onglets. <kbd>⌘</kbd><kbd>T</kbd> ouvre un nouvel onglet, <kbd>⌘</kbd><kbd>W</kbd> le ferme et <kbd>⌘</kbd><kbd>O</kbd> ouvre un fichier.

## Export

- **Images :** PNG, JPG et WEBP à une échelle réglable (0,5× à 4×), depuis le panneau, le menu contextuel ou avec <kbd>⇧</kbd><kbd>⌘</kbd><kbd>E</kbd>.
- **SVG :** formes, texte avec plages de style, dégradés, effets et modes de fusion.
- **PDF :** un calque par page, ou **Fichier → Exporter les cadres en PDF…** pour les cadres de la page.
- **HTML :** une page ou un fragment avec du CSS simple ou des classes Tailwind.
- **Tailwind JSX :** HTML avec classes utilitaires Tailwind v4, prêt pour React ou Vue.
- **Copier comme :** texte, SVG, PNG (<kbd>⇧</kbd><kbd>⌘</kbd><kbd>C</kbd>) ou JSX depuis le menu contextuel.

CLI :

```sh
pairdraw export design.fig -f jsx --style tailwind
```

## Chat avec l’IA

<kbd>⌘</kbd><kbd>J</kbd> ouvre l’assistant dans sa propre colonne, à côté du panneau de propriétés ; vous pouvez aussi écrire dans le champ en bas de la zone de travail ou sur l’Accueil. Sans modèle configuré, le chat utilise un agent de code déjà installé sur l’ordinateur : Claude Code, Codex ou Gemini CLI. 142 outils créent des formes, modifient styles et dispositions, travaillent avec les composants et variables, exécutent des opérations booléennes, analysent les jetons de design et exportent des ressources. Connectez Anthropic, OpenAI, Google AI, OpenRouter, tout point d’accès compatible ou l’IA proposée par votre serveur [Pairdraw Cloud](/user-guide/pairdraw-cloud#ai-on-cloud). Chaque fournisseur, modèle et agent affiche le logo de son éditeur.

Les appels d’outils apparaissent sur une chronologie repliable. Vérification visuelle : l’assistant rend son travail et le compare à votre demande. Toutes les modifications réalisées par l’IA peuvent être annulées.

Vous pouvez regarder un agent dessiner : chaque calque qu’il ajoute se dessine l’un après l’autre, les cadres où il travaille scintillent et, une fois qu’il a fini, un avis compte ce qu’il a ajouté et modifié. **Animer les modifications de l’IA** dans les Paramètres le désactive ([Regarder l’assistant dessiner](/fr/programmable/ai-chat#watching-the-assistant-draw)).

Voir [Chat avec l’IA](/fr/programmable/ai-chat) pour la configuration et les fournisseurs.

## Navigateur intégré

Les pages `http` et `https` s’ouvrent dans une fenêtre propre à l’application de bureau, qui ne partage rien avec l’éditeur, et peuvent être amenées sur la zone de travail : importez la page entière ou un élément choisi sous forme de calques, ou placez une capture de la vue, de la page ou d’un élément. Le chat peut lire la page, marquer un élément dans sa réponse et cliquer, saisir du texte, appuyer sur une touche, faire défiler ou attendre dessus ; il demande d’abord quand les paramètres demandent une confirmation avant les modifications.

Sur un tableau existant, le même navigateur devient de la recherche : le chat cite la page dans une note autocollante qui conserve son adresse, son titre, sa citation et l’heure de lecture ([Recherche sur un tableau](/user-guide/research)). Pairdraw ne crée pas de nouveaux tableaux.

## Serveur MCP

Claude Code, Cursor, Windsurf et tout autre client MCP peuvent lire et modifier des fichiers `.fig` sans interface ou le document ouvert dans l’éditeur en cours d’exécution grâce à 142 outils. Deux transports sont disponibles : stdio et HTTP.

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

Voir la [référence des outils MCP](/programmable/mcp-server) pour la liste complète.

## CLI

La CLI examine, exporte et analyse les fichiers `.fig` depuis le terminal :

```sh
pairdraw tree design.fig              # Arbre du document
pairdraw find design.fig --type TEXT  # Recherche
pairdraw export design.fig -f png     # Export
pairdraw analyze colors design.fig    # Analyse des couleurs
pairdraw analyze clusters design.fig  # Structures répétées
pairdraw eval design.fig -c "..."     # Figma Plugin API
```

Lorsque l’application de bureau est lancée, omettez le fichier pour piloter l’éditeur en direct via RPC :

```sh
pairdraw tree                     # Document ouvert
pairdraw export -f png            # Capture de la zone de travail
```

Toutes les commandes acceptent `--json`. Installation : `npm install -g @pairdraw/cli` ou `bun add -g @pairdraw/cli`.

## Collaboration

Pairdraw n’a pas de salles pair à pair en direct : pas de lien de partage pour un document local, pas d’accès par identifiant de salle et pas d’appel vocal. Les documents d’un serveur [Pairdraw Cloud](/user-guide/pairdraw-cloud) se partagent via ce serveur, et toutes les personnes qui en ouvrent un le modifient en direct ([Collaboration](/fr/programmable/collaboration)).

- Curseurs en direct avec flèches colorées et pastilles de nom, pour les personnes d’un document Cloud et pour les agents IA.
- Avatars de présence ; le vôtre n’apparaît dans la barre supérieure que lorsqu’il liste vos agents IA ou que quelqu’un d’autre a ouvert le document Cloud.
- Mode suivi : cliquez sur une personne ou un agent pour suivre sa vue.
- **Affichage → Curseurs multijoueurs** (<kbd>⌥</kbd><kbd>⌘</kbd><kbd>\\</kbd>) masque et affiche les curseurs.

## Bureau et Web

**Bureau :** Tauri v2, avec un programme d’installation d’environ 20 Mo sous macOS. Les versions prêtes à l’emploi sont publiées pour macOS sur Apple Silicon ; Windows, Linux et les Mac Intel se compilent à partir des sources. Menus natifs, fonctionnement hors ligne et enregistrement automatique.

**Web :** fonctionne dans le navigateur depuis votre propre build (`bun run dev`, ou un déploiement que vous hébergez) ou depuis un serveur Pairdraw Cloud ; aucune version n’est hébergée. Installable comme PWA sur mobile, avec une interface adaptée aux écrans tactiles.

**VS Code :** un éditeur dédié aux documents `.fig` et `.pen` qui exécute l’éditeur web dans une webview et enregistre ce qu’il affiche. Il n’est publié sur aucune place de marché et se compile donc depuis le dépôt ([Extension VS Code](/programmable/vscode)).

## Extensions

Dans **Paramètres → Application → Extensions**, installez des manifestes d’extension ; la commande d’une extension s’exécute depuis la palette de commandes sur le document ouvert, après avoir demandé ce qu’elle peut faire. Une seule extension s’exécute à la fois et l’accès réseau est refusé ([Extensions](/user-guide/plugins)).

## Chargement de secours depuis Google Fonts

Si une police n’est pas disponible localement, Pairdraw la télécharge automatiquement depuis Google Fonts. Aucune installation manuelle n’est nécessaire pour ouvrir des fichiers `.fig` qui utilisent des polices inconnues.
