# Fonctionnalités

## Fichiers Figma

Pairdraw ouvre et enregistre directement les fichiers `.fig`. L’import et l’export utilisent le même codec binaire Kiwi que Figma : 194 définitions de schéma et environ 390 champs par objet. Enregistrer : <kbd>⌘</kbd><kbd>S</kbd>. Enregistrer sous : <kbd>⇧</kbd><kbd>⌘</kbd><kbd>S</kbd>.

**Copier et coller avec Figma :** sélectionnez des objets dans Figma, appuyez sur <kbd>⌘</kbd><kbd>C</kbd>, passez à Pairdraw puis utilisez <kbd>⌘</kbd><kbd>V</kbd>. Remplissages, contours, disposition automatique, texte, effets, rayons des coins et réseaux vectoriels sont conservés dans les deux sens.

## Dessin et édition

- **Formes :** rectangle (<kbd>R</kbd>), ellipse (<kbd>O</kbd>), ligne (<kbd>L</kbd>), polygone et étoile.
- **Plume :** réseaux vectoriels, courbes de Bézier et poignées tangentes.
- **Texte :** édition directe sur le canevas et prise en charge des IME.
- **Texte enrichi :** gras, italique, souligné et barré sur des plages de caractères.
- **Disposition automatique :** Flexbox et CSS Grid via Yoga WASM, avec direction, espacement, marges internes, distribution, alignement, dimensionnement et pistes de grille.
- **Composants :** création de composants et d’ensembles, instances, substitutions et synchronisation.
- **Calques de script :** Le contenu d’un calque est dessiné par un programme JavaScript enregistré dans le document. Les contrôles `@input` se lient à des variables ; un changement du code, des entrées ou de la taille relance l’exécution, et le résultat se convertit en calques ordinaires en une étape ([Calques de script](/user-guide/script-layers)).
- **Prototypes :** Des interactions au clic ou après un délai mènent à un cadre, ouvrent ou ferment une superposition ou reviennent en arrière ; elles se lisent sur la zone de travail avec une transition instantanée ou en fondu ([Lire un prototype](/user-guide/playing-a-prototype)).
- **Variables :** jetons de design organisés en collections et modes, avec les types Color, Float, String et Boolean et des liaisons.
- **Sections :** conteneurs d’organisation qui intègrent automatiquement les objets superposés.

## Panneau de propriétés

Les onglets Design, Code et Vérifier s’adaptent à la sélection ; le chat avec l’IA a sa propre colonne :

- **Apparence :** opacité, rayon uniforme ou par coin et visibilité.
- **Remplissage :** couleur unie, dégradés linéaire, radial, angulaire et diamant, et images.
- **Contour :** couleur, épaisseur, alignement, épaisseur par côté, extrémités, jointures et tirets.
- **Effets :** ombre portée et intérieure, flou de calque, d’arrière-plan et de premier plan.
- **Typographie :** choix de police avec recherche et défilement virtuel, style, taille, alignement et mise en forme.
- **Disposition :** réglages de la disposition automatique.
- **Export :** échelle, PNG/JPG/WEBP/SVG et aperçu.
- **Code :** Design JSX et Tailwind JSX pour la sélection, avec édition bidirectionnelle en direct du Design JSX qui met à jour votre code à mesure que les calques changent ; l’élément situé sous le curseur met en évidence son calque sur la zone de travail, et les problèmes de design sont soulignés sur la propriété qui les cause.
- **Vérifier :** analyse de design en direct pour la page ou la sélection : contraste insuffisant, cibles tactiles trop petites, couleurs non liées, espacements hors échelle, avec des repères de problèmes sur la zone de travail et une liaison à une variable en un clic ([Checking Designs](/user-guide/checking-designs)).

## Rendu

Pairdraw utilise Skia via CanvasKit WASM, le même moteur graphique que Figma :

- dégradés linéaires, radiaux, angulaires et diamant ;
- remplissages d’image avec plusieurs modes d’échelle ;
- cache des effets par objet ;
- arcs, ellipses partielles et anneaux ;
- exclusion des objets hors champ et réutilisation des outils de peinture ;
- guides d’accrochage tenant compte de la rotation ;
- règles avec plage de sélection ;
- surbrillance suivant la géométrie réelle.

## Annuler et rétablir

La création, la suppression, les déplacements, le redimensionnement, les propriétés et la hiérarchie, la disposition et les variables peuvent être annulés. Raccourcis : <kbd>⌘</kbd><kbd>Z</kbd> et <kbd>⇧</kbd><kbd>⌘</kbd><kbd>Z</kbd>.

## Pages et documents

