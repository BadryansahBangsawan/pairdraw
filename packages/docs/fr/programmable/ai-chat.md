---
title: Chat avec l’AI
description: Assistant intégré avec plus de 90 outils pour créer, modifier et analyser des designs.
---

# Chat avec l’AI

Appuyez sur <kbd>⌘</kbd><kbd>J</kbd> ou <kbd>Ctrl</kbd><kbd>J</kbd>, ou cliquez sur le bouton aux étincelles parmi les actions du document dans la barre supérieure, pour ouvrir l’assistant dans sa propre colonne. L’assistant peut créer des formes, modifier des styles, configurer des dispositions, travailler avec les composants et analyser le document.

## Configurer les modèles

Au premier lancement, la configuration guidée demande pour quoi l’IA doit vous aider et ce que vous utilisez déjà : un agent de code comme Claude Code, Codex ou Gemini CLI dans l’application de bureau, un compte API, ou un serveur local ou d’entreprise. Elle connecte cet accès et l’attribue aux rôles **Design agent** et **Vision**, sans toucher à ce que vous avez configuré à la main. Avec OpenRouter, il suffit de se connecter au lieu de coller une clé API. Vous pouvez la passer et la relancer depuis **Réglages → IA et agents → Lancer la configuration guidée**. Pour configurer les modèles à la main :

1. Ouvrez le chat.
2. Sélectionnez l’icône des réglages.
3. Ajoutez un profil et configurez la connexion, l’identifiant du modèle, les identifiants d’accès et les capacités.

Plusieurs profils peuvent être enregistrés et attribués séparément au design, aux revues, aux tâches rapides et aux images. Les profils qui partagent une connexion réutilisent le même secret, conservé de manière sécurisée.

## Fournisseurs

OpenPencil prend en charge les connexions compatibles avec OpenAI et Anthropic, ainsi qu’OpenRouter, Google, Amazon Bedrock, Google Vertex AI, Z.ai et des fournisseurs locaux. Amazon Bedrock utilise une région et une clé d’API Bedrock, ou des clés d’accès AWS dans l’application de bureau ; Vertex AI utilise un projet, un emplacement et un jeton d’accès.

Aucun serveur intermédiaire n’est utilisé. Les requêtes sont envoyées directement au fournisseur ; dans le navigateur, ses règles CORS s’appliquent. La fiabilité des appels d’outils en diffusion continue peut varier selon les déploiements. Consultez la [compatibilité BYOK](/programmable/byok-provider-compatibility).

## Agents ACP et MCP distant

