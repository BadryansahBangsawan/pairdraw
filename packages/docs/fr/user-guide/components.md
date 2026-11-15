---
title: Composants
description: Créer des composants réutilisables, des instances, des jeux de composants, des surcharges et la synchronisation en direct dans Pairdraw.
---

# Composants

Les composants sont des éléments de design réutilisables. Modifiez le composant principal et toutes ses instances se mettent à jour automatiquement.

## Parcourir les composants {#browse-components}

Ouvrez l’onglet **Ressources** du panneau de gauche pour parcourir les composants locaux et les bibliothèques activées. Utilisez la vue en grille ou en liste, cherchez par nom de composant et sélectionnez un composant pour voir ses détails. Insérez une ressource en cliquant dessus, en appuyant sur <kbd>Enter</kbd> ou en la faisant glisser sur la zone de travail.

Les ressources locales sont regroupées par page d’origine. Les ressources de bibliothèques publiées restent disponibles quand leur révision a été téléchargée, y compris lorsque le fournisseur distant est temporairement hors ligne.

## Créer un composant {#creating-a-component}

Sélectionnez un cadre ou un groupe et appuyez sur <kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd> (<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>K</kbd>). La sélection devient un composant réutilisable.

Tout autre calque, ou plusieurs calques, est enveloppé dans un nouveau composant blanc aux dimensions de leurs limites, à la place du calque le plus haut dans la liste des calques ; un calque enveloppé seul donne son nom au composant.

Les composants affichent au-dessus d’eux une étiquette violette avec une icône en losange.

## Jeux de composants et variantes {#component-sets-and-variants}

Sélectionnez deux composants ou plus et choisissez **Créer un jeu de composants** dans le menu contextuel pour les combiner en un jeu de composants : un conteneur avec une bordure violette en pointillés et 20 px de marge intérieure autour de ses enfants, comme dans Figma. Les jeux créés par des scripts avec `figma.combineAsVariants()` enveloppent exactement leurs composants, comme le fait l’API de plugins de Figma.

Chaque composant d’un jeu peut définir des valeurs sur plusieurs dimensions de variante, comme `Size=Small`, `State=Hover` et `Theme=Dark`. Pairdraw accepte les combinaisons éparses : un jeu n’a pas besoin de toutes les combinaisons possibles. La variante située en haut à gauche est celle par défaut et sert de repli quand une mise à jour ne contient plus une combinaison exacte.

Sélectionnez un composant et cliquez sur **Ajouter une variante** dans l’en-tête du panneau pour le transformer en jeu de composants, comme le fait Figma : le composant devient `Property 1=Default` et une copie nommée `Property 1=Variant2` apparaît en dessous. Sur un jeu, **Ajouter une variante** copie sa dernière variante avec la valeur suivante. Les propriétés de variante du jeu sont des lignes de sa liste **Propriétés** ; cliquez sur l’une d’elles pour la renommer, ou pour ajouter, renommer, réordonner par glisser-déposer ou supprimer ses valeurs. Supprimer une valeur encore utilisée par des variantes déplace d’abord celles-ci vers une autre valeur, et les variantes qui partagent toutes leurs valeurs sont nommées dans un avis qui les sélectionne.

## Propriétés de composant {#component-properties}

Les composants et les jeux de composants acceptent des propriétés réutilisables de texte, de visibilité booléenne, de permutation d’instance et de slot. Sélectionnez une instance pour modifier leurs valeurs sans la détacher. Les propriétés et leurs valeurs sont conservées à l’enregistrement et à la réouverture des fichiers `.fig`.

Pour lier un calque d’un composant principal à une propriété, utilisez le bouton de liaison là où se trouve son champ : **Typographie** pour le contenu du texte, **Apparence** pour la visibilité, et l’en-tête de l’instance pour le composant permuté. Créez une propriété à partir de la valeur actuelle du calque ou choisissez-en une existante ; le champ affiche alors la propriété au lieu de sa valeur. Taper dans un texte lié règle la propriété : sa valeur par défaut dans le composant principal, la valeur de l’instance dans une instance.

