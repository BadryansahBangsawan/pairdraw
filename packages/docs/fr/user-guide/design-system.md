---
title: Créer un design system
description: Un tutoriel pas à pas qui crée une bibliothèque Button et Card avec des thèmes, des variantes, des propriétés de composant et des slots.
---

# Créer un design system

Ce tutoriel crée un petit design system de A à Z : des tokens de couleur et de taille avec un thème clair et un thème sombre, un **Button** à deux variantes et une **Card** dont le contenu et les actions sont des slots. Chaque étape utilise des fonctions décrites plus en détail dans [Variables](./variables), [Auto-layout](./auto-layout) et [Composants](./components).

[Téléchargez le fichier terminé](/examples/design-system.fig){download} pour le comparer au vôtre ou pour partir de lui. Il contient deux pages : **Components** réunit les composants principaux et **Examples** montre les mêmes cartes dans les modes Light et Dark.

## 1. Définir les tokens

Les tokens sont des variables que chaque composant lit : un changement de thème se fait ainsi à un seul endroit.

1. Ouvrez **Affichage → Variables…**.
2. Cliquez sur **+** à côté de **Collections** et nommez la collection `Theme`. Renommez son premier mode en `Light`, puis cliquez sur **+** à côté de **Modes** et nommez le nouveau mode `Dark`.
3. Cliquez sur **Créer une variable**, choisissez **Couleur** et ajoutez ces variables avec une valeur pour chaque mode. Une barre oblique dans le nom regroupe les variables : `color/primary` apparaît comme *primary* sous *color*.

   | Variable | Light | Dark |
   | --- | --- | --- |
   | `color/background` | `#F4F5F7` | `#0F1115` |
   | `color/surface` | `#FFFFFF` | `#1A1D23` |
   | `color/border` | `#E1E4EA` | `#2D323B` |
   | `color/text` | `#191C21` | `#F1F3F6` |
   | `color/text-muted` | `#5A616E` | `#A2A9B5` |
   | `color/primary` | `#3451D1` | `#8098F7` |
   | `color/on-primary` | `#FFFFFF` | `#0D1222` |
   | `color/secondary` | `#E9ECF2` | `#272B33` |

4. Créez une deuxième collection nommée `Size` avec des variables de type **Nombre** : `radius/control` = 8, `radius/card` = 12, `space/sm` = 8, `space/md` = 16 et `space/lg` = 24. Les tailles ne changent pas avec le thème, cette collection garde donc un seul mode.

La feuille de style sous la liste montre déjà le résultat : les valeurs Light dans `:root` et les valeurs Dark sous `[data-theme="dark"]`.

## 2. Construire le Button

1. Renommez la page en `Components`. Dessinez un cadre, appuyez sur <kbd>⇧</kbd><kbd>A</kbd> pour lui donner un auto-layout et réglez les deux axes sur **Ajuster au contenu**.
2. Ajoutez un calque de texte `Button`, en Inter Medium 14 px, et nommez-le `Label`.
3. Liez les tokens. Dans **Remplissage**, utilisez **Appliquer la variable** pour lier le remplissage du cadre à `color/primary` et celui du texte à `color/on-primary`. Les champs numériques acceptent les variables de la même façon : liez le rayon des coins à `radius/control` et les marges intérieures gauche et droite à `space/md`, et réglez les marges haute et basse sur 10.
4. Appuyez sur <kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd> (<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>K</kbd>) pour en faire un composant.
5. Double-cliquez dans le composant et sélectionnez le calque Label. À côté de son texte, dans **Typographie**, utilisez **Appliquer une variable/propriété → Créer une propriété…** pour créer une propriété de texte nommée `Label`. Les instances changent maintenant leur libellé sans être détachées.
6. Sélectionnez le composant et cliquez sur **Ajouter une variante** dans l'en-tête du panneau. Le composant devient un ensemble de deux variantes. Dans **Propriétés**, renommez la propriété de variante en `Variant` et ses valeurs en `Primary` et `Secondary`, puis nommez l'ensemble `Button`.
7. Dans la variante Secondary, liez le remplissage à `color/secondary` et celui du libellé à `color/text`.
8. Sélectionnez l'ensemble puis, dans **Comportement**, cliquez sur **+** et choisissez **Button**. L'aperçu (<kbd>⌥</kbd><kbd>⌘</kbd><kbd>↩</kbd> / <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>Enter</kbd>) l'exécute désormais comme un vrai bouton.

## 3. Construire la Card

