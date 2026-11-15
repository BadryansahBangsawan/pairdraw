---
layout: doc
title: Automatisation et API
description: Chat IA, CLI, moteur JSX, serveur MCP et autres interfaces d’automatisation construites sur le moteur de l’éditeur Pairdraw.
---

# Automatisation et API

Pairdraw traite les fichiers de design comme des données. Chaque opération disponible dans l’éditeur — créer des formes, modifier des remplissages, gérer l’auto layout, exporter des ressources — est aussi disponible depuis le terminal, depuis des agents IA et depuis du code. Aucun plugin à installer, aucune clé API, aucune liste d’attente.

L’interface de l’éditeur et les interfaces d’automatisation utilisent le même moteur. Ce que vous pouvez faire en cliquant, vous pouvez le faire par script.

## L’idée d’ensemble

Pairdraw n’est pas seulement censé être une application de design.

C’est aussi une boîte à outils : quelque chose que vous pouvez intégrer dans d’autres produits, habiller de votre propre interface et utiliser pour construire des workflows d’édition adaptés à votre domaine.

C’est pourquoi les interfaces d’automatisation comptent. L’application, la CLI, les outils IA, le moteur JSX, le serveur MCP et le SDK reposent tous sur le même moteur d’édition sous-jacent.

## Chat avec l’AI

L’assistant intégré a accès à plus de 130 outils qui couvrent toute la surface de l’éditeur. Décrivez ce que vous voulez en langage naturel : « ajoute une ombre portée de 16 px à tous les boutons », « crée un composant carte avec une variante sombre », « exporte tous les cadres de cette page à 2× ».

[Chat avec l’AI →](./ai-chat)

## Collaboration

Les agents IA affichent leur curseur sur la zone de travail pendant qu’ils travaillent, et la vue les suit. Les documents Cloud d’un serveur Pairdraw Cloud auto-hébergé sont modifiés en direct par toutes les personnes qui les ouvrent, avec curseurs, mode suivi et synchronisation CRDT. Les salles pair-à-pair sont désactivées dans les builds Pairdraw.

[Collaboration →](./collaboration)

## Vue SDK

Construisez des éditeurs propulsés par Pairdraw avec le même Vue SDK que celui que l’application utilise en interne. Le SDK expose le contexte de l’éditeur, le branchement du canevas, l’état de sélection, les modèles de commandes, les composables des panneaux de propriétés et des primitives headless.

[Vue SDK →](./sdk/)

## Moteur JSX

Décrivez une interface en JSX, la syntaxe que les LLM connaissent déjà grâce à React. Un seul appel peut créer un arbre complet de composants avec cadres, textes, auto layout, remplissages et contours. Compact, déclaratif et comparable par diff.

Dans l’autre sens, exportez n’importe quelle sélection en JSX avec des classes Tailwind : utile pour la passation aux développeurs ou pour redonner des designs à un LLM.

[Moteur JSX →](./jsx-renderer)

## CLI

Examinez, contrôlez, exportez et analysez des documents de design sans ouvrir l’éditeur. Listez les pages, recherchez des objets, extrayez des design tokens, repérez les problèmes de disposition ou d’accessibilité et générez des PNG, le tout depuis le terminal avec une sortie JSON lisible par machine.

La CLI se connecte aussi à l’application de bureau en cours d’exécution via RPC, ce qui permet de piloter l’éditeur par script pendant que vous l’utilisez : ouvrir, enregistrer et changer de document, annuler, modifier les réglages et appeler n’importe quel outil MCP. La commande `eval` exécute du JavaScript avec un objet global `figma` compatible avec l’API des plugins Figma.

[Examiner des fichiers](./cli/inspecting) · [Exporter](./cli/exporting) · [Analyser des designs](./cli/analyzing) · [Scripting](./cli/scripting) · [Piloter l’application](/programmable/cli/app-control)

## Serveur MCP

Connectez Claude Code, Cursor, Windsurf ou tout client compatible MCP à Pairdraw. Le serveur expose plus de 130 outils pour lire, créer et modifier des designs, les mêmes que ceux du chat IA intégré. Il fonctionne sur stdio ou HTTP, avec prise en charge des sessions.

[Serveur MCP →](/programmable/mcp-server)

## Schéma d’URL {#url-scheme}

L’application de bureau enregistre `pairdraw://` : une page publiée — une story Storybook, une revue de design, un README — peut ainsi pointer directement vers un calque :

```
pairdraw://open?file=web/design/hikyo.pen&node=Button/Large/Default
```

`file` est un chemin relatif au dépôt se terminant par `.pen` ou `.fig` ; les chemins absolus et les segments `.` ou `..` sont refusés. `node` est facultatif. Les deux valeurs sont encodées en URL — les séparateurs de chemin peuvent rester littéraux, mais un `+` littéral doit être envoyé sous la forme `%2B` — et une clé répétée prend sa dernière valeur.

