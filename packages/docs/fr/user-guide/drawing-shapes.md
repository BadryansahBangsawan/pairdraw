---
title: Dessiner des formes
description: Créer des rectangles, ellipses, lignes, cadres, sections, polygones et étoiles dans Pairdraw.
---

# Dessiner des formes

La barre d’outils à gauche de la zone de travail contient les outils de création de formes, de cadres et de sections. Sélectionnez un outil, puis cliquez et faites glisser sur la zone de travail pour dessiner.

## Outils de la barre d’outils

| Outil | Raccourci | Description |
|-------|-----------|-------------|
| Rectangle | <kbd>R</kbd> | Dessine un rectangle |
| Ellipse | <kbd>O</kbd> | Dessine une ellipse |
| Ligne | <kbd>L</kbd> | Dessine une ligne |
| Cadre | <kbd>F</kbd> ou <kbd>A</kbd> | Dessine un cadre (conteneur d’autres objets) |
| Section | <kbd>Shift</kbd> + <kbd>S</kbd> | Dessine une section (qui intègre les frères qu’elle recouvre entièrement) |

## Placer des images

Choisissez **Fichier › Placer une image…** (<kbd>⇧</kbd><kbd>⌘</kbd><kbd>K</kbd>, ou <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>K</kbd> sous Windows et Linux) ou cliquez sur le bouton image de la barre d’outils, puis sélectionnez des fichiers PNG, JPEG, WebP, GIF, AVIF ou SVG. Ils apparaissent sélectionnés au centre de la vue, en une seule étape annulable ; un SVG devient des calques modifiables.

L’outil **Note autocollante** suit Texte dans la barre d’outils. Il n’a pas de touche : <kbd>N</kbd> zoome toujours sur le cadre suivant.

## Menu des formes

Le menu des formes (accessible depuis la barre d’outils) propose d’autres formes :

- **Polygone :** crée par défaut un polygone à 3 côtés (triangle).
- **Étoile :** crée une étoile à 5 branches avec un rayon intérieur de 0,38.

Polygone et Étoile n’ont pas de raccourci clavier : ouvrez-les depuis le menu des formes de la barre d’outils.

## Personnaliser la barre d’outils

Faites un clic droit sur la barre d’outils et choisissez **Personnaliser la barre d’outils…**, ou ouvrez **Paramètres → Éditeur**, pour la modifier :

- Désactivez l’interrupteur d’un outil pour le masquer. Les outils masqués gardent leurs raccourcis clavier. **Déplacer** est toujours affiché.
- Faites glisser un outil pour le réordonner. Déposé dans une case, il rejoint ce menu ; déposé dans l’espace entre deux cases, il devient un bouton à part entière ; déposé sur un autre outil, les deux partagent un menu.
- Le menu **⋯** d’un outil le déplace vers le haut ou vers le bas, le regroupe avec l’outil du dessus ou le sort de son menu. Sa poignée le déplace aussi avec <kbd>↑</kbd> et <kbd>↓</kbd>.
- **Insérer une icône** exécute une commande au lieu de choisir un outil : il peut être déplacé et masqué, mais pas rejoindre un menu.

**Rétablir les valeurs par défaut** restaure la disposition d’origine. Les outils ajoutés dans les versions ultérieures rejoignent leur menu par défaut, donc une barre d’outils personnalisée les reçoit quand même.

## Dessin contraint

Maintenez <kbd>Shift</kbd> pendant le glissement pour contraindre la forme :

- Rectangle → carré (largeur et hauteur égales) ;
- Ellipse → cercle ;
- Ligne → s’aligne sur des angles de 0°, 45° ou 90°.

## Propriétés des formes

Après avoir dessiné une forme, sélectionnez-la pour modifier ses propriétés dans l’onglet Design du panneau des propriétés.

### Remplissage

Toute forme peut avoir un remplissage. La section Remplissage prend en charge :