L’application de bureau peut lancer des agents ACP et les connecter à des serveurs distants de confiance compatibles avec [Model Context Protocol](https://modelcontextprotocol.io/). Dans **Réglages → Connexions MCP**, ajoutez un point d’accès HTTP diffusé, un nom et, si nécessaire, un jeton Bearer.

Le jeton est conservé dans le stockage sécurisé des identifiants, pas dans les réglages ordinaires, et n’est récupéré qu’au démarrage de la session ACP.

Le chat intégré avec API directe utilise aussi les connexions activées et propose leurs outils au modèle sous la forme `mcp__<serveur>__<outil>`. Les serveurs hébergés comme Notion ou Linear passent par la **Connexion OAuth** : enregistrez la connexion, puis cliquez sur **Se connecter**. Dans l’application de bureau, une connexion peut aussi être une **Commande locale**, un programme qui parle MCP sur stdin et stdout, avec un argument par ligne et des variables d’environnement facultatives `NOM=valeur`. Avant d’exécuter une ligne de commande pour la première fois, l’application demande l’autorisation dans une boîte de dialogue système ; les variables comme `PATH` ou `NODE_OPTIONS`, qui chargent du code, sont refusées. Tant que le chat demande avant d’agir, il demande aussi avant chaque outil externe que son serveur ne marque pas comme en lecture seule. Dans l’application web, un serveur distant doit accepter les requêtes venant de l’origine de l’application (CORS).

## Outils

Les outils couvrent lecture, création, modification, structure, variables, vecteurs, analyse, description, génération de code et images de stock. L’inspection comprend `get_jsx` pour la vue JSX aller-retour, `diff_create` et `diff_jsx` pour les différences structurelles, `diff_visual` pour les différences de pixels et `describe` pour le rôle sémantique et la détection des problèmes de design. Chaque appel agit sur l’éditeur actif et participe à l’historique d’annulation lorsque cela s’applique.

## Compétences

Les compétences sont des dossiers contenant un `SKILL.md` au format [Agent Skills](https://agentskills.io/specification) : des instructions pour un type de travail, avec des fichiers de référence facultatifs. L’IA intégrée voit le nom et la description de chaque compétence active et charge ses instructions quand une demande correspond ; les scripts d’une compétence ne s’exécutent pas.

Dans **Réglages → Compétences**, importez une compétence sous forme de ZIP de son dossier ou de `SKILL.md`. Dans l’application de bureau, `~/.agents/skills` et `~/.claude/skills` sont aussi lus, ainsi que les dossiers `.agents/skills` et `.claude/skills` à côté du document ouvert, utilisés seulement après **Faire confiance au dossier**. OpenPencil fournit des compétences intégrées : des guides pour les landing pages, les apps mobiles, les apps web, les tableaux de bord, les diapositives, les design systems et Tailwind CSS v4, ainsi que `layout`, `restyle`, `dark-mode` et `design-review` pour un design existant ; une compétence à vous du même nom passe avant. Tapez `/` au début d’un message ou utilisez **Choisir une compétence** sous le champ de message pour choisir une compétence, et `@` pour mentionner un calque, une page ou une compétence. Les mentions s’affichent sous forme de puces, y compris dans les réponses ; un clic montre le calque sur le canevas.

## Explorer des variantes

**Laisser mijoter**, la toque sous le champ de message, explore une demande au lieu d’y répondre une seule fois :

- **Variantes** demande de deux à six designs côte à côte, chacun dans un nouveau cadre de premier niveau à droite de tout ce que contient la page. Choisissez s’ils explorent la **Mise en page** (structure et disposition, avec un seul style) ou le **Style** (couleurs, typographie et images, avec une seule mise en page). Si un calque est sélectionné ou mentionné, les variantes partent de lui et le laissent tel quel.
- **Ne pas itérer** demande un seul design en une passe, sans la relecture ni les retouches que l’assistant fait d’habitude.

Le choix reste actif pour les messages suivants, et le bouton l’affiche, jusqu’à ce que vous repassiez sur **Désactivé**.

## Notes pour l’IA

Sélectionnez un calque et ajoutez des **Notes pour l’IA** en bas du panneau Design. **Contexte** indique aux agents ce que le calque signifie ou fait, par exemple « ouvre la boîte de dialogue d’inscription » ; **Prompt** est une demande sur le calque que **Lancer le prompt** envoie au chat. Un message transporte les notes des calques qu’il concerne : ceux qu’il mentionne et la sélection, ou toute la page s’il n’y en a pas. Les agents respectent le contexte et n’agissent sur un prompt que si on le leur demande. Les notes sont enregistrées dans le fichier avec le calque, et les notes `context` et les cartes de prompt d’un fichier `.pen` sont lues de la même façon.

## Vérification visuelle

L’assistant peut vérifier visuellement son travail. Lorsque `export_image` est activé, il peut capturer une image après avoir créé ou modifié des designs et comparer le résultat à la demande initiale. Cela permet de repérer les problèmes de disposition, les éléments manquants et les écarts de couleur qu’une réponse purement textuelle laisserait passer. `diff_visual`, activé par défaut, compare un objet modifié à une copie de référence et renvoie les pixels et la zone modifiés ; l’assistant peut ainsi confirmer qu’une modification est restée dans sa cible.

## Conseils

- Vous pouvez consulter d’autres pages pendant qu’une réponse est générée : l’assistant continue de travailler sur la page où le message a été envoyé, et ses aperçus s’affichent à votre retour. Pendant votre absence, le chat indique la page sur laquelle il travaille, avec **Aller à la page** pour y revenir. Si l’assistant change lui-même de page, votre vue le suit.

## Confidentialité et coût

Les requêtes sont envoyées au fournisseur configuré. Vérifiez ses conditions, sa politique de données et ses tarifs avant d’envoyer des documents sensibles. OpenPencil ne fournit pas de crédits de modèles.
