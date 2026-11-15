---
title: Calques et pages
description: Gérer les calques, les pages et le panneau des propriétés dans Pairdraw.
---

# Calques et pages

L’éditeur s’ouvre sur la zone de travail seule. Les outils se trouvent à gauche de la zone de travail, avec le bouton du panneau des calques au-dessus, et le zoom dans le coin inférieur droit. Le panneau des calques s’ouvre à gauche, celui des propriétés à droite et le chat avec l’IA dans une colonne à côté ; tous se redimensionnent en faisant glisser leurs bords. Voir [Panneaux latéraux](./canvas-navigation#side-panels) pour savoir quand chaque panneau s’affiche.

Tant que le chat avec l’IA est fermé, une consigne en bas de la zone de travail envoie ce que vous écrivez au chat ; désactivez-la avec **Consigne sur le canevas** dans **Paramètres → Modèles → Discussion**. <kbd>Escape</kbd> dans la consigne revient à la zone de travail.

## Panneau des calques

Le panneau des calques, à gauche, affiche la hiérarchie du document sous forme d’arbre.

### Arbre

Les objets apparaissent dans un arbre repliable. Cliquez sur le chevron à côté d’un cadre, d’un groupe ou d’un composant pour déplier ou replier ses enfants.

### Réordonner par glisser-déposer

Faites glisser les calques pour modifier leur ordre ou leur conteneur. Les objets placés plus haut dans la liste s’affichent au-dessus.

### Visibilité

Cliquez sur l’œil à côté d’un calque pour le masquer ou l’afficher sur la zone de travail. Les objets masqués restent dans l’arbre. Le cadenas empêche les modifications accidentelles.

### Renommer

Double-cliquez sur le nom d’un calque pour le renommer sur place. Appuyez sur <kbd>Enter</kbd> ou cliquez ailleurs pour valider, sur <kbd>Escape</kbd> pour annuler.

### Synchronisation de la sélection

Cliquer sur un calque dans le panneau sélectionne l’objet correspondant sur la zone de travail, et inversement. <kbd>Shift</kbd> permet de sélectionner plusieurs calques.

### Rechercher des calques

Appuyez sur <kbd>⌘</kbd><kbd>F</kbd> (<kbd>Ctrl</kbd> + <kbd>F</kbd>), choisissez **Édition → Rechercher des calques…** ou lancez la commande depuis la palette de commandes pour chercher les calques de la page affichée par leur nom. Choisir un résultat sélectionne ce calque et l’amène dans la vue.

## Panneau des pages

Le panneau des pages affiche toutes les pages du document.

- **Changer de page :** cliquez sur l’onglet d’une page pour l’activer. La zone de travail passe à cette page et restaure sa position d’affichage.
- **Ajouter une page :** cliquez sur le bouton d’ajout pour créer une page.
- **Supprimer une page :** retirez la page actuelle.
- **Renommer une page :** double-cliquez sur son nom pour le modifier sur place. <kbd>Enter</kbd>, <kbd>Escape</kbd> ou un clic ailleurs valide le nouveau nom.

Chaque page a sa propre zone de travail et son propre état d’affichage. Le menu contextuel déplace la sélection vers une autre page. Lors d’un changement de page, Pairdraw restaure sa vue et sa sélection.

## Panneau des diapositives

Le panneau des diapositives liste les cadres de premier niveau de la page sous forme de vignettes numérotées, dans l’ordre des calques. Cliquez sur une diapositive pour montrer son cadre sur la zone de travail, et faites glisser une diapositive — ou appuyez sur <kbd>Alt</kbd> avec une flèche haut ou bas — pour la réordonner. **Exporter les diapositives en PDF** écrit toutes les diapositives, dans l’ordre, dans un seul fichier PDF.

## Mode présentation

Présenter montre les diapositives de la page en plein écran, une à la fois. Démarrez-le avec <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Entrée</kbd>, **Affichage → Présenter** ou le bouton Présenter de la barre supérieure. Les flèches, <kbd>Espace</kbd>, <kbd>Entrée</kbd>, <kbd>Page précédente</kbd>/<kbd>Page suivante</kbd> et la molette font défiler les diapositives ; <kbd>Échap</kbd> quitte et rend la zone de travail et le focus clavier à leur état d’origine. Une diapositive plus haute que l’écran s’affiche à 100 % et peut être défilée.

## Documents et récupération

Accueil commence par une consigne : choisissez au-dessus ce qu’il faut créer (page d’accueil, app mobile, app web, diapositives, tableau de bord ou autre chose), décrivez-le, et Pairdraw ouvre un nouveau design et envoie la consigne à son chat avec l’IA, avec un guide pour ce type ; les exemples en dessous remplissent la consigne avec une idée à modifier. Sous la consigne, vous pouvez partir d’un fichier Figma, d’une page du navigateur intégré (application de bureau) ou d’une capture d’écran que l’agent recrée. Des onglets passent de **Récents** à **Brouillons** et **Systèmes de design**, et le menu à côté liste les emplacements qu’ajoutent votre serveur Cloud et votre bucket de stockage. Un champ de recherche filtre la liste, **Ouvrir…** ouvre un fichier et **Design** commence un design vide.

**Récents** liste les documents locaux récents. Utilisez la vue en grille ou en liste et triez les fichiers récents par **Nom**, **Dernière utilisation** ou **Création**. <kbd>⌘</kbd>/<kbd>Ctrl</kbd>-clic ajoute un fichier à la sélection, <kbd>Maj</kbd>-clic sélectionne une plage, et <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>A</kbd> sélectionne tous les fichiers listés ; la barre de sélection les ouvre ensuite dans des onglets d’éditeur séparés, les retire des Récents ou supprime les documents stockés. Le menu <kbd>⋯</kbd> d’un fichier ou son menu contextuel propose **Retirer des Récents**, qui oublie le fichier sans le supprimer, et **Enregistrer sous…**, qui enregistre une copie ailleurs. **Systèmes de design** liste Pairdraw Basics, fournie avec l’application, et les bibliothèques de composants que vous avez publiées, comme Bonus ; en choisir une ouvre un nouveau design avec cette bibliothèque activée dans le panneau des ressources.

Un nouveau design reste conservé comme brouillon sur cet appareil pendant que vous y travaillez : chaque modification est écrite peu après que vous l’avez faite, donc fermer son onglet ne demande rien. **Brouillons** sur Accueil les liste avec un aperçu ; ouvrez-en un pour continuer, ou choisissez **Supprimer le brouillon** dans son menu <kbd>⋯</kbd> ou contextuel pour le supprimer définitivement. Enregistrer un brouillon dans un fichier ou dans un stockage, dans l’éditeur ou avec **Enregistrer sous…** sur Accueil, le sort des Brouillons. Les brouillons ne vivent que dans ce profil de navigateur ou cette installation de bureau, et demandent que **Conserver automatiquement le travail non enregistré** soit activé et un navigateur qui garde les données du site.

Dans **Paramètres → Général → Récupération**, **Conserver automatiquement le travail non enregistré** contrôle les brouillons et les copies de récupération locales. La récupération étant activée, les documents non enregistrés sans chemin de fichier restent récupérables même après la fermeture de leurs onglets. Quand Pairdraw propose **Récupérer le travail non enregistré**, choisissez **Restaurer** pour rouvrir un document ou **Abandonner** pour supprimer sa copie de récupération.

Un fichier que vous avez ouvert garde aussi une copie de secours des modifications qui n’ont pas encore été enregistrées avec lui, écrite pendant que l’enregistrement automatique est désactivé, ou quand la fenêtre se ferme avant que l’enregistrement automatique les ait écrites. La prochaine fois que ce fichier s’ouvre, **Modifications récupérées** propose **Enregistrer** pour les écrire dans le fichier, **Enregistrer sous…** pour les ouvrir à part et les enregistrer comme un nouveau fichier, ou **Ne pas enregistrer** pour laisser le fichier en l’état et abandonner la copie. Fermer la boîte de dialogue garde la copie pour la prochaine fois. Enregistrer le fichier abandonne ses copies plus anciennes, et dans le navigateur une copie plus ancienne que le dernier changement du fichier n’est pas proposée. Une copie dont le fichier n’a pas été ouvert pendant une semaine, par exemple parce que le fichier a été déplacé, figure elle aussi dans **Récupérer le travail non enregistré**.

Désactiver la récupération arrête la conservation automatique et retire les copies de récupération des documents actuellement ouverts. Elle ne supprime pas en masse les instantanés des documents fermés auparavant. La récupération est locale à cette installation ou à ce profil de navigateur ; elle ne remplace pas l’enregistrement d’un fichier, la synchronisation dans le cloud ni une copie de secours.

## Bonus {#goodies}

Le bouton cadeau de la barre supérieure, **Objet → Bonus…** ou la palette de commandes ouvre Bonus, une collection de points de départ : des styles à épingler au chat avec l’IA, les systèmes de design que vous pouvez activer, des scripts qui arrivent sur la zone de travail sous forme de [calques de script](/user-guide/script-layers), et les shaders de la galerie, qui remplissent les calques sélectionnés ou un nouveau rectangle.

## Panneau des propriétés

Le panneau des propriétés, à droite, passe de Design à Code, avec [Vérifier](/user-guide/checking-designs) sous forme d’onglet à icône à côté. Le chat avec l’IA s’ouvre dans sa propre colonne à côté.

### Onglet Design

Affiche les propriétés du ou des objets sélectionnés, organisées en sections :

- **Apparence :** opacité, rayon des coins (avec bouton pour des coins indépendants) et visibilité.
- **Remplissage :** couleur unie, dégradés (linéaire, radial, angulaire, diamant), remplissages d’image et liaisons de variables.
- **Contour :** couleur, épaisseur, extrémités, jointures et motif de tirets.
- **Effets :** ombre portée, ombre intérieure, flou de calque, flou d’arrière-plan et flou de premier plan.
- **Typographie :** famille de police, taille, graisse et boutons de mise en forme G/I/S/B (visible pour les objets texte).
- **Disposition :** réglages de la [disposition automatique](./auto-layout) (visible pour les cadres en disposition automatique).
- **Export :** échelle, format et bouton d’export (voir [Exporter](./exporting)).

Sans sélection, l’onglet Design affiche les propriétés de la page, dont la couleur d’arrière-plan de la zone de travail.

### Onglet Code

Affiche la sélection sous forme de code avec coloration syntaxique, numéros de ligne et bouton de copie. Choisissez la sortie :

- **Design JSX** : l’arbre de composants de Pairdraw, que `renderJSX()` relit ; modifiez-le en direct et les calques suivent.
- **HTML** : du balisage stylé en CSS simple ou avec des classes Tailwind.
- **Vue** et **React** : des composants pour la sélection, stylés en CSS ou avec Tailwind.

Tant que l’onglet Code est ouvert, il souligne aussi les erreurs et avertissements de l’analyse de design dans le code de leurs calques ([Checking Designs](/user-guide/checking-designs#in-the-code-panel)).

## Colonne du chat avec l’IA

Le [chat avec l’IA](/fr/programmable/ai-chat) crée et modifie des éléments de design à partir de demandes en langage naturel. Il s’ouvre dans sa propre colonne, à droite du panneau des propriétés, pour que l’onglet Design reste visible pendant qu’un agent travaille. Ouvrez-le et fermez-le avec le bouton à étincelles parmi les actions du document dans la barre supérieure ou avec <kbd>⌘</kbd><kbd>J</kbd> ; faites glisser son bord pour le redimensionner. La colonne reste ouverte ou fermée, à la largeur où vous l’avez laissée, d’un rechargement à l’autre. Configurez les modèles réutilisables et les connexions aux fournisseurs dans les Paramètres, et parcourez les conversations enregistrées localement depuis le menu d’historique du chat.

## Raccourcis clavier

| Action | Mac | Windows / Linux |
|--------|-----|-----------------|
| Ouvrir ou fermer la colonne du chat avec l’IA | <kbd>⌘</kbd><kbd>J</kbd> | <kbd>Ctrl</kbd> + <kbd>J</kbd> |
| Rechercher des calques | <kbd>⌘</kbd><kbd>F</kbd> | <kbd>Ctrl</kbd> + <kbd>F</kbd> |

## Disposition mobile

Sur mobile et sur les petits écrans, les panneaux latéraux sont remplacés par un tiroir inférieur que l’on fait glisser. Des onglets en haut du tiroir passent des vues Calques, Propriétés, Design et Code à la vue IA. La barre d’outils se réduit à une bande horizontale compacte avec changement de catégorie.

## Conseils

- La largeur des panneaux, y compris celle de la colonne du chat avec l’IA, est enregistrée automatiquement et conservée d’un rechargement à l’autre.
- Utilisez le panneau des calques pour trouver des objets superposés difficiles à atteindre sur la zone de travail.
- Le [menu contextuel](./context-menu) propose d’autres actions pour les objets sélectionnés.
- Voir [Sélection et transformation](./selection-and-manipulation) pour les raccourcis d’ordre d’empilement (<kbd>]</kbd>/<kbd>[</kbd>) et les boutons de visibilité et de verrouillage.
