---
title: Calques et pages
description: Gérer l’arbre des calques, les pages et le panneau des propriétés.
---

# Calques et pages

L’éditeur s’ouvre sur la zone de travail seule. Les outils se trouvent à gauche de la zone de travail, avec le bouton du panneau des calques au-dessus, et le zoom dans le coin inférieur droit. Le panneau des calques s’ouvre à gauche, celui des propriétés à droite et le chat avec l’AI dans une colonne à côté ; tous se redimensionnent en faisant glisser leurs bords.

Tant que le chat avec l’AI est fermé, une consigne en bas de la zone de travail envoie ce que vous écrivez au chat ; désactivez-la avec **Consigne sur le canevas** dans **Paramètres → Modèles → Discussion**. <kbd>Escape</kbd> dans la consigne revient à la zone de travail.

## Calques

Chaque objet apparaît dans l’arbre. Cadres, groupes et composants peuvent être dépliés pour afficher leurs enfants.

- Faites glisser un calque pour modifier son ordre ou son conteneur.
- Utilisez l’œil pour changer sa visibilité.
- Utilisez le cadenas pour empêcher les modifications accidentelles.
- Double-cliquez sur le nom pour le modifier ; confirmez avec <kbd>Enter</kbd> ou annulez avec <kbd>Escape</kbd>.

La sélection de l’arbre et celle de la zone de travail restent synchronisées. <kbd>Shift</kbd> permet de sélectionner plusieurs calques.

## Pages

La liste permet de créer, ouvrir, renommer et supprimer des pages. Chacune conserve sa position et son niveau de zoom.

Le menu contextuel déplace la sélection vers une autre page. Lors d’un changement de page, Pairdraw restaure sa vue et sa sélection.

## Diapositives

Le panneau des diapositives liste les cadres de premier niveau de la page sous forme de vignettes numérotées, dans l’ordre des calques. Cliquez sur une diapositive pour montrer son cadre sur le canevas, et faites glisser une diapositive — ou appuyez sur <kbd>Alt</kbd> avec une flèche haut ou bas — pour la réordonner. **Exporter les diapositives en PDF** écrit toutes les diapositives, dans l’ordre, dans un seul fichier PDF.

## Présenter

Présenter montre les diapositives de la page en plein écran, une à la fois. Démarrez-le avec <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Entrée</kbd>, **Affichage → Présenter** ou le bouton Présenter de la barre supérieure. Les flèches, <kbd>Espace</kbd>, <kbd>Entrée</kbd>, <kbd>Page précédente</kbd>/<kbd>Page suivante</kbd> et la molette font défiler les diapositives ; <kbd>Échap</kbd> quitte et rend le canevas et le focus clavier à leur état d’origine. Une diapositive plus haute que l’écran s’affiche à 100 % et peut être défilée.

## Documents et récupération

Accueil commence par une consigne : choisissez au-dessus ce qu’il faut créer (page d’accueil, app mobile, app web, diapositives, tableau de bord ou autre chose), décrivez-le, et Pairdraw ouvre un nouveau design et envoie la consigne à son chat avec l’AI, avec un guide pour ce type ; les exemples en dessous remplissent la consigne avec une idée à modifier. Sous la consigne, vous pouvez partir d’un fichier Figma, d’une page du navigateur intégré (application de bureau) ou d’une capture d’écran que l’agent recrée. Des onglets passent de **Récents** à **Brouillons** et **Systèmes de design**, et le menu à côté liste les emplacements qu’ajoutent votre serveur Cloud et votre bucket de stockage. Un champ de recherche filtre la liste, **Ouvrir…** ouvre un fichier et **Design** commence un design vide.

**Récents** liste les documents locaux récents. Utilisez la vue en grille ou en liste et triez les fichiers récents par **Nom**, **Dernière utilisation** ou **Création**. ⌘/<kbd>Ctrl</kbd>-clic ajoute un fichier à la sélection, Maj-clic sélectionne une plage, et <kbd>⌘</kbd>/<kbd>Ctrl</kbd>+<kbd>A</kbd> sélectionne tous les fichiers listés ; la barre de sélection les ouvre ensuite dans des onglets d’éditeur séparés, les retire des Récents ou supprime les documents stockés. Le menu <kbd>⋯</kbd> d’un fichier ou son menu contextuel propose **Retirer des Récents**, qui oublie le fichier sans le supprimer, et **Enregistrer sous…**, qui enregistre une copie ailleurs. **Systèmes de design** liste Pairdraw Basics, fournie avec l’application, et les bibliothèques de composants que vous avez publiées, comme Goodies ; en choisir une ouvre un nouveau design avec cette bibliothèque activée dans le panneau des ressources.

Un nouveau design reste conservé comme brouillon sur cet appareil pendant que vous y travaillez : chaque modification est écrite peu après que vous l’avez faite, donc fermer son onglet ne demande rien. **Brouillons** sur Accueil les liste avec un aperçu ; ouvrez-en un pour continuer, ou choisissez **Supprimer le brouillon** dans son menu <kbd>⋯</kbd> ou contextuel pour le supprimer définitivement. Enregistrer un brouillon dans un fichier ou dans un stockage, dans l’éditeur ou avec **Enregistrer sous…** sur Accueil, le sort des Brouillons. Les brouillons ne vivent que dans ce profil de navigateur ou cette installation de bureau, et demandent que **Conserver automatiquement le travail non enregistré** soit activé et un navigateur qui garde les données du site.

Dans **Paramètres → Général → Récupération**, **Conserver automatiquement le travail non enregistré** contrôle les brouillons et les copies de récupération locales. La récupération étant activée, les documents non enregistrés sans chemin de fichier restent récupérables même après la fermeture de leurs onglets. Quand Pairdraw propose **Récupérer le travail non enregistré**, choisissez **Restaurer** pour rouvrir un document ou **Abandonner** pour supprimer sa copie de récupération.

Un fichier que vous avez ouvert garde aussi une copie de secours des modifications qui n’ont pas encore été enregistrées avec lui, écrite pendant que l’enregistrement automatique est désactivé, ou quand la fenêtre se ferme avant que l’enregistrement automatique les ait écrites. La prochaine fois que ce fichier s’ouvre, **Modifications récupérées** propose **Enregistrer** pour les écrire dans le fichier, **Enregistrer sous…** pour les ouvrir à part et les enregistrer comme un nouveau fichier, ou **Ne pas enregistrer** pour laisser le fichier en l’état et abandonner la copie. Fermer la boîte de dialogue garde la copie pour la prochaine fois. Enregistrer le fichier abandonne ses copies plus anciennes, et dans le navigateur une copie plus ancienne que le dernier changement du fichier n’est pas proposée. Une copie dont le fichier n’a pas été ouvert pendant une semaine, par exemple parce que le fichier a été déplacé, figure elle aussi dans **Récupérer le travail non enregistré**.

Désactiver la récupération arrête la conservation automatique et retire les copies de récupération des documents actuellement ouverts. Elle ne supprime pas en masse les instantanés des documents fermés auparavant. La récupération est locale à cette installation ou à ce profil de navigateur ; elle ne remplace pas l’enregistrement d’un fichier, la synchronisation dans le cloud ni une copie de secours.

## Propriétés

Le panneau droit affiche les contrôles adaptés à la sélection : position, taille, apparence, remplissages, contours, effets, typographie, disposition et exportation.

Sans sélection, il affiche l’arrière-plan et les variables de la page actuelle.
