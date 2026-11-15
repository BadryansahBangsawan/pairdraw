---
title: Examiner des fichiers avec la CLI
description: Parcourir l’arbre des objets, chercher par nom ou par type et consulter les propriétés depuis le terminal.
---

# Examiner des fichiers avec la CLI

La CLI permet d’explorer des documents de design sans ouvrir l’éditeur. Chaque commande fonctionne aussi sur l’application en cours d’exécution : il suffit d’omettre le fichier.

::: tip Installation

```sh
npm install -g @pairdraw/cli
# or
bun add -g @pairdraw/cli
```

:::

## Informations sur le document

Obtenez un aperçu rapide : nombre de pages, nombre total d’objets, polices utilisées, taille du fichier.

```sh
pairdraw info design.fig
```

## Diagnostic des polices {#font-diagnostics}

Indique les styles de police demandés, les sources disponibles, les substitutions et les calques concernés :

```sh
pairdraw fonts design.fig
pairdraw fonts design.fig --json
pairdraw fonts --document-id tab-123 --page-id 0:1
```

En mode fichier, toutes les pages du document sont vérifiées avec les polices disponibles sur la machine qui exécute la CLI, sans télécharger de polices en ligne. En mode direct, le rapport porte sur le document et la page ciblés dans l’application, dont les polices chargées peuvent différer de celles de la machine qui exécute la CLI. Chaque style est signalé comme `available`, `substituted` ou `unresolved` ; la sortie JSON contient `faithful`, `faces` et `issues`.

Utilisez les [règles de substitution de police à l’export](./exporting#font-substitution-policy) pour signaler ou refuser les substitutions lors des exports raster et PDF à partir d’un fichier.

## Arbre des objets

Affichez toute la hiérarchie des objets :

```sh
pairdraw tree design.fig
```

```
[0] [page] "Getting started" (0:46566)
  [0] [section] "" (0:46567)
    [0] [frame] "Body" (0:46568)
      [0] [frame] "Introduction" (0:46569)
        [0] [frame] "Introduction Card" (0:46570)
          [0] [frame] "Guidance" (0:46571)
```

`--page` choisit la page par son nom (la première par défaut) et `--depth` limite la profondeur affichée.

## Rechercher des objets

Recherche par type :

```sh
pairdraw find design.fig --type TEXT
```

Recherche par nom :

```sh
pairdraw find design.fig --name "Button"
```

Les deux options peuvent être combinées pour affiner les résultats.

## Requêtes XPath

Utilisez des sélecteurs XPath pour trouver des objets selon leur type, leurs attributs et leur position dans l’arbre :

```sh
pairdraw query design.fig "//FRAME"
```

### Motifs utiles

**Par type :**

```sh
pairdraw query design.fig "//TEXT"                    # All text nodes
pairdraw query design.fig "//COMPONENT"               # All components
pairdraw query design.fig "//INSTANCE"                # All instances
```

**Par attributs :**

```sh
pairdraw query design.fig "//FRAME[@width < 300]"                # Frames under 300px wide
pairdraw query design.fig "//*[@cornerRadius > 0]"               # Rounded corners
pairdraw query design.fig "//*[@visible = false]"                # Hidden nodes
pairdraw query design.fig "//TEXT[@fontSize >= 24]"              # Large text
pairdraw query design.fig "//*[@opacity < 1]"                    # Semi-transparent nodes
```

**Par nom et contenu textuel :**

```sh
pairdraw query design.fig "//TEXT[contains(@name, 'Button')]"    # Name contains 'Button'
pairdraw query design.fig "//TEXT[contains(@text, 'Hello')]"     # Text content contains 'Hello'
```

**Par hiérarchie :**

```sh
pairdraw query design.fig "//SECTION//TEXT"            # Text inside sections
pairdraw query design.fig "//FRAME/TEXT"               # Direct text children of frames
pairdraw query design.fig "//COMPONENT_SET//INSTANCE"  # Instances inside component sets
```

### Attributs interrogeables

`name`, `width`, `height`, `x`, `y`, `visible`, `opacity`, `cornerRadius`, `fontSize`, `fontFamily`, `fontWeight`, `layoutMode`, `itemSpacing`, `paddingTop`, `paddingRight`, `paddingBottom`, `paddingLeft`, `strokeWeight`, `rotation`, `locked`, `blendMode`, `text`, `lineHeight`, `letterSpacing`

### Exemple de sortie

```
  Found 5 nodes

[0] [frame] "Logo  92×32" (0:9)
[1] [frame] "logo-short-6  31×32" (0:10)
[2] [frame] "wrapper  128×73" (0:20)
[3] [frame] "pen-drawing  148×52" (0:21)
[4] [frame] "surprised-emoji  32×32" (0:26)
```

## Détails d’un objet

Examinez toutes les propriétés d’un objet à partir de son identifiant :

```sh
pairdraw node design.fig --id 1:23
```

## Pages

Listez toutes les pages du document :

```sh
pairdraw pages design.fig
```

## Variables

Listez les variables de design et leurs collections :

```sh
pairdraw variables design.fig
```

## Formats

`pairdraw formats` liste les formats de document et d’export pris en charge, avec leurs capacités de lecture et d’écriture.

## Mode application en direct

Lorsque l’application de bureau est lancée, omettez le fichier : la CLI se connecte via RPC et agit sur le canevas en direct :

```sh
pairdraw documents list    # list open document/page IDs
pairdraw tree              # inspect the active live document
pairdraw tree --document-id tab-123 --page-id 0:1
pairdraw eval --document-id tab-123 --page-id 0:1 -c "..."
```

Dans les workflows d’agents, utilisez `pairdraw documents list --json`, puis passez explicitement `--document-id` et `--page-id` au lieu de vous fier à l’onglet ou à la page visibles. Pour ouvrir, enregistrer, changer et fermer des documents, annuler, modifier les réglages ou appeler un outil de l’éditeur, consultez [Piloter l’application](/programmable/cli/app-control).

## Vérifier les designs

Contrôlez les documents pour repérer les problèmes de nommage, de disposition, de structure et d’accessibilité :

```sh
pairdraw lint design.fig
pairdraw lint design.pen --preset strict
pairdraw lint design.fig --rule color-contrast
pairdraw lint design.fig --list-rules
pairdraw lint design.fig --fix -o fixed.fig
```

Utilisez `--json` pour une sortie exploitable par une machine ; chaque message porte ses `fix` et `suggestions` sous forme de données. `--fix` applique les corrections sûres — liaison des couleurs à la variable de couleur correspondante et arrondi de la géométrie au pixel entier — et écrit le résultat dans le fichier `.fig` indiqué avec `-o`.

## Sortie JSON

Toutes les commandes acceptent `--json` pour une sortie exploitable par une machine : passez-la à `jq`, à des scripts de CI ou à d’autres outils.

```sh
pairdraw tree design.fig --json | jq '.[] | .name'
```

Utilisez `pairdraw --help`, ou ajoutez `--help` à une sous-commande, pour voir toutes les options.