Vous pouvez créer, supprimer et renommer des pages ; chacune conserve sa position et son échelle d’affichage. Plusieurs documents peuvent être ouverts dans des onglets.

## Export

- **Images :** PNG, JPG et WEBP de 0,5× à 4×.
- **SVG :** formes, texte avec plages de style, dégradés, effets et modes de fusion.
- **Tailwind JSX :** HTML avec classes Tailwind v4 pour React ou Vue.
- **Copier comme :** texte, SVG, PNG ou JSX depuis le menu contextuel.

```sh
pairdraw export design.fig -f jsx --style tailwind
```

## Chat AI

<kbd>⌘</kbd><kbd>J</kbd> ouvre l’assistant. Plus de 90 outils créent des formes, modifient styles et dispositions, travaillent avec les composants et variables, exécutent des opérations booléennes, analysent les jetons de design et exportent des ressources. Anthropic, OpenAI, Google AI, OpenRouter et les points d’accès compatibles sont pris en charge.

Les appels d’outils apparaissent sur une chronologie repliable. Pour vérifier les modifications, l’assistant rend le résultat et le compare à la demande. Toutes les modifications réalisées par l’AI peuvent être annulées.

## Navigateur intégré

Les pages `http` et `https` s’ouvrent dans une fenêtre propre à l’application de bureau, qui ne partage rien avec l’éditeur, et peuvent être amenées sur la zone de travail : importez la page entière ou un élément choisi sous forme de calques, ou placez une capture de la vue, de la page ou d’un élément. Le chat peut lire la page, marquer un élément dans sa réponse et cliquer, saisir du texte, appuyer sur une touche, faire défiler ou attendre dessus ; il demande d’abord quand les paramètres demandent une confirmation avant les modifications.

Sur un tableau existant, le même navigateur devient de la recherche (Pairdraw ne propose pas de créer de nouveaux tableaux) : le chat cite la page dans une note autocollante qui conserve son adresse, son titre, sa citation et l’heure de lecture ([Recherche sur un tableau](/user-guide/research)).

## Serveur MCP

Claude Code, Cursor, Windsurf et les autres clients MCP peuvent lire et modifier des fichiers `.fig` grâce à plus de 90 outils. stdio et HTTP sont disponibles.

```sh
npm install -g @pairdraw/mcp
```

## CLI

La CLI examine, exporte et analyse les fichiers `.fig` :

```sh
pairdraw tree design.fig              # Arbre du document
pairdraw find design.fig --type TEXT  # Recherche
pairdraw export design.fig -f png     # Export
pairdraw analyze colors design.fig    # Analyse des couleurs
pairdraw analyze clusters design.fig  # Structures répétées
pairdraw eval design.fig -c "..."     # Figma Plugin API
```

Toutes les commandes acceptent `--json`. Installation : `npm install -g @pairdraw/cli` ou `bun add -g @pairdraw/cli`.

## Collaboration

Les agents IA affichent leur curseur et les calques qu’ils modifient sur la zone de travail, et la vue les suit pendant qu’ils travaillent. Plusieurs personnes modifient ensemble les documents Cloud via un serveur [Pairdraw Cloud](/user-guide/pairdraw-cloud) auto-hébergé, avec curseurs, présence et suivi de la vue d’une personne. Les salles en direct pour les documents locaux, l’accès par lien et les appels vocaux ne font pas partie de Pairdraw ([Collaboration](/fr/programmable/collaboration)).

## Bureau et Web

**Bureau :** Tauri v2, programmes d’installation d’environ 15 Mo sous macOS et Windows, pour macOS, Windows et Linux, avec menus natifs, fonctionnement hors ligne et enregistrement automatique.

**Web :** dans le navigateur, depuis votre propre build ou un serveur Pairdraw Cloud, installable comme PWA et adapté aux écrans tactiles.

**VS Code :** Un éditeur dédié aux documents `.fig` et `.pen` qui exécute l’éditeur web dans une webview et enregistre ce qu’il affiche. Il n’est publié sur aucune place de marché et se compile donc depuis le dépôt ([Extension VS Code](/programmable/vscode)).

## Extensions

Dans **Paramètres → Application → Extensions**, installez des manifestes d’extension ; la commande d’une extension s’exécute depuis la palette de commandes sur le document ouvert, après avoir demandé ce qu’elle peut faire. Une seule extension s’exécute à la fois et l’accès réseau est refusé ([Extensions](/user-guide/plugins)).

## Chargement de secours depuis Google Fonts

Si une police n’est pas disponible localement, Pairdraw la télécharge automatiquement depuis Google Fonts. Aucune installation manuelle n’est nécessaire.
