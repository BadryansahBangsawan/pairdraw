---
title: Modifier du texte
description: Créer et modifier du texte avec mise en forme enrichie, polices et édition directe dans Pairdraw.
---

# Modifier du texte

Créez des objets texte et modifiez-les directement sur la zone de travail, avec une prise en charge complète du texte enrichi.

## Créer du texte

Appuyez sur <kbd>T</kbd> pour activer l’outil Texte, puis cliquez sur la zone de travail. Un objet texte vide apparaît avec un point d’insertion clignotant : commencez à taper tout de suite.

## Édition directe

Double-cliquez sur un objet texte existant pour passer en mode d’édition directe. Un contour bleu autour du texte indique le mode d’édition. Cliquez à l’extérieur de l’objet texte pour valider et quitter l’édition.

Le texte est dessiné directement sur la zone de travail ; aucun champ de saisie superposé n’apparaît.

## Déplacer le point d’insertion

| Action | Mac | Windows / Linux |
|--------|-----|-----------------|
| Gauche / droite | <kbd>←</kbd> / <kbd>→</kbd> | <kbd>←</kbd> / <kbd>→</kbd> |
| Haut / bas | <kbd>↑</kbd> / <kbd>↓</kbd> | <kbd>↑</kbd> / <kbd>↓</kbd> |
| Mot par mot | <kbd>⌥</kbd><kbd>←</kbd> / <kbd>⌥</kbd><kbd>→</kbd> | <kbd>Ctrl</kbd> + <kbd>←</kbd> / <kbd>Ctrl</kbd> + <kbd>→</kbd> |
| Début / fin de ligne | <kbd>⌘</kbd><kbd>←</kbd> / <kbd>⌘</kbd><kbd>→</kbd> | <kbd>Home</kbd> / <kbd>End</kbd> |

Maintenez <kbd>Shift</kbd> avec n’importe quelle touche de déplacement pour étendre la sélection.

## Sélectionner du texte

- **Un clic** dans un objet texte place le point d’insertion.
- **Un clic suivi d’un glissement** sélectionne une plage de texte.
- **Un double-clic** sur un mot le sélectionne.
- **Un triple-clic** sélectionne tout le texte de l’objet.

## Mise en forme enrichie

Appliquez une mise en forme au texte sélectionné, ou basculez le style de tout l’objet quand rien n’est sélectionné.

| Action | Mac | Windows / Linux |
|--------|-----|-----------------|
| Gras | <kbd>⌘</kbd><kbd>B</kbd> | <kbd>Ctrl</kbd> + <kbd>B</kbd> |
| Italique | <kbd>⌘</kbd><kbd>I</kbd> | <kbd>Ctrl</kbd> + <kbd>I</kbd> |
| Souligné | <kbd>⌘</kbd><kbd>U</kbd> | <kbd>Ctrl</kbd> + <kbd>U</kbd> |

Le barré s’applique avec le bouton **S** de la section Typographie du panneau des propriétés (sans raccourci clavier : <kbd>⌘</kbd><kbd>S</kbd> sert à enregistrer).

La mise en forme s’applique caractère par caractère. Quand vous tapez entre un segment en gras et un segment normal, le nouveau texte hérite du style du segment précédent.

Les boutons **B / I / U / S** de la section Typographie du panneau des propriétés appliquent aussi la mise en forme. Le panneau modifie également famille, style, taille, interligne, approche et alignement. Les mises en forme partielles sont conservées sous forme de plages et participent à l’annulation et au rétablissement.

## Liens

Le texte peut pointer vers une page web ou une adresse de courriel, sur tout le texte ou sur les caractères sélectionnés. Le calque étant sélectionné, choisissez **Ajouter un lien** dans la section Typographie du panneau des propriétés, dans **Texte → Ajouter un lien** dans la barre des menus ou dans le menu contextuel de la zone de travail. L’éditeur de liens s’ouvre sous le texte : tapez une adresse — un domaine seul ou `nom@hôte` reçoit son `https://` ou `mailto:` — et appuyez sur <kbd>Entrée</kbd> pour l’appliquer, ou <kbd>Échap</kbd> pour fermer sans changer. L’éditeur sert aussi à modifier le lien plus tard et à le retirer.

⌘-clic (Ctrl-clic sous Windows et Linux) sur un lien de la zone de travail l’ouvre, tout comme un clic dans l’aperçu.

## Opérations d’édition

| Action | Mac | Windows / Linux |
|--------|-----|-----------------|
| Supprimer le mot avant le point d’insertion | <kbd>⌥</kbd><kbd>⌫</kbd> | <kbd>Ctrl</kbd> + <kbd>Backspace</kbd> |
| Supprimer jusqu’au début de la ligne | <kbd>⌘</kbd><kbd>⌫</kbd> | — |
| Couper | <kbd>⌘</kbd><kbd>X</kbd> | <kbd>Ctrl</kbd> + <kbd>X</kbd> |
| Copier | <kbd>⌘</kbd><kbd>C</kbd> | <kbd>Ctrl</kbd> + <kbd>C</kbd> |
| Coller | <kbd>⌘</kbd><kbd>V</kbd> | <kbd>Ctrl</kbd> + <kbd>V</kbd> |

## Redimensionnement et troncature