Sélectionnez le composant principal pour voir ses **Propriétés**. Cliquez sur une propriété pour la renommer, changer sa valeur par défaut, voir et délier les calques qu’elle pilote, ou la supprimer, et faites glisser les propriétés pour les réordonner. **+** ajoute une propriété de texte, booléenne ou de permutation d’instance.

Pour afficher les propriétés d’une instance imbriquée sur les instances du composant, choisissez **+ → Instances imbriquées** et cochez-la, comme le fait **Expose properties from nested instances** dans Figma. Les instances du composant listent alors ses propriétés sous son nom. Seule une instance dont le composant a des propriétés peut être exposée.

## Slots {#slots}

Un slot est un cadre d’un composant principal dont chaque instance peut changer le contenu. Sélectionnez un cadre dans un composant principal et choisissez **Créer un slot** dans le menu contextuel ou la section Slots, ou sélectionnez d’autres calques pour les envelopper dans un nouveau cadre de slot. Les réglages du slot définissent une description, les composants qu’il préfère et le nombre d’éléments qu’il contient ; une instance hors de ces limites affiche un avertissement. Dans une instance, ajoutez, réordonnez et supprimez les éléments d’un slot, ou rétablissez le contenu du composant.

## Comportements et aperçu {#behaviours-and-preview}

