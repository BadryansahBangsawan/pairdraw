---
title: Exporter
description: Exporter la sélection en PNG, JPG, WEBP ou SVG et enregistrer des fichiers `.fig`.
---

# Exporter

## Exportation d’images

Sélectionnez un objet et ouvrez **Exporter** dans le panneau des propriétés. Chaque réglage définit :

- le format : PNG, JPG, WEBP, SVG, PDF, HTML, PPTX (PowerPoint) ou draw.io ;
- l’échelle ou une largeur explicite ;
- le suffixe du nom ;
- la qualité pour JPG et WEBP.

Un objet peut avoir plusieurs réglages. L’aperçu apparaît sur un damier afin de vérifier la transparence.

Vous pouvez aussi ouvrir **Exporter…** depuis le menu contextuel.

## HTML, PDF et qualité

- **Les lignes JPG et WEBP** ont un champ de qualité de 1 à 100 (90 par défaut), enregistré avec le calque.
- **PDF** avec plusieurs calques sélectionnés produit un seul PDF avec une page par calque, dans l’ordre de sélection, chacune à la taille de son calque.
- **Fichier › Exporter les cadres en PDF…** enregistre les cadres de la page dans un seul PDF, une page par cadre dans l’ordre des calques, chacune à la taille de son cadre. Les cadres placés dans des sections comptent ; les formes, textes et groupes isolés non. Si des calques sont sélectionnés, seuls ceux-ci sont exportés.
- **HTML** écrit le calque comme une page web. Le bouton d’options à côté du format choisit d’inclure ou non la structure HTML (une page entière ou un fragment à coller dans une page), le style CSS ou Tailwind, des images intégrées ou des fichiers séparés (enregistrés ensemble dans un `.zip`), et si les noms de calques (`data-name`, activé par défaut) et les ID de calques (`data-open-pencil-node-id`, désactivé par défaut) sont écrits en attributs. La vue HTML du panneau Code exporte de la même manière, avec le style qu’elle affiche.
- Dans le panneau Code, les composants Vue et React peuvent prendre leurs icônes dans Lucide, Heroicons ou Font Awesome au lieu d’Iconify, et les composants React aussi dans React Icons ; une icône absente du paquet reste avec Iconify.

## Copier comme

Le menu contextuel copie la sélection comme texte, SVG, PNG ou JSX.

## Enregistrer les documents

**Enregistrer** met à jour le fichier actuel. **Enregistrer sous…** choisit un nouvel emplacement. Tauri utilise des dialogues natifs ; Chrome et Edge peuvent utiliser File System Access API ; les autres navigateurs téléchargent le fichier.

Les fichiers `.fig` exportés contiennent les données Kiwi, la compression Zstandard et une miniature. Les composants et ensembles sont conservés pour pouvoir rouvrir le fichier dans Figma.

## Choisir un format

- PNG conserve la transparence et convient aux interfaces.
- JPG réduit la taille des photographies.
- WEBP offre une bonne compression pour le Web.
- SVG conserve les vecteurs modifiables et convient aux icônes et au code.