L’application compare `file` aux chemins des onglets ouverts, comme une séquence complète de segments finaux, et active cet onglet sans relire le document ; un fichier déplacé ou devenu illisible depuis son ouverture voit donc tout de même son calque sélectionné. Le premier onglet ouvert dont le chemin se termine par le chemin demandé l’emporte, ce qui compte lorsque deux copies de travail ont le même fichier ouvert. Les segments sont comparés comme le fait le système de fichiers de la plateforme : sans tenir compte de la casse ASCII sous macOS et Windows, exactement sous Linux ; `Web/Design/hikyo.pen` et `web/design/hikyo.pen` désignent donc le même fichier sur un Mac et deux fichiers différents sous Linux. Si aucun onglet ouvert ne correspond, un sélecteur de fichier demande une seule fois le fichier ; le fichier choisi doit se terminer par le même chemin relatif, sinon le lien est annulé. Aucun chemin n’est joint à une racine et aucun accès au système de fichiers n’est accordé au-delà de ce que renvoie le sélecteur. Un fichier réellement ouvert par le lien — celui qui a été choisi — rejoint la liste des fichiers récents comme tout autre fichier que vous ouvrez ; activer un onglet déjà ouvert ne touche pas à la liste, car rien n’a été ouvert.

Avec un nom d’objet, l’application sélectionne tous les calques portant exactement ce nom sur la page courante et zoome sur l’ensemble de la sélection. Si la page courante n’en contient aucun, elle bascule sur la première page qui en contient, en chargeant les pages si nécessaire. Un nom inconnu affiche un avis et laisse le document ouvert. Ouvrir un fichier et sélectionner des calques est tout ce que le schéma sait faire.

L’application web accepte le même lien depuis sa propre barre d’adresse :

```
http://localhost:1420/?file=https://raw.githubusercontent.com/BadryansahBangsawan/pairdraw/master/tests/fixtures/pencil_button.pen&node=Button/Large/Default
```

Ici, `file` est une URL `https:` absolue se terminant par `.pen` ou `.fig` — l’application web n’a pas de système de fichiers ; un chemin relatif, une URL `http:` ou toute autre extension est donc refusé avec un avertissement dans la console, sans autre effet. L’extension est lue dans le chemin de l’URL ; une chaîne de requête sur le fichier lié ne change donc rien. Un fragment est retiré avant la récupération : il n’atteint jamais le serveur, si bien que `…/hikyo.pen#a` et `…/hikyo.pen#b` ouvrent un seul onglet, pas deux. `node` se comporte exactement comme ci-dessus : même sélection par nom exact et même zoom, même avis quand aucun calque ne porte ce nom. Les deux valeurs sont encodées en URL, un `+` littéral doit être envoyé sous la forme `%2B`, et une clé répétée prend sa dernière valeur, comme sur le bureau. Le lien est pris en charge sur n’importe quelle route : `/demo?file=…` fonctionne comme `/?file=…`.

Le navigateur récupère le fichier d’une autre origine : l’hôte doit donc l’autoriser ; `raw.githubusercontent.com` envoie `Access-Control-Allow-Origin: *` et convient. La requête n’envoie aucun identifiant et refuse de suivre les redirections, ce qui empêche un lien `https:` d’être renvoyé vers un lien en clair ; une URL `https://github.com/<owner>/<repo>/raw/...` redirige vers `raw.githubusercontent.com` et est donc refusée : pointez directement vers l’hôte brut. `file` et `node` sont retirés de la barre d’adresse par le routeur dès leur lecture — avant la récupération, et aussi lorsque le lien a été refusé — de sorte qu’un rechargement ne rouvre pas le document, et que ni une URL copiée ni une navigation ultérieure dans l’application ne transportent le contenu du lien. Un document lié est limité à 64 Mio : le corps est compté au fil de sa réception, sans se fier à `Content-Length`, et la requête est interrompue dès qu’il dépasse cette taille, le lien indiquant alors que le fichier dépasse 64 Mio. Un déploiement qui sert l’application avec une Content-Security-Policy doit autoriser l’hôte lié dans `connect-src` ; sinon la récupération est bloquée et le lien indique qu’il n’a pas pu ouvrir le fichier.

Sous macOS, le schéma appartient au bundle de l’application installée : les liens atteignent donc une version installée et non un processus `tauri dev`. Sous Windows et Linux, le lien arrive par le plugin de liens profonds, y compris lorsque l’application n’est pas encore lancée : il est mis en file d’attente au démarrage et traité dès que l’éditeur est prêt ; sous Linux, l’entrée de bureau fournie transmet le lien par `%U`.

## Pourquoi ouvert ?

Figma est une plateforme fermée. Son serveur MCP est en lecture seule. L’accès au navigateur par CDP a été supprimé dans la version 126. Les fichiers de design vivent dans un format propriétaire, sur les serveurs de quelqu’un d’autre. Développer un plugin exige un environnement d’exécution spécifique aux API limitées.

Pairdraw est l’alternative : open source, sous licence MIT, chaque opération scriptable, données stockées localement. Vos fichiers de design vous appartiennent : examinez-les, transformez-les, faites-les passer dans votre CI, donnez-les à un LLM. Aucune permission requise.
