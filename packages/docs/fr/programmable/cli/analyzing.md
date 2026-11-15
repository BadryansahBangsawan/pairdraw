---
title: Analyser des documents avec la CLI
description: Auditer couleurs, typographie, espacements et structures répétées des fichiers .fig.
---

# Analyser des documents avec la CLI

Les sous-commandes `analyze` auditent un design system entier depuis le terminal : elles repèrent les incohérences, extraient la palette réellement utilisée et signalent les structures qui attendent de devenir des composants.

## Couleurs

```sh
pairdraw analyze colors design.fig
```

Trouve chaque couleur du fichier, compte ses utilisations et affiche un histogramme visuel :

```
#1d1b20  ██████████████████████████████ 17155×
#49454f  ██████████████████████████████ 9814×
#ffffff  ██████████████████████████████ 8620×
#6750a4  ██████████████████████████████ 3967×
```

## Typographie

```sh
pairdraw analyze typography design.fig
```

Énumère chaque combinaison de famille, de taille et de graisse avec son nombre d’utilisations. Pratique pour repérer les styles de texte isolés qu’il faudrait regrouper.

## Espacement

```sh
pairdraw analyze spacing design.fig
```

Audite les espacements et les marges intérieures des cadres en auto layout. Aide à repérer les incohérences d’échelle d’espacement, par exemple un espacement isolé de `13px` au milieu de valeurs `8/16/24`.

## Structures répétées

```sh
pairdraw analyze clusters design.fig
```

Trouve les structures d’objets répétées qui pourraient devenir des composants :

```
3771× frame "container" (100% match)
     size: 40×40, structure: Frame > [Frame]

2982× instance "Checkboxes" (100% match)
     size: 48×48, structure: Instance > [Frame]
```

## Sortie JSON

Toutes les commandes `analyze` acceptent `--json` pour une sortie exploitable par une machine :

```sh
pairdraw analyze colors design.fig --json
```

Passez-la à `jq`, intégrez-la à des vérifications de CI ou utilisez-la dans des scripts qui imposent un budget de design tokens.

Ces analyses ne modifient pas le fichier. Pour les transformations, utilisez [`eval`](./scripting).
