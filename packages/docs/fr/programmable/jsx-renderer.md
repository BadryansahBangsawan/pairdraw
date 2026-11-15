---
title: Moteur JSX
description: Créer des designs modifiables avec la même bibliothèque d’écriture déclarative que les agents Pairdraw.
---

# Moteur JSX

Le JSX de design de Pairdraw crée des objets de la scène, pas un DOM de navigateur. Vous pouvez utiliser des arbres de composants lisibles, des expressions JavaScript et des fonctions réutilisables pour construire des designs modifiables.

## Créer des designs

L’outil `render` accepte des chaînes JSX dans le chat IA et MCP. Dans le code d’une application ou d’une bibliothèque sans interface, importez `Frame`, `Text` et les autres exports d’écriture depuis `@pairdraw/design-jsx`, puis créez les objets avec `renderTree` ou `renderJSX` depuis `@pairdraw/core/design-jsx`, qui ajoutent les icônes, la conversion SVG et la disposition. Pour écrire les arbres en TSX, définissez `"jsxImportSource": "@pairdraw/design-jsx"` avec `"jsx": "react-jsx"` dans `tsconfig.json`, ou ajoutez au fichier un commentaire `/** @jsxImportSource @pairdraw/design-jsx */`. L’environnement de script détermine les API exposées à `eval` ; les exports des paquets n’y sont pas automatiquement des variables globales.

La [référence partagée d’écriture de designs](/reference/design-authoring) contient des exemples exécutables, des conseils de disposition et l’inventaire de la syntaxe prise en charge. Elle est générée à partir de la même source que celle utilisée par le chat, ACP, les prompts de génération de code et la compétence d’agent installable.

## Éléments

Utilisez des cadres et des textes pour la composition, des formes pour l’illustration, et de vrais composants et instances pour le contenu réutilisable de l’éditeur. Une fonction JavaScript seule ne crée pas d’identité de composant. Consultez l’[inventaire des éléments](/reference/design-authoring#supported-syntax-inventory).

## Propriétés de style

Utilisez Hug/Fill et flex ou grid pour un dimensionnement guidé par le contenu. Liez des variables sémantiques au lieu de recopier des valeurs. Consultez [composition et disposition](/reference/design-authoring#composition-and-layout), [peinture et texte](/reference/design-authoring#paint-text-and-artwork) et [variables et composants](/reference/design-authoring#variables-and-components).

## Exporter vers JSX

```sh
pairdraw export design.fig -f jsx                   # Pairdraw format
pairdraw export design.fig -f jsx --style tailwind  # Tailwind classes
```

Dans l’éditeur, **Copier en JSX** place la sélection dans le presse-papiers sous forme de JSX.

Le JSX Pairdraw exporté peut être modifié puis rendu de nouveau dans le document. L’export écrit les calques masqués et verrouillés, les contraintes, les limites de taille, les remplissages multiples, en dégradé et en image, les contours, les effets, les masques et les liaisons de variables : le rendu d’un export les reproduit, et `diff_jsx` montre les changements de chacun d’eux. Le texte riche à styles mixtes, les tracés vectoriels, les grilles de disposition, les styles partagés et les définitions de propriétés de composant ne sont pas encore écrits. Les instances sont écrites sous forme de cadres avec leur contenu, si bien que le JSX exporté se suffit à lui-même. Voir [Exporter avec la CLI](./cli/exporting).

## Comparaison visuelle

Le JSX rend les changements structurels d’un design relisibles comme du code. Utilisez `get_jsx` et `diff_jsx` pour examiner les changements, puis vérifiez le résultat réellement rendu ; un diff structurel propre ne prouve pas l’équivalence visuelle.