- **Couleur unie :** choisissez-la avec le sélecteur de couleur TSV ou saisissez une valeur hexadécimale.
- **Dégradé :** linéaire, radial, angulaire ou diamant, avec des points de dégradé modifiables. Tant que le sélecteur du dégradé est ouvert, la zone de travail affiche ses poignées : faites glisser une extrémité ou un point de rayon pour le déplacer, maintenez <kbd>Shift</kbd> pour le faire tourner par pas de 15°, et faites glisser le carré d’un point pour le faire coulisser le long de la ligne.
- **Maille :** une grille de points colorés qui se mélangent sur le calque. L’onglet de maille affiche chaque point : choisissez-en un pour changer sa couleur, ou modifiez **Colonnes** et **Lignes** pour rééchantillonner la grille (jusqu’à 4 dans chaque sens). La maille s’applique aux remplissages et aux contours ; les fichiers `.fig` conservent la grille et affichent ailleurs sa propre couleur, et les peintures `mesh_gradient` des fichiers `.pen` s’importent.
- **Image :** choisissez un fichier image comme remplissage, ou collez une adresse dans **URL de l’image** et choisissez **Charger** pour récupérer depuis le web une image PNG, JPEG, GIF ou WebP (ou une URL `data:`) de 64 Mo au maximum.
- **Shader :** un shader GLSL animé ; partez de la galerie du sélecteur de remplissage de shader, ajoutez-lui des effets, ou collez un préréglage copié depuis shaders.com.

Un remplissage d’image se place selon l’un de cinq modes : **Remplir** couvre le calque et recadre l’image, **Ajuster** montre l’image entière dans le calque, **Étirer** étire l’image entière aux proportions du calque, **Recadrer** permet de choisir la partie de l’image à afficher, et **Mosaïque** répète l’image. Étirer est enregistré comme un recadrage de l’image entière, comme le font les fichiers `.pen` et comme Figma le lit.

Pour recadrer ou recentrer une image sur la zone de travail, double-cliquez sur le calque, appuyez sur <kbd>Entrée</kbd> quand il est sélectionné ou choisissez **Recadrer l’image** dans son menu contextuel ou son remplissage d’image. L’image apparaît en entier, estompée hors du calque. Faites glisser les équerres d’angle ou les barres des bords du calque pour le recadrer sur l’image immobile, faites glisser l’image pour la déplacer derrière le calque et ses points d’angle pour la mettre à l’échelle. <kbd>Maj</kbd> garde les proportions ou un axe et <kbd>Alt</kbd> part du centre. Chaque glissement est une étape annulable et enregistre le remplissage comme un recadrage ; <kbd>Entrée</kbd>, <kbd>Échap</kbd>, un double-clic ou un clic hors de l’image termine. Les vecteurs, les calques avec enfants et les calques placés par la disposition automatique gardent leurs bords : sur eux, vous pouvez seulement déplacer et mettre à l’échelle l’image.

### Mode shader

Le mode shader montre un remplissage de shader seul et en grand, avec lecture et pause, un curseur de phase et les réglages du shader à côté. Ouvrez-le avec **Ouvrir en mode shader** dans le sélecteur de remplissage de shader, ou avec **Affichage → Mode shader** quand la sélection a un remplissage de shader.

### Contour

Ajoutez un contour à n’importe quelle forme. Les propriétés du contour comprennent :

- **Épaisseur :** uniforme ou par côté (haut, droite, bas, gauche) avec la liste déroulante de sélection des côtés.
- **Couleur :** couleur unie avec opacité.
- **Alignement :** à l’intérieur, centré ou à l’extérieur du bord de la forme (le rendu par découpage correspond au comportement de Figma).
- **Extrémités :** aucune, arrondie, carrée, flèche en lignes, flèche triangulaire (pour les tracés ouverts).
- **Jointures :** en onglet, biseautée, arrondie.
- **Motif de tirets :** longueur des tirets et des espaces.

### Rayon des angles

Disponible pour les rectangles, cadres, composants, instances, polygones et étoiles. Cliquez sur le bouton des coins indépendants pour régler chaque coin (haut gauche, haut droit, bas gauche, bas droit) séparément ; les coins d’un polygone ou d’une étoile partagent un seul rayon, qui arrondit aussi ses coins intérieurs.