Un comportement fait fonctionner un composant principal ou un jeu de composants comme un vrai contrôle, d’après les primitives de [Reka UI](https://reka-ui.com) : Bouton, Champ de texte, Zone de texte, Champ numérique, Bascule, Interrupteur, Case à cocher, Bouton radio, Groupe radio, Groupe de bascules, Curseur, Progression, Onglets, Repliable ou Accordéon. Sélectionnez le composant et utilisez **+** dans la section **Comportement** pour en choisir un.

La section liste ce dont le contrôle a besoin :

- **Values :** la propriété qui contient chaque valeur : une propriété de variante ou booléenne pour Activé, Coché, Appuyé, Ouvert, Rempli ou Désactivé (avec les valeurs de variante qui signifient activé et désactivé), une propriété de texte pour le texte d’un champ, ou les minimum, maximum, pas et valeur par défaut propres à un curseur.
- **Parts :** le slot qui dessine chaque partie, comme le bouton d’un interrupteur, la piste, la plage et le bouton d’un curseur, ou une liste d’onglets. Le slot des éléments d’un groupe contient des instances de ses boutons radio, bascules ou repliables.
- **États :** une propriété de variante dont les valeurs dessinent les états par défaut, survol, appuyé, focus et désactivé. Les valeurs nommées comme ces états sont reconnues automatiquement.

Les lignes requises par le contrôle viennent en premier ; les autres sont sous **Plus d’options**. Quand un composant n’a encore rien à lier, une ligne propose de le créer : un calque de texte et une propriété de texte, des variantes Off et On, ou un slot, et **États** propose **Ajouter des variantes d’état**, qui ajoute des variantes Default, Hover, Pressed, Focus et Disabled du composant. Un composant principal seul qui reçoit ainsi des variantes devient un jeu de composants, et un slot ajouté à un jeu apparaît dans chaque variante. Tant que le contrôle ne fonctionne pas, une ligne sous son nom indique ce qui manque encore ; un clic y mène.

Appuyez sur <kbd>⌥</kbd><kbd>⌘</kbd><kbd>↩</kbd> (<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>Enter</kbd>), choisissez **Affichage → Aperçu** ou utilisez le bouton ▶ Aperçu de la barre supérieure pour prévisualiser la zone de travail. Chaque calque de premier niveau contenant des contrôles s’exécute sous forme de composants Reka UI en direct au-dessus de la zone de travail, dessinés par les variantes du composant : les interrupteurs basculent, les curseurs glissent, les onglets et accordéons s’ouvrent, et les champs de texte sont de vrais champs avec le point d’insertion, la sélection et le collage du navigateur. L’aperçu ne modifie jamais le document ni son historique. **Réinitialiser** remet chaque contrôle dans son état de conception, et <kbd>Échap</kbd> ou le bouton de fermeture de la pastille revient à l’édition. En vue partagée, chaque zone de travail se prévisualise séparément.

Les comportements sont enregistrés dans les fichiers `.fig` et publiés avec les composants de bibliothèque.

## Bibliothèques de composants {#component-libraries}

Une bibliothèque de composants publie des composants réutilisables sous forme de révision immuable. Chaque ressource publiée a une identité stable de bibliothèque, de ressource et de révision : des instances différentes peuvent donc rester sur des révisions différentes jusqu’à ce que vous les mettiez à jour explicitement.

**Pairdraw Basics** est le jeu original inclus : des composants bouton, champ, badge, carte et avatar, publiés comme `pairdraw-basics`. Il est dans le panneau Ressources sans catalogue : activez-le pour insérer ses composants, y compris hors ligne, et il reste après un rechargement. `pairdraw libraries seed --root ./catalog` publie toujours ce même jeu dans un catalogue de fichiers.

### Publier une bibliothèque {#publish-a-library}

1. Créez les composants et jeux de composants que vous voulez partager.
2. Ouvrez **Ressources**, puis choisissez **Gérer les bibliothèques**.
3. Choisissez **Publier la bibliothèque**.
4. Saisissez un identifiant de bibliothèque stable et un nom d’affichage. L’identifiant est verrouillé après la première publication.
5. Si vous le souhaitez, cherchez dans la liste des changements et saisissez une description de révision.
6. Sélectionnez les ressources ajoutées, modifiées, renommées ou supprimées à inclure.
7. Confirmez la destination et choisissez **Publier la bibliothèque**.

Lors des publications suivantes, les changements non cochés restent en attente. Les ressources inchangées gardent leur définition publiée précédente, et les définitions supprimées restent disponibles tant que des documents font référence à leur révision historique.

### Activer et insérer des ressources de bibliothèque {#enable-and-insert-library-assets}

Ouvrez **Ressources → Gérer les bibliothèques** pour activer une bibliothèque publiée. Ses composants apparaissent dans le panneau Ressources à côté des composants locaux. Insérez-en un en cliquant dessus, au clavier ou en le faisant glisser sur la zone de travail.

Les définitions publiées sont en lecture seule dans les documents qui les utilisent. Modifiez le document source et publiez une nouvelle révision pour changer une définition. Les instances liées à ces définitions restent modifiables par leurs propriétés de composant et leurs surcharges.

### Examiner et accepter les mises à jour {#review-and-accept-updates}

Ouvrez **Gérer les bibliothèques → Mises à jour** pour découvrir les révisions plus récentes. Cette découverte ne modifie pas le document. Vous pouvez comparer côte à côte l’instance actuelle et l’instance mise à jour, passer d’une instance concernée à l’autre, puis mettre à jour :

- l’instance sélectionnée ;
- toutes les instances d’une ressource ;
- les instances de la page actuelle ;
- les instances de toutes les pages.

Pairdraw conserve les affectations compatibles de texte, de visibilité et de permutation d’instance. Si une variante exacte n’existe plus, l’examen indique la variante de repli en haut à gauche avant que vous acceptiez. Appliquer une mise à jour crée une entrée d’annulation.

### Usage local, stockage et hors ligne {#local-storage-and-offline-use}

Les bibliothèques peuvent utiliser le catalogue local du navigateur ou un fournisseur de stockage configuré. La publication distante utilise des objets de révision immuables et un pointeur conditionnel vers la dernière révision, ce qui empêche deux personnes qui publient de s’écraser mutuellement sans le savoir.

Les révisions téléchargées sont mises en cache localement. Un document peut continuer à afficher et à insérer les définitions téléchargées hors ligne. Les erreurs d’intégrité sont signalées au lieu d’être masquées par les données en cache.

### Enregistrer les documents qui utilisent une bibliothèque {#saving-consumer-documents}

Les liaisons aux bibliothèques activées et les définitions matérialisées sont enregistrées avec les documents `.fig`. Rouvrir un fichier qui utilise une bibliothèque conserve ses instances liées et l’identité de leurs révisions, même quand sa bibliothèque distante est indisponible.

## Créer des instances {#creating-instances}

Faites un clic droit sur un composant et choisissez **Créer une instance** dans le menu contextuel. L’instance apparaît 40 px à droite du composant source, visuellement identique. Vous pouvez aussi insérer le composant depuis Ressources.

La création d’instance passe uniquement par le menu contextuel : il n’y a pas de bouton dans la barre d’outils.

## Détacher une instance {#detaching-an-instance}

Sélectionnez une instance et appuyez sur <kbd>⌥</kbd><kbd>⌘</kbd><kbd>B</kbd> (<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>B</kbd>) pour la détacher. L’instance devient un cadre ordinaire, sans lien avec le composant d’origine. Toutes les surcharges y sont intégrées.

## Convertir en cadre {#convert-to-frame}

Sélectionnez un composant principal et appuyez sur <kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd> (<kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>K</kbd>), les touches de création de composant, ou choisissez **Convertir en cadre** dans son menu contextuel, dans le menu du type de calque ou dans **Objet › Convertir en cadre**, pour le retransformer en cadre. Quand le composant a des instances, une confirmation indique leur nombre ; la conversion détache chaque instance en un cadre qui garde son apparence, y compris les copies imbriquées dans les instances d’autres composants. L’ensemble du changement est une seule étape d’annulation.

## Aller au composant principal {#go-to-main-component}

Faites un clic droit sur une instance et choisissez **Aller au composant principal**. L’éditeur sélectionne le composant principal et l’affiche, en changeant de page si nécessaire.

## Synchronisation en direct {#live-sync}

Quand vous modifiez un composant, toutes ses instances se mettent à jour automatiquement, comme dans Figma : chaque propriété qu’une instance ne surcharge pas suit le composant. Cela couvre la taille, les remplissages, les contours et leur épaisseur, alignement, extrémités, jointures et tirets, les effets, l’opacité, le mode de fusion, les rayons et le lissage des coins, les réglages et grilles de disposition, le rognage, les styles partagés et le texte, de sa police et sa taille à l’approche, l’interligne, la casse, la décoration, l’alignement et les plages de style.

Un calque dans une instance reprend aussi du composant sa position, sa rotation, ses retournements, ses contraintes et son masque. Déplacez ou faites pivoter un calque dans le composant et il bouge dans chaque instance. Quand une instance n’a pas la même taille que son composant, le calque est placé selon ses contraintes : un calque ancré à droite garde sa distance au bord droit. En disposition automatique, c’est la disposition qui le place.

La synchronisation se déclenche automatiquement après les mises à jour, déplacements et redimensionnements d’objets dans un composant.

## Surcharges {#overrides}

Les instances peuvent surcharger certaines propriétés sans rompre le lien de synchronisation. Quand une propriété est surchargée sur une instance, elle est ignorée lors de la synchronisation ; les autres propriétés continuent de suivre le composant principal.

### Propriétés surchargeables {#overridable-properties}

Un calque dans une instance peut surcharger son nom, son texte, ses plages de style et sa police, toutes les propriétés visuelles et textuelles listées plus haut, sa taille, ainsi que sa visibilité et son verrouillage. Sa position, sa rotation, ses retournements, ses contraintes et son masque ne peuvent pas être surchargés : ils viennent toujours du composant. Les scripts qui règlent sa position, sa rotation, ses contraintes ou son masque reçoivent l’erreur de Figma. Le contenu des slots appartient à l’instance et reste modifiable.

Les surcharges d’un fichier `.fig` reviennent comme surcharges à son ouverture, et sont enregistrées comme Figma les écrit.

### Nouveaux enfants {#new-children}

Quand vous ajoutez un enfant à un composant, toutes les instances existantes en reçoivent automatiquement une copie. L’ordre des enfants dans les instances correspond toujours à celui du composant.

### Modes de variables {#variable-modes}

Une instance, ou un calque qu’elle contient, qui fixe le mode d’une collection de variables garde ce mode et continue de recevoir les modes du composant pour toutes les autres collections. Changez le mode de densité du composant principal, et une instance qui n’a changé que son thème suit la nouvelle densité.

### Permuter une instance {#swapping-an-instance}

Sélectionnez une instance, même imbriquée, et cliquez sur le bouton de permutation de son en-tête pour afficher un autre composant à sa place. La liste contient tous les composants du document ; un composant qui se contiendrait lui-même est désactivé. Une instance imbriquée permutée le reste quand son composant englobant change. Quand la permutation est liée à une propriété de permutation d’instance, l’en-tête affiche la propriété à la place.

### Remplacer un calque dans une instance {#replacing-a-layer-inside-an-instance}

Copiez un calque, sélectionnez un calque dans une instance et appuyez sur <kbd>⌥</kbd><kbd>⇧</kbd><kbd>R</kbd> (<kbd>Alt</kbd> + <kbd>Shift</kbd> + <kbd>R</kbd>) ou choisissez **Remplacer dans l’instance** dans le menu Édition ou le menu contextuel. Le calque copié prend la place et la position du calque sélectionné comme surcharge de l’instance, sans la détacher : le reste de l’instance continue de suivre son composant, et le remplacement reste quand le composant change, jusqu’à ce que le composant supprime le calque remplacé. Avec plusieurs calques sélectionnés, chacun reçoit sa propre copie. Si rien n’est sélectionné dans une instance, ces touches collent en remplaçant.

Sélectionnez le remplacement et cliquez sur **Restaurer le calque du composant** dans son en-tête pour rétablir le calque du composant. Les remplacements sont enregistrés dans les fichiers `.fig` comme données de plugin Pairdraw sur l’instance ; Figma affiche le calque du composant à la place.

## Sélection au clic {#hit-testing}

Les composants et les instances sont des conteneurs opaques : cliquer sur un enfant sélectionne le composant lui-même, et non l’enfant. **Double-cliquez** pour entrer dans le composant et sélectionner ses enfants.

## Apparence {#visual-treatment}

| Élément | Apparence |
|---------|-----------|
| Étiquette de composant | Violette avec icône en losange, toujours visible |
| Étiquette d’instance | Violette avec icône en losange, toujours visible |
| Bordure de jeu de composants | Contour violet en pointillés |

## Raccourcis clavier {#keyboard-shortcuts}

| Action | Mac | Windows / Linux |
|--------|-----|-----------------|
| Créer un composant | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>K</kbd> | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>K</kbd> |
| Détacher l’instance | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>B</kbd> | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>B</kbd> |
| Aperçu | <kbd>⌥</kbd><kbd>⌘</kbd><kbd>↩</kbd> | <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>Enter</kbd> |

## Conseils {#tips}

- Modifier un texte dans une instance crée une surcharge : le texte ne sera pas écrasé quand le composant changera.
- Utilisez les jeux de composants pour organiser des variantes à plusieurs dimensions, comme la taille, l’état et le thème.
- Publiez les ressources réutilisables depuis leur document source ; les définitions publiées sont volontairement en lecture seule dans les documents qui les utilisent.
- Examinez les mises à jour avant de les accepter quand une révision supprime une combinaison exacte de variantes.
- Voir [Menu contextuel](./context-menu) pour toutes les actions liées aux composants.
