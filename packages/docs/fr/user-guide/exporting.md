---
title: Exporter
description: Exporter des images, du SVG et des sous-ensembles `.fig`, et ouvrir des documents `.fig` ou `.pen` dans Pairdraw.
---

# Exporter

Exportez des objets sous forme d’images ou de sous-ensembles `.fig`, et ouvrez des documents `.fig` ou `.pen` complets.

## Exportation d’images

Sélectionnez un objet et utilisez la section **Export** du panneau des propriétés.

### Réglages d’export

- **Échelle :** 0,5×, 0,75×, 1×, 1,5×, 2×, 3× ou 4× (masquée pour le SVG : les vecteurs ne dépendent pas de la résolution).
- **Format :** PNG (fond transparent), JPG (fond blanc), WEBP (fond transparent), SVG (vectoriel), PDF ou HTML.

**Fichier → Exporter la sélection…** exporte la sélection en PNG, en SVG ou en `.fig`, et <kbd>⇧</kbd><kbd>⌘</kbd><kbd>E</kbd> l’exporte directement en PNG.

L’application ne propose pas d’export PowerPoint (`.pptx`) ni draw.io. La [CLI](/reference/cli#export) exporte toujours les deux : `pairdraw export design.fig -f pptx` ou `-f drawio`.

Vous pouvez ajouter plusieurs réglages d’export pour exporter le même objet à différentes échelles ou dans différents formats en une fois. Un aperçu en direct sur fond de damier montre ce qui sera exporté.

### Méthodes d’export

| Méthode | Mac | Windows / Linux |
|---------|-----|-----------------|
| Raccourci clavier (PNG) | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>E</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>E</kbd> |
| Menu Fichier | **Fichier → Exporter la sélection** (PNG, SVG ou `.fig`) | **Fichier → Exporter la sélection** (PNG, SVG ou `.fig`) |
| Panneau des propriétés | Bouton « Export » | Bouton « Export » |

Le fichier exporté est enregistré via une boîte de dialogue native (application de bureau) ou un téléchargement du navigateur.

## HTML, PDF et qualité

- **Les lignes JPG et WEBP** ont un champ de qualité de 1 à 100 (90 par défaut), enregistré avec le calque.
- **PDF** avec plusieurs calques sélectionnés produit un seul PDF avec une page par calque, dans l’ordre de sélection, chacune à la taille de son calque.
- **Fichier › Exporter les cadres en PDF…** enregistre les cadres de la page dans un seul PDF, une page par cadre dans l’ordre des calques, chacune à la taille de son cadre. Les cadres placés dans des sections comptent ; les formes, textes et groupes isolés non. Si des calques sont sélectionnés, seuls ceux-ci sont exportés.
- **HTML** écrit le calque comme une page web. Le bouton d’options à côté du format choisit d’inclure ou non la structure HTML (une page entière ou un fragment à coller dans une page), le style CSS ou Tailwind, des images intégrées ou des fichiers séparés (enregistrés ensemble dans un `.zip`), et si les noms de calques (`data-name`, activé par défaut) et les ID de calques (`data-pairdraw-node-id`, désactivé par défaut) sont écrits en attributs. La vue HTML du panneau Code exporte de la même manière, avec le style qu’elle affiche.
- L’export HTML porte le mode de fusion d’un calque en `mix-blend-mode`, comme l’export SVG le faisait déjà. « Densité linéaire - » devient `plus-lighter` ; « Densité linéaire + » s’exporte à plat, car Chrome, Edge et Firefox n’implémentent pas `plus-darker`. « Normal » et « Traverser » n’ajoutent aucun mode de fusion.
- Dans le panneau Code, les composants Vue et React peuvent prendre leurs icônes dans Lucide, Heroicons ou Font Awesome au lieu d’Iconify, et les composants React aussi dans React Icons ; une icône absente du paquet reste avec Iconify.

## Copier/Coller en tant que

En plus de l’export de fichiers, vous pouvez copier la sélection dans le presse-papiers dans plusieurs formats depuis le menu contextuel (clic droit → **Copier/Coller en tant que**) :

| Action | Raccourci (Mac) | Raccourci (Win/Linux) |
|--------|-----------------|-----------------------|
| Copier en texte | — | — |
| Copier en SVG | — | — |
| Copier en PNG | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>C</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>C</kbd> |
| Copier en JSX | — | — |

- **Copier en texte** copie le contenu textuel visible de la sélection.
- **Copier en SVG** copie la sélection sous forme de balisage SVG (à coller dans un éditeur de code, Inkscape, etc.).
- **Copier en PNG** effectue un rendu à 2× et le copie dans le presse-papiers (prêt à coller dans Slack, Notion, etc.).
- **Copier en JSX** copie la représentation Pairdraw JSX (compatible avec `renderJSX()`).

## Opérations sur les fichiers .fig

Pairdraw utilise le format `.fig` pour les documents complets, le même format binaire que Figma.

### Ouvrir des fichiers

| Action | Mac | Windows / Linux |
|--------|-----|-----------------|
| Ouvrir un fichier | <kbd>⌘</kbd><kbd>O</kbd> | <kbd>Ctrl</kbd> + <kbd>O</kbd> |

Un sélecteur de fichiers s’ouvre, filtré sur les fichiers `.fig` et `.pen`. Dans l’application de bureau, il utilise la boîte de dialogue native du système.

Vous pouvez aussi faire glisser un fichier `.fig`, `.pen` ou un autre document pris en charge sur la fenêtre ; il s’ouvre dans un nouvel onglet. Les images et fichiers SVG déposés sur la zone de travail sont placés dans le document, et tout autre fichier signale qu’il ne peut pas être ouvert.

Un document `.pen` qui importe des bibliothèques `.pen` s’ouvre avec les composants de bibliothèque qu’il utilise, lus dans les fichiers qu’il nomme, relativement à lui-même. Dans le document, ce sont des composants de bibliothèque en lecture seule ; modifiez-les dans la bibliothèque. Un navigateur ne peut pas lire les fichiers situés à côté d’un document : ces composants y apparaissent donc comme des espaces réservés en pointillés, et un message nomme les bibliothèques ; ouvrez le fichier dans l’application de bureau ou la CLI pour les charger. L’application de bureau lit les bibliothèques jusqu’à deux dossiers au-dessus du document, mais jamais depuis votre dossier personnel ou au-dessus, ni via des liens ; un fichier déposé sur la fenêtre n’en lit aucune, ouvrez-le donc avec **Fichier > Ouvrir…**. La CLI lit les bibliothèques situées dans le répertoire de travail. Les nœuds de script et de navigateur, que Pairdraw n’exécute pas, s’ouvrent aussi comme espaces réservés qui conservent leur fichier de script ou l’adresse de leur page.

### Enregistrer des fichiers

| Action | Mac | Windows / Linux |
|--------|-----|-----------------|
| Enregistrer | <kbd>⌘</kbd><kbd>S</kbd> | <kbd>Ctrl</kbd> + <kbd>S</kbd> |
| Enregistrer sous | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>S</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>S</kbd> |

- **Enregistrer** écrase le fichier ouvert sans boîte de dialogue.
- **Enregistrer sous…** ouvre une boîte de dialogue pour choisir un nouvel emplacement. Tauri utilise des dialogues natifs ; Chrome et Edge peuvent utiliser la File System Access API ; les autres navigateurs téléchargent le fichier.

Les fichiers enregistrés sont compressés et contiennent une miniature pour l’aperçu dans les gestionnaires de fichiers.

Quand rien n’est sélectionné, la section **Document** du panneau Design règle le niveau de compression du document. **Rapide** correspond aux enregistrements de Figma lui-même. **Réduite** et **Minimale** rendent le fichier plus petit et prennent plus de temps à enregistrer, ce qui se remarque surtout sur les gros documents et le moins sur les fichiers composés principalement d’images. Le choix est enregistré dans le fichier, et Figma ouvre les trois.

### Compatibilité aller-retour

Les fichiers exportés depuis Pairdraw s’ouvrent dans Figma, et inversement. Le format `.fig` conserve tous les types d’objets, propriétés, remplissages, contours, effets, données vectorielles et réglages de disposition.

## Raccourcis clavier

| Action | Mac | Windows / Linux |
|--------|-----|-----------------|
| Exporter la sélection en PNG | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>E</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>E</kbd> |
| Copier en PNG | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>C</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>C</kbd> |
| Ouvrir un fichier | <kbd>⌘</kbd><kbd>O</kbd> | <kbd>Ctrl</kbd> + <kbd>O</kbd> |
| Enregistrer | <kbd>⌘</kbd><kbd>S</kbd> | <kbd>Ctrl</kbd> + <kbd>S</kbd> |
| Enregistrer sous | <kbd>⇧</kbd><kbd>⌘</kbd><kbd>S</kbd> | <kbd>Shift</kbd> + <kbd>Ctrl</kbd> + <kbd>S</kbd> |

## Conseils

- Utilisez l’échelle 2× ou 3× pour exporter vers des écrans haute densité.
- Le JPG utilise toujours un fond blanc : choisissez PNG ou WEBP si vous avez besoin de transparence.
- Utilisez l’export SVG quand il vous faut un format vectoriel pour continuer à travailler dans Illustrator, Inkscape ou du code.
- La miniature des fichiers `.fig` exportés permet l’aperçu dans les gestionnaires de fichiers et dans le sélecteur de fichiers de Figma.
- PNG convient aux interfaces, JPG réduit la taille des photographies et WEBP offre une bonne compression pour le Web.