Sur la zone de travail, survolez un rectangle sélectionné pour afficher une poignée dans chaque coin, et faites-en glisser une pour arrondir les coins. Les coins égaux changent ensemble et les coins différents un par un ; maintenez <kbd>⌥</kbd> pour inverser ces deux comportements et <kbd>⇧</kbd> pour arrondir à la dizaine. Un polygone ou une étoile a une seule poignée de rayon, sous son sommet, qui arrondit tous ses coins ; faites glisser la poignée de son sommet suivant autour du centre pour changer le nombre de sommets, et celle du premier point intérieur d’une étoile vers le centre ou à l’opposé pour changer son rapport. Les poignées sont masquées tant que la forme mesure moins de 108 pixels de large à l’écran ; zoomez pour les atteindre.

### Arcs d’ellipse

Sélectionnez une ellipse pour voir son arc dans la section Apparence : **Début** est l’angle de départ de l’arc, en degrés ; **Balayage** est la part du tour complet qu’il couvre, en pourcentage ; et **Rapport** est la taille du trou central, en pourcentage de l’ellipse, pour les anneaux et les graphiques en anneau. Saisissez une valeur ou faites glisser le champ ; les poignées de l’ellipse sur la zone de travail modifient les trois mêmes valeurs.

### Effets

Ajoutez des effets visuels depuis la section Effets :

- **Ombre portée :** décalage, rayon de flou, étendue et couleur.
- **Ombre interne :** mêmes réglages, rendue à l’intérieur de la forme.
- **Flou de calque :** floute tout l’objet.
- **Flou d’arrière-plan :** floute le contenu situé derrière l’objet.
- **Flou de premier plan :** floute le contenu situé devant.

Cliquez sur **+** pour ajouter un effet. Chaque ligne d’effet se replie et offre des réglages en ligne. Cliquez sur l’œil pour activer ou désactiver un effet.

## Cadres et sections

Les **cadres** sont des conteneurs. Faites glisser des formes dans un cadre pour en faire ses enfants, ou commencez à dessiner à l’intérieur : une nouvelle forme va dans le cadre situé sous le point de départ, sauf s’il est verrouillé, et rejoint la fin d’un flux en disposition automatique. Dessiner un cadre par-dessus des objets existants place à l’intérieur ceux, non verrouillés, qu’il recouvre entièrement. Les nouveaux cadres rognent leur contenu, comme dans Figma (désactivez **Rogner le contenu** pour laisser les enfants dépasser), et les cadres prennent en charge la [disposition automatique](./auto-layout).

Sélectionnez l’outil Cadre pour parcourir dans le panneau Design des préréglages repliables pour téléphones, tablettes, ordinateurs, présentations, montres, papier, réseaux sociaux, ressources de la communauté Figma et appareils archivés. Choisir un préréglage crée un cadre nommé, centré dans la vue, et revient à l’outil Déplacer. Quand un cadre existant est sélectionné, utilisez sa liste **Préréglage de cadre** pour le redimensionner sans changer son nom.

Les **sections** sont des conteneurs de premier niveau qui intègrent les objets frères qu’elles recouvrent entièrement quand elles sont dessinées, déplacées ou redimensionnées. Elles servent à organiser de grandes zones de travail en espaces logiques. Les sections affichent une pastille de titre que vous pouvez faire glisser.

## Raccourcis clavier

| Action | Mac | Windows / Linux |
|--------|-----|-----------------|
| Outil Rectangle | <kbd>R</kbd> | <kbd>R</kbd> |
| Outil Ellipse | <kbd>O</kbd> | <kbd>O</kbd> |
| Outil Ligne | <kbd>L</kbd> | <kbd>L</kbd> |
| Outil Cadre | <kbd>F</kbd> ou <kbd>A</kbd> | <kbd>F</kbd> ou <kbd>A</kbd> |
| Outil Section | <kbd>⇧</kbd><kbd>S</kbd> | <kbd>Shift</kbd> + <kbd>S</kbd> |
| Contraindre en carré ou en cercle | <kbd>Shift</kbd> + glissement | <kbd>Shift</kbd> + glissement |

## Conseils

- Les sections n’existent qu’au premier niveau : elles ne peuvent pas être imbriquées dans des cadres.
- Utilisez des cadres avec [disposition automatique](./auto-layout) pour construire des mises en page adaptatives.
- [Exportez](./exporting) des formes ou des groupes en images depuis le panneau des propriétés ou le menu contextuel.