Le contrôle **Redimensionnement** de la section Disposition définit comment la zone de texte suit son contenu :

- **Largeur automatique** — la zone grandit pour que chaque ligne tienne sur une seule ligne (le redimensionnement automatique en largeur et hauteur de Figma).
- **Hauteur automatique** — la largeur reste fixe et la zone grandit en hauteur quand le texte passe à la ligne.
- **Fixe** — la zone garde la taille que vous lui donnez.

**Troncature** dans la section Typographie coupe le texte qui dépasse la zone : **Points de suspension finaux** ajoute une ellipse, et **Lignes maximales** limite le nombre de lignes dessinées avant la troncature. Un texte tronqué garde sa zone dans la disposition automatique, ainsi un cadre ajusté au contenu se dimensionne à cette zone au lieu de se réduire à zéro.

## Sélecteur de police

Ouvrez le sélecteur de police dans la section Typographie du panneau des propriétés pour changer de famille. Le sélecteur offre :

- **Un filtre de recherche :** tapez pour réduire la liste des polices.
- **Un aperçu des polices :** chaque nom de police est affiché dans sa propre fonte.
- **Un défilement virtuel :** les longues listes de polices restent fluides.
- **Un retour à la police actuelle :** la police actuelle est mise en évidence à l’ouverture du sélecteur.

## Variables de famille de police

Une famille de police peut provenir d’une variable de type chaîne. Dans la section Typographie, choisissez **Appliquer une variable à la famille de police** à côté de la famille et choisissez une variable dont la valeur est un nom de famille de police. Le texte suit alors la variable : changer le mode de la variable, ou sa valeur, change la famille, et l’éditeur charge les polices de la nouvelle famille. Choisir une police dans le sélecteur détache la variable et applique directement cette police.

## Texte sur un tracé

Les calques de texte sur tracé importés de Figma conservent la disposition courbe de leurs glyphes. Vous pouvez modifier leur texte et leur typographie, les redimensionner et les sélectionner, puis enregistrer ou exporter le résultat en conservant la disposition sur le tracé. Il s’agit de la prise en charge des calques de texte sur tracé déjà importés, et non d’un outil de dessin permettant d’attacher n’importe quel texte à un nouveau tracé.

## Graisse

Changez la graisse dans la section Typographie du panneau des propriétés. Les graisses disponibles dépendent de la famille choisie (par exemple Regular, Medium, Bold, Black).

## Polices variables

Quand la police du texte est variable, comme Inter, la section Typographie liste ses axes (graisse, taille optique, chasse et tous les autres axes de la police) avec la valeur à laquelle chacun est dessiné. Tapez ou faites glisser une valeur pour la régler ; choisir une graisse, une inclinaison ou une famille ramène les axes aux valeurs de ce style. La taille optique affiche **Auto** tant qu’elle suit la taille de police ; saisissez une valeur, ou choisissez **Fixe** dans son menu, pour la figer, et **Auto** pour qu’elle suive de nouveau la taille.

## Sources de polices

- **Police par défaut :** Inter est chargée automatiquement.
- **Application de bureau :** polices du système, plus les catalogues Google Fonts, Fontsource, Bunny Fonts et Fontshare activés.
- **Navigateur :** les polices du système sont disponibles dans Chrome et Edge avec l’autorisation d’accès aux polices locales. Les fournisseurs Fontsource, Bunny Fonts et Fontshare activés peuvent charger des polices en ligne, selon l’accès réseau et les règles CORS du navigateur ; Google Fonts est désactivé dans l’application web Pairdraw.
- **Polices téléchargées :** l’application de bureau met en cache les fontes téléchargées pour les réutiliser sur la même machine.

Autorisez l’accès aux polices du système et choisissez les fournisseurs en ligne dans **Paramètres › Polices**, qu’ouvre la roue dentée à côté de la famille de police ; dans l’application de bureau, cet écran gère aussi les polices téléchargées et les packs de secours.

## Polices du document

Déposez un fichier TTF, OTF, WOFF ou WOFF2 sur la zone de travail pour ajouter sa famille au document lui-même : elle apparaît dans le sélecteur de polices, voyage dans le fichier `.fig` et accompagne les exports web et Storybook. Les polices portées par le document n’exigent ni installation ni fournisseur.

## Polices manquantes et substitutions

Quand une famille ou un style demandé ne peut pas être chargé, Pairdraw affiche un avertissement au-dessus de l’éditeur au lieu de faire passer silencieusement le rendu de secours pour une typographie fidèle.

Dépliez l’avertissement pour voir chaque fonte concernée et son substitut actif. Utilisez **Sélectionner les calques** pour repérer tous les objets texte concernés, ou **Réessayer les polices** après avoir modifié l’accès réseau, l’autorisation d’accès aux polices locales ou les réglages des fournisseurs. Un style peut être synthétisé à partir d’une autre fonte chargée de la même famille ; une famille manquante est remplacée par Inter quand elle est disponible.

## Conseils

- La liste des polices est préchargée au démarrage pour que le sélecteur s’ouvre sans attendre.
- La saisie par IME (chinois, japonais, coréen) est entièrement prise en charge.
- La mise en forme enrichie est conservée à l’ouverture et à l’enregistrement des fichiers `.fig`.
- Voir [Composants](./components) pour le fonctionnement des substitutions de texte dans les instances de composants.