1. Dessinez un cadre de 320 px de large, donnez-lui un auto-layout vertical et réglez sa hauteur sur **Ajuster au contenu**. Liez ses marges intérieures à `space/lg`, son espacement à `space/md`, son rayon à `radius/card`, son remplissage à `color/surface` et un contour de 1 px à `color/border`.
2. Ajoutez un calque de texte `Card title`, en Inter Semi Bold 18 px, et nommez-le `Title`. Liez son remplissage à `color/text` et réglez sa largeur sur **Remplir**.
3. En dessous, ajoutez un cadre nommé `Content` avec un auto-layout vertical, sans remplissage, en largeur **Remplir** et en hauteur **Ajuster au contenu**. Placez-y un calque de texte, par exemple `Slots hold content that each card chooses for itself.`, en Inter Regular 14 px, lié à `color/text-muted`, et nommez-le `Body`.
4. Ajoutez un cadre nommé `Actions` avec un auto-layout horizontal et un espacement lié à `space/sm`. Faites-y glisser un Button depuis **Ressources**.
5. Sélectionnez le cadre extérieur et faites-en un composant nommé `Card`. Liez le titre à une propriété de texte nommée `Title`, comme pour le libellé du bouton.
6. Sélectionnez le cadre `Content` et choisissez **Créer un slot** dans le menu contextuel ou dans la section **Slots**. Faites de même pour `Actions`. Chaque instance peut maintenant remplacer le contenu de ces cadres, et celui du composant principal devient le contenu par défaut.

Les réglages d'un slot le décrivent, limitent le nombre de calques qu'il contient et nomment des composants préférés ; `Actions` pourrait par exemple préférer `Button` et contenir au plus 2 calques.

## 4. Utiliser les composants

1. Ajoutez une page nommée `Examples` et dessinez un cadre nommé `Light` avec un auto-layout vertical, des marges intérieures et un espacement liés à `space/lg` et un remplissage lié à `color/background`.
2. Placez-y deux instances de Card : faites un clic droit sur la Card et choisissez **Créer une instance**, ou faites-la glisser depuis **Ressources**. Réglez leur propriété **Title** sur `Welcome back` et `Pro plan`.
3. Dans la deuxième carte, sélectionnez le bouton du slot `Actions` et supprimez-le, puis collez ou faites glisser deux instances de Button : une Secondary avec le libellé `Not now` et une Primary avec `Upgrade`. Modifiez le texte de son slot `Content`. Le contenu d'un slot appartient à l'instance et reste en place quand la Card change ; **Réinitialiser le slot** dans le menu du slot rétablit le contenu du composant.
4. Dupliquez le cadre `Light` et nommez la copie `Dark`. Dans **Apparence**, utilisez **Appliquer un mode de variable** pour régler la collection `Theme` sur `Dark`. Toutes les couleurs liées du cadre changent, et les cartes restent liées à leurs composants.

Modifiez maintenant un token ou un composant principal, par exemple `radius/card` ou les marges intérieures du Button, et regardez les deux cadres se mettre à jour.

## 5. Aller plus loin

- **Publiez-le comme bibliothèque.** Ouvrez **Ressources → Gérer les bibliothèques → Publier la bibliothèque** pour que d'autres fichiers utilisent le Button et la Card et acceptent les mises à jour quand vous les modifiez ([Bibliothèques de composants](./components#component-libraries)).
- **Transmettez les tokens au code.** `pairdraw tokens design-system.fig` affiche les variables sous forme de propriétés personnalisées CSS, `--format tailwind` sous forme de thème Tailwind v4 et `--format dtcg --out tokens/` sous forme de fichiers de design tokens W3C. L'export HTML écrit les valeurs liées comme des références `var()` à ces mêmes propriétés ([Exporter](./exporting)).
- **Vérifiez-le.** [Vérifier les designs](/user-guide/checking-designs) et `pairdraw lint design-system.fig --fix -o fixed.fig` trouvent les couleurs qui correspondent à un token sans y être liées, et les lient.
- **Suivez les modifications.** Gardez le fichier dans Git et examinez les modifications avec [`pairdraw diff files`](/fr/programmable/cli/git).

## Générer l'exemple avec un script

Le fichier d'exemple est généré par ce script, qui utilise la même [API de plugins compatible Figma](/fr/programmable/cli/scripting) que `pairdraw eval`. Exécutez-le pour créer le fichier vous-même, ou modifiez-le pour essayer vos propres tokens :

```sh
echo '{"children":[]}' > empty.pen
pairdraw eval empty.pen --stdin -o design-system.fig < design-system.js
```

<<< @/public/examples/design-system.js
