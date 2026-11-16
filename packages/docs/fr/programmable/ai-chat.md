---
title: Chat avec l’AI
description: Assistant intégré avec 139 outils pour créer, modifier et analyser des designs.
---

# Chat avec l’AI

Appuyez sur <kbd>⌘</kbd><kbd>J</kbd> (<kbd>Ctrl</kbd> + <kbd>J</kbd>), ou cliquez sur le bouton aux étincelles parmi les actions du document dans la barre supérieure, pour ouvrir l’assistant dans sa propre colonne, à côté du panneau Design. Décrivez ce que vous voulez : il crée des formes, définit des styles, gère la disposition, travaille avec les composants et analyse votre design.

## Partir d’une consigne

L’accueil affiche **Que voulez-vous concevoir ?** au-dessus du champ de recherche. Décrivez un écran, un composant ou une page et appuyez sur <kbd>Entrée</kbd> (<kbd>Maj</kbd> + <kbd>Entrée</kbd> passe à la ligne) : Pairdraw ouvre un nouveau design là où l’accueil en crée un, dans votre espace de travail Cloud ou votre bucket de stockage s’il est sélectionné, ouvre son chat et envoie la consigne. Si aucun modèle n’est encore configuré, la consigne attend dans le chat du nouveau design pendant que Pairdraw cherche un agent de code sur votre ordinateur (voir [Configurer les modèles](#setup)), puis elle est envoyée dès qu’un agent est connecté. S’il n’en trouve aucun, la configuration guidée s’ouvre d’abord et la consigne part quand elle se termine ; fermer la configuration laisse la consigne sur l’accueil.

Sur le bureau, une page vide d’un design propose la même consigne par-dessus le canevas. Elle envoie dans le chat de ce document et disparaît dès que la page contient un calque ou qu’un agent se met au travail ; le canevas autour continue de fonctionner normalement. Fermez-la pour la masquer dans ce document, ou désactivez **Prompt on empty pages** dans **Paramètres → Modèles → Discussion**. Les tableaux blancs et les documents en lecture seule ne l’affichent pas.

Les deux consignes proposent des exemples sous forme de puces : **Page d’accueil**, **Écran de connexion**, **Tableau de bord** et **Tarifs**. En choisir un remplit la consigne avec une idée de départ et place le curseur dedans pour que vous puissiez la modifier avant l’envoi ; rien n’est envoyé tant que vous n’appuyez pas sur <kbd>Entrée</kbd>.

## Envoyer du travail depuis le canevas

- **Exécuter la note comme consigne**, dans le [menu contextuel](../user-guide/context-menu#run-sticky-as-prompt) du canevas, envoie le texte des notes adhésives sélectionnées, avec une référence à chacune.
- **Appliquer avec l’IA**, dans le menu d’un fil de commentaires, demande à l’assistant d’appliquer les remarques de ce fil, de répondre en disant ce qui a changé, puis de le résoudre. La consigne cite le commentaire et ses réponses et fait référence au calque auquel le fil est épinglé. **Appliquer les commentaires ouverts avec l’IA**, dans la liste des commentaires, fait de même pour chaque fil ouvert qu’elle affiche ; les fils résolus sont laissés de côté.

Les deux envoient dans le chat du document, ne sont proposés que dans les documents que vous pouvez modifier et, si aucun modèle n’est configuré, en font d’abord configurer un comme la consigne de l’accueil. Les calques auxquels une consigne fait référence l’accompagnent comme références, comme lorsque vous les mentionnez dans le champ du chat.

## Configurer les modèles {#setup}

Au premier lancement, Pairdraw n’ouvre aucune fenêtre de configuration. Tant qu’aucun modèle n’est configuré, il cherche un [agent de code](/programmable/coding-agents) déjà installé sur votre ordinateur : Claude Code, puis Codex, puis Gemini CLI. Un agent installé et connecté devient aussitôt l’agent de design, et le chat indique **Utilisation de Claude Code sur cet ordinateur.** avec **Changer** pour choisir un autre modèle. Un agent qui n’indique pas s’il est connecté, comme Gemini CLI, est utilisé lui aussi ; s’il s’avère déconnecté, le chat affiche la commande qui permet de s’y connecter. Si un agent doit encore se connecter, ou s’il lui manque son programme ACP ou le serveur MCP, la colonne du chat affiche un bouton pour cela ; rien n’est connecté ni installé avant ce clic. Un modèle que vous avez configuré vous-même n’est jamais remplacé.

Si Pairdraw ne trouve aucun agent, ou si les agents ne peuvent pas s’exécuter ici, comme dans l’application web sans son [compagnon](/programmable/browser-agents), l’envoi d’une consigne ouvre la configuration guidée. Elle demande pour quoi l’IA doit vous aider et ce que vous utilisez déjà : un agent de code comme Claude Code, Codex, Gemini CLI ou Pi dans l’application de bureau, un compte API, ou un serveur local ou d’entreprise. Elle connecte cet accès et l’attribue aux rôles **Agent de design** et **Vision**, sans toucher à ce que vous avez configuré à la main. Avec OpenRouter, vous pouvez vous connecter au lieu de coller une clé API. Relancez-la à tout moment depuis **Paramètres → Modèles → Lancer la configuration guidée**. Pour configurer les modèles à la main :

1. Ouvrez la colonne du chat (<kbd>⌘</kbd><kbd>J</kbd>).
2. Cliquez sur l’icône des réglages.
3. Ajoutez un modèle et configurez son fournisseur, l’identifiant du modèle, les identifiants d’accès et les capacités.
4. Enregistrez le modèle et attribuez-le à **Agent de design**.

Vous pouvez configurer plusieurs modèles réutilisables et attribuer séparément des modèles au travail de design, aux revues, aux tâches rapides et aux images en entrée. Les modèles qui utilisent la même connexion à un fournisseur réutilisent son identifiant enregistré.

Le champ de message s’agrandit avec les consignes sur plusieurs lignes. Tapez `@` pour mentionner un calque, une page ou une compétence, ou utilisez le bouton de sélection pour mentionner les calques sélectionnés, et `/` au début d’un message pour lancer une compétence ou l’une des commandes d’un agent ACP. Les mentions s’affichent sous forme de puces, y compris dans les réponses, où l’assistant nomme les calques qu’il a touchés ; un clic sur l’une d’elles montre le calque sur le canevas. Les messages de l’assistant affichent le raisonnement du fournisseur dans des sections repliables et proposent une action de copie pour chaque réponse. Les images jointes restent disponibles comme références visuelles quand un modèle Vision est configuré. Les réponses en flux utilisent un moteur de rendu Markdown renforcé, avec des blocs de code colorés par Shiki ; les protocoles de lien dangereux et les images de données intégrées sont bloqués.

## Sessions d’agents

Un agent de code mène ses sessions avec un modèle, un effort de raisonnement et un mode. Le champ de message propose le modèle, l’effort de raisonnement et le mode que Claude Code, Codex et Gemini CLI annoncent pour leurs sessions. Un choix s’applique aussitôt à la session en cours et aux sessions suivantes avec cet agent, sauf les modes qui passent outre les demandes de permission, qui ne valent que pour une seule session.

Sur le bureau, chaque discussion peut donner à son agent de code un dossier de projet où travailler, choisi dans l’en-tête de la discussion et confirmé d’abord. Les sessions y démarrent dans le mode par défaut de l’agent, et seuls le modèle et l’effort de raisonnement choisis sont repris.

## Limite d’étapes

Dans **Paramètres → Modèles → Discussion**, réglez **Nombre maximal d’étapes par message** sur un nombre entier de 1 à 1 000. La valeur par défaut est 50. Appuyez sur Entrée ou quittez le champ pour enregistrer une valeur valide ; une saisie invalide ne remplace pas la préférence enregistrée. Une limite plus haute permet des tâches plus longues pilotées par les outils, mais peut augmenter la latence et le coût chez le fournisseur.

L’IA intégrée retient cette limite au début de chaque message. L’arrêt, les avertissements sur les étapes restantes et l’action **Continuer** utilisent ce même budget. La modifier n’interrompt pas une requête en cours ; le message suivant ou la reprise utilise la nouvelle limite. Une étape est une itération du modèle et peut contenir plusieurs appels d’outils. Les agents ACP et Pi gèrent leurs propres limites.

## Accès aux outils

Ouvrez **Paramètres → Accès aux outils** pour choisir les outils que les connexions directes aux modèles d’IA peuvent utiliser. Cherchez par nom ou description, dépliez les groupes en lecture seule ou à effets de bord, et activez ou désactivez un outil isolé ou un groupe entier. Les interrupteurs de groupe agissent sur tous les outils du groupe, pas seulement sur les résultats de recherche. **Rétablir les valeurs par défaut** restaure l’ensemble d’outils par défaut : les outils principaux d’édition et d’inspection, les outils de bibliothèque (`get_components`, `list_libraries`, `insert_library_component`), les commentaires, les variables, `lint` et `lint_fix`, `export_image`, `list_pages` et `create_page`. Les outils étendus comme `create_component` s’activent un par un.

Les préférences sont enregistrées localement et s’appliquent au message suivant, y compris dans une conversation existante. Elles ne modifient pas une requête déjà en cours. Activer beaucoup d’outils augmente les schémas envoyés au modèle.

Le segment **Local MCP** a ses propres réglages pour les clients connectés au serveur MCP de Pairdraw, y compris les agents ACP et Pi. Redémarrez le serveur et reconnectez les clients stdio après avoir modifié ces réglages. Les connexions MCP distantes, l’accès WebMCP et les permissions shell et système de fichiers de Pi restent séparés.

Ces interrupteurs déterminent les outils proposés, pas les opérations que les scripts peuvent effectuer. Un outil `eval` activé, ou un autre outil capable d’exécuter des scripts, peut effectuer des opérations de design dont les outils dédiés sont désactivés ; ces interrupteurs ne constituent pas un bac à sable.

## Compétences

Les compétences sont des dossiers contenant un `SKILL.md` au format [Agent Skills](https://agentskills.io/specification) : des instructions pour un type de travail, avec des fichiers de référence facultatifs. L’IA intégrée voit le nom et la description de chaque compétence active et charge ses instructions quand une demande correspond. Elle peut lire les fichiers de la compétence, mais les scripts qu’elle contient ne s’exécutent pas.

Ouvrez **Paramètres → Compétences** pour voir d’où viennent les compétences :

- **Importées** : importez un ZIP du dossier d’une compétence ou un `SKILL.md` seul. Les imports restent dans Pairdraw et fonctionnent aussi dans le navigateur.
- **À côté de ce document** (bureau) : les dossiers `.agents/skills` et `.claude/skills` situés entre le dossier du document ouvert et la racine de son dépôt. Ils restent désactivés tant que vous n’avez pas choisi **Faire confiance au dossier**, car une compétence donne à l’IA des instructions qu’elle suit.
- **Intégrées** : les compétences fournies avec Pairdraw. Des guides pour les landing pages, les apps mobiles, les apps web, les tableaux de bord, les diapositives, les design systems et Tailwind CSS v4, et des compétences qui travaillent sur un design existant : `layout`, `restyle`, `dark-mode` et `design-review`. Elles sont actives d’emblée, fonctionnent aussi dans le navigateur et cèdent la place à une compétence à vous du même nom.
- **Compétences partagées des agents** et **Compétences de Claude Code** (bureau) : `~/.agents/skills` et `~/.claude/skills`, où d’autres agents de code installent leurs compétences. La plupart sont des workflows de code ; ces dossiers sont donc désactivés au départ, et l’étape de revue de la configuration de l’IA liste leurs compétences pour que vous choisissiez celles qui servent au design.

Les imports sont actifs dès que vous les ajoutez, et chaque dossier ou compétence peut être activé ou désactivé. La page les présente comme Accès aux outils présente les outils : chaque source est un groupe avec son propre interrupteur, et chaque compétence a un interrupteur à côté d’elle. Ouvrez une compétence pour lire ses instructions, voir ses fichiers ou consulter les avertissements sur ses écarts avec la spécification. Quand deux compétences portent le même nom, la première dans cet ordre est utilisée.

Pour lancer vous-même une compétence, tapez `/` au début d’un message et choisissez-la, ou sélectionnez-la dans **Choisir une compétence**, le bouton en forme de livre sous le champ de message ; dans les deux cas, le message commence par `/skill:name`, qui remplace une compétence choisie auparavant. Pi reçoit les compétences actives comme les siennes. Les agents ACP comme Claude Code et Codex chargent leurs propres compétences.

## Conversations enregistrées

Utilisez **Historique des discussions** pour revenir à une discussion enregistrée, commencer une **Nouvelle discussion**, ou renommer ou supprimer une conversation. L’historique et les aperçus des pièces jointes sont stockés localement ; **Toutes les discussions** permet de parcourir les transcriptions des autres documents.

Une conversation qui appartient à un autre document reste en lecture seule tant que vous n’avez pas ouvert ce document. Une transcription d’agent enregistrée ne garantit pas que sa session d’agent externe puisse reprendre : si la reprise n’est pas possible, commencez une nouvelle discussion. L’historique local n’est ni une synchronisation dans le cloud ni une sauvegarde.

Dans les réglages Discussion, à côté de la vue d’ensemble des modèles, choisissez si le raisonnement est **Replié par défaut**, **Déplier pendant le raisonnement** ou **Déplié par défaut**. Les animations de dépliage suivent la préférence de réduction des animations de l’application. Déplier un ancien raisonnement ne force pas la conversation à défiler jusqu’en bas.

## Fournisseurs pris en charge

| Fournisseur              | Modèles                                                                  | Configuration                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| **OpenRouter**           | Claude, GPT, Gemini, DeepSeek, Qwen et d’autres                          | Clé API sur [openrouter.ai](https://openrouter.ai)                                                                |
| **Anthropic**            | Claude Sonnet 5.5, Claude Opus 5.5, Claude Fable 5.1, Claude Haiku 5.5   | Clé API sur [console.anthropic.com](https://console.anthropic.com)                                                |
| **OpenAI**               | GPT-6.1 Sol, GPT-6 Astra, GPT-6 Luna                                     | Clé API sur [platform.openai.com](https://platform.openai.com)                                                    |
| **ChatGPT**              | Les modèles que votre offre ChatGPT propose dans Codex, listés en direct | Application de bureau : **Se connecter avec ChatGPT**. Les réponses comptent dans les limites d’usage de l’offre. |
| **Google AI**            | Gemini 3.8 Flash, Gemini 4 Argon                                         | Clé API sur [aistudio.google.dev](https://aistudio.google.dev)                                                    |
| **DeepSeek**             | DeepSeek Flash, DeepSeek V4 Pro                                          | Clé API sur [platform.deepseek.com](https://platform.deepseek.com/api_keys)                                       |
| **Z.ai**                 | GLM-5.3, GLM-5.3-Flash, GLM-5.3-FlashX, GLM-5V-Turbo                     | Clé API sur [docs.z.ai](https://docs.z.ai/devpack/quick-start)                                                    |
| **MiniMax**              | MiniMax-M3.1-Flash, MiniMax-M3                                           | Clé API sur [platform.minimax.io](https://platform.minimax.io/user-center/basic-information/interface-key)        |
| **xAI**                  | Grok 4.7, Grok 4.6, Grok Build 0.1                                       | Clé API sur [console.x.ai](https://console.x.ai)                                                                  |
| **Meta**                 | Muse Spark 1.3, Muse Wonder                                              | Clé API sur [dev.meta.ai](https://dev.meta.ai)                                                                    |
| **Kimi For Coding**      | Kimi K3.1 Pro, Kimi K3.1 Pro Highspeed, Kimi For Coding                  | Clé API de l’offre Kimi Code sur [kimi.ai](https://www.kimi.ai/code/console). Application de bureau uniquement.   |
| **Moonshot AI**          | Kimi K3.1 Pro, Kimi K3.1 Pro Highspeed, Kimi K3                          | Clé API sur [platform.moonshot.ai](https://platform.moonshot.ai/console/api-keys)                                 |
| **Together AI**          | Kimi K3, DeepSeek V4.1 Flash, GLM-5.3, Muse Spark Open                   | Clé API sur [together.ai](https://api.together.ai/settings/api-keys)                                              |
| **Fireworks AI**         | Kimi K3, DeepSeek V4.1 Flash, GLM 5.3, MiniMax-M3.1-Flash                | Clé API sur [fireworks.ai](https://app.fireworks.ai/settings/users/api-keys)                                      |
| **OpenCode Zen**         | Kimi K3, DeepSeek V4.1 Flash, GLM-5.3, Big Pickle                        | Clé API sur [opencode.ai](https://opencode.ai/auth). Application de bureau uniquement.                            |
| **OpenCode Go**          | Kimi K3.1 Pro, MiniMax M3.1 Flash, GLM-5.3, DeepSeek V4.1 Flash          | Clé API de l’offre Go sur [opencode.ai](https://opencode.ai/auth). Application de bureau uniquement.              |
| **OpenAI-compatible**    | Tout point d’accès au format de l’API OpenAI                             | URL de base personnalisée et clé. Bascule entre les API Completions et Responses.                                 |
| **Anthropic-compatible** | Tout point d’accès au format de l’API Anthropic                          | URL de base personnalisée et clé                                                                                  |
| **Amazon Bedrock**       | Claude Sonnet 5.5, Claude Opus 5.5, Claude Fable 5.1, Claude Haiku 5.5   | Région et clé API Bedrock, ou clés d’accès AWS dans l’application de bureau                                       |
| **Google Vertex AI**     | Claude Sonnet 5.5, Claude Opus 5.5, Gemini 3.8 Flash, Gemini 4 Argon     | Projet et emplacement, plus un jeton d’accès ; une clé API n’atteint que Gemini                                   |

Aucun serveur intermédiaire : votre clé ou votre connexion communique directement avec le fournisseur. Les requêtes du navigateur sont soumises à la politique CORS de chaque fournisseur, et la fiabilité des appels d’outils en flux varie selon les déploiements de modèles. Consultez [Compatibilité des fournisseurs et modèles BYOK](/programmable/byok-provider-compatibility) pour les résultats mesurés et les étapes de reproduction.

Les préréglages xAI, Meta, Kimi For Coding, Moonshot AI, Together AI, Fireworks AI et OpenCode utilisent le point d’accès de chat compatible OpenAI de chaque fournisseur ; seuls l’URL de base et les modèles recommandés diffèrent, et la liste complète des modèles vient de models.dev. OpenCode Zen et Go ne listent que les modèles qu’ils servent par ce point d’accès ; les modèles Claude, GPT et Gemini en sont donc exclus : utilisez pour eux le fournisseur Anthropic, OpenAI ou Google AI. Kimi For Coding et les deux préréglages OpenCode n’envoient pas d’en-têtes CORS ; ils ne fonctionnent donc que dans l’application de bureau.

**Amazon Bedrock** atteint Claude par l’API Messages de Bedrock sur `bedrock-mantle.<region>.api.aws`, sous les identifiants de modèle `anthropic.` de Bedrock ; un identifiant de modèle personnalisé peut désigner un profil d’inférence comme `us.anthropic.claude-opus-5-5`. Choisissez la région, puis connectez-vous avec une clé API Bedrock ou, dans l’application de bureau, avec un identifiant de clé d’accès, une clé d’accès secrète et un jeton de session facultatif, qui signent chaque requête avec AWS Signature Version 4. Les navigateurs ne laissent pas la réponse CORS de Bedrock couvrir l’en-tête de signature ; l’application web n’accepte donc que les clés API.

**Google Vertex AI** sert Claude par `:rawPredict` et Gemini par `:generateContent` dans un même projet Google Cloud. Saisissez l’identifiant du projet et un emplacement (`global`, `us`, `eu` ou une région unique ; les régions uniques ne servent que d’anciens modèles Claude), puis collez un jeton d’accès obtenu avec `gcloud auth print-access-token`. Les jetons d’accès expirent au bout d’une heure : collez-en un nouveau quand les requêtes commencent à échouer. Une clé API sans projet utilise le mode express de Vertex AI, qui ne sert que les modèles Gemini.

**OpenRouter** peut être connecté dans la configuration guidée en vous connectant au lieu de coller une clé : OpenRouter crée pour Pairdraw une clé, enregistrée comme n’importe quelle autre. Dans l’application de bureau, la connexion ouvre le navigateur du système et revient sur un port de cet ordinateur choisi par le système (`http://localhost:<port>/oauth/openrouter`), sans passer par une page web extérieure à votre ordinateur ; l’application web se connecte dans une fenêtre surgissante, qu’il faut donc autoriser.

**ChatGPT** utilise votre offre ChatGPT au lieu d’une clé API, par le même backend et la même connexion que Codex CLI d’OpenAI. La connexion ouvre le navigateur et revient à l’application de bureau sur `localhost:1455`, la seule adresse qu’OpenAI accepte pour cela ; fermez donc d’abord un `codex login` en cours. La connexion est enregistrée comme une clé et se renouvelle d’elle-même ; la liste des modèles vient de votre compte. L’application web ne le propose pas.

## Connexions MCP externes

Le chat intégré et les agents de code peuvent utiliser des serveurs [Model Context Protocol](https://modelcontextprotocol.io/) de confiance en plus de celui de Pairdraw. Dans **Paramètres → MCP**, sous Connexions MCP, ajoutez une connexion nommée et activez-la :

- **Serveur distant** : un point d’accès Streamable HTTP sans authentification, avec un jeton Bearer, ou avec la **Connexion OAuth** pour les serveurs hébergés comme Notion ou Linear. Enregistrez la connexion, puis cliquez sur **Se connecter** ; la page de connexion du serveur s’ouvre dans une fenêtre surgissante dans l’application web, ou dans le navigateur du système sur le bureau. L’application s’enregistre auprès du serveur d’autorisation du serveur, utilise PKCE et renouvelle les jetons qu’elle reçoit.
- **Commande locale** (application de bureau uniquement) : un programme qui parle MCP sur stdin et stdout, par exemple `npx` avec comme arguments `-y`, `@modelcontextprotocol/server-filesystem` et un dossier, un par ligne, plus des variables d’environnement facultatives `NOM=valeur`. La première fois qu’une ligne de commande s’exécute, l’application demande l’autorisation dans une boîte de dialogue système ; elle redemande quand le programme, un argument ou un nom de variable change. Les variables qui choisissent le programme ou y chargent du code, comme `PATH`, `NODE_OPTIONS` ou `LD_PRELOAD`, sont refusées.

Le chat avec API directe liste les outils de chaque serveur activé à chaque message et les propose au modèle sous la forme `mcp__<serveur>__<outil>`. Un serveur qui ne répond pas est écarté de ce message et réessayé une minute plus tard, et une commande locale que vous avez refusée n’est plus proposée tant que vous ne modifiez pas sa connexion. Toutes les discussions partagent les connexions, qui restent ouvertes pendant une réponse et se ferment après quelques minutes d’inactivité. Tant que le chat demande avant d’agir (**Paramètres → IA**), un appel à un outil externe que son serveur ne marque pas comme en lecture seule demande aussi d’abord. Les outils externes s’activent et se désactivent avec leur connexion, pas dans la liste des outils propres à Pairdraw. Sur le bureau, les agents ACP reçoivent les mêmes connexions au démarrage de leur session ; une commande locale n’est transmise à un agent qu’après votre accord dans la même boîte de dialogue système, et l’application web n’en transmet aucune. Pi reçoit les connexions distantes. Les jetons Bearer, les connexions OAuth et les variables sont conservés dans le stockage d’identifiants configuré plutôt que dans les réglages ordinaires. **Tester la connexion** se connecte une fois et indique combien d’outils le serveur propose.

Dans l’application web, un serveur distant doit accepter les requêtes venant de l’origine de l’application (CORS) ; l’application de bureau se connecte par son propre client HTTP.

Les serveurs distants doivent utiliser HTTPS. Les points d’accès HTTP en boucle locale sont acceptés pour le développement local. Examinez un serveur et accordez-lui votre confiance avant de l’activer : ses outils peuvent lire des données externes ou agir avec les identifiants que vous fournissez. Le serveur MCP de design intégré à Pairdraw reste attaché automatiquement et n’a pas besoin d’être ajouté ici.

## Ce qu’il peut faire

Le catalogue d’outils configurable couvre ces catégories ; les outils proposés à un modèle dépendent de vos réglages d’accès aux outils :

- **Créer** : cadres, formes, texte, composants, pages. Rend du JSX pour les dispositions complexes.
- **Styler** : remplissages, contours, effets, opacité, rayon des coins, modes de fusion.
- **Disposer** : auto layout, grille, alignement, espacement, dimensions.
- **Composants** : créer des composants, des instances, des ensembles de composants et des emplacements. Gérer les remplacements. Donner aux composants des comportements Reka UI pour qu’ils fonctionnent en aperçu.
- **Variables** : créer et modifier des variables, collections et modes. Les lier aux remplissages.
- **Interroger** : trouver des objets, sélecteurs XPath, lire des propriétés, lister les pages, les polices, la sélection.
- **Inspecter** : `get_jsx` pour la vue JSX aller-retour, `diff_create` et `diff_jsx` pour les différences structurelles, `diff_visual` pour les différences de pixels, `describe` pour le rôle sémantique et la détection des problèmes de design.
- **Analyser** : palette de couleurs, audit typographique, cohérence des espacements, détection de groupes.
- **Exporter** : PNG, SVG, JSX avec classes Tailwind. Vérification visuelle avec `export_image`.
- **Vecteurs** : opérations booléennes, manipulation de tracés.

## Explorer des variantes

**Laisser mijoter**, la toque sous le champ de message, explore une demande au lieu d’y répondre une seule fois :

- **Variantes** demande de deux à six designs côte à côte, chacun dans un nouveau cadre de premier niveau à droite de tout ce que contient la page. Choisissez s’ils explorent la **Mise en page** (structure et disposition, avec un seul style) ou le **Style** (couleurs, typographie et images, avec une seule mise en page). Si un calque est sélectionné ou mentionné, les variantes partent de lui et le laissent tel quel.
- **Ne pas itérer** demande un seul design en une passe, sans la relecture ni les retouches que l’assistant fait d’habitude.

Le choix reste actif pour les messages suivants, et le bouton l’affiche, jusqu’à ce que vous repassiez sur **Désactivé**.

## Notes pour l’IA

Sélectionnez un calque et ajoutez des **Notes pour l’IA** en bas du panneau Design. **Contexte** indique aux agents ce que le calque signifie ou fait, par exemple « ouvre la boîte de dialogue d’inscription » ; **Prompt** est une demande sur le calque que **Lancer le prompt** envoie au chat. Un message transporte les notes des calques qu’il concerne : ceux qu’il mentionne et la sélection, ou toute la page s’il n’y en a pas. Les agents respectent le contexte et n’agissent sur un prompt que si on le leur demande. Les notes sont enregistrées dans le fichier avec le calque, et les notes `context` et les cartes de prompt d’un fichier `.pen` sont lues de la même façon.

## Vérification visuelle

L’assistant peut vérifier visuellement son travail. Avec `export_image`, activé par défaut, il peut capturer une image après avoir créé ou modifié des designs et compare le résultat à la demande initiale. Cela permet de repérer les problèmes de disposition, les éléments manquants et les écarts de couleur qu’une réponse purement textuelle laisserait passer. `diff_visual`, activé par défaut, compare un objet modifié à une copie de référence et renvoie les pixels et la zone modifiés ; l’assistant peut ainsi confirmer qu’une modification est restée dans sa cible.

## Messages pendant que l’assistant travaille

Vous pouvez continuer à écrire pendant une réponse. **Entrée** envoie le message dès que les appels d’outils de l’étape en cours sont terminés, ce qui permet à l’IA intégrée de changer de cap sans être arrêtée ; **Alt+Entrée** attend qu’elle ait fini tout son travail. Les messages en attente s’affichent en grisé sous la réponse, chacun avec un bouton pour le retirer. **Échap** arrête la réponse et envoie aussitôt ce qui attend, et **Haut** sur la première ligne reprend les messages en attente pour les modifier. Les agents ACP et Pi prennent un message en attente à la fin de leur tour.

## Arrêter une réponse

**Arrêter la génération** met fin à une réponse immédiatement. Un appel d’outil déjà en cours se termine, et sa modification compte comme faisant partie de la réponse ; les appels qui attendent encore leur tour ne changent rien. La réponse est marquée _Arrêtée_, son raisonnement et les appels inachevés cessent d’apparaître comme en cours, et votre message suivant indique à l’assistant si ces appels ont modifié le document.

## Annuler les modifications de l’assistant

Chaque appel d’outil qui modifie le document constitue une étape dans Édition → Annuler. L’annuler avec <kbd>⌘</kbd><kbd>Z</kbd> marque l’appel comme _Annulé_ dans le chat. Une réponse dont seules certaines modifications sont annulées indique combien ; une réponse dont toutes le sont est grisée et marquée _Modifications annulées_. Rétablir retire ces marques. Les marques sont enregistrées avec la conversation.

**Annuler les modifications**, sur une réponse, annule ses modifications tant que rien n’a été modifié depuis, et **Rétablir les modifications** ramène les modifications annulées tant que Rétablir le peut encore. **Régénérer** et la modification de votre dernier message annulent d’abord, quand c’est possible, les modifications de la réponse remplacée.

Votre message suivant indique à l’assistant quelles modifications vous avez annulées ou rétablies, pour qu’il ne s’appuie pas sur des modifications disparues. Si vous annulez les modifications de l’assistant pendant qu’il travaille encore, il en est informé à son prochain appel d’outil.

## Suivre l’assistant

Avec **Suivre les agents pendant qu’ils travaillent** activé, le bouton en forme de viseur en haut du chat, votre vue suit l’assistant pendant qu’il travaille, y compris sur une autre page quand il y modifie des calques. Le suivi s’arrête quand la réponse se termine, est arrêtée ou échoue. Cliquer, faire défiler, zoomer, changer de page ou appuyer sur Échap arrête vous-même le suivi.

## Regarder l’assistant dessiner {#watching-the-assistant-draw}

Pendant qu’un agent modifie la page ouverte, qu’il s’agisse du chat intégré ou d’un agent de code via MCP, le canevas montre son travail : chaque calque qu’il ajoute se dessine l’un après l’autre, les calques qu’il modifie clignotent et les cadres où il travaille scintillent dans un contour violet. Quand il s’arrête, ils clignotent une fois et un avis compte les calques ajoutés et modifiés ; **Afficher** les sélectionne et zoome dessus. L’animation est dessinée par-dessus le canevas et ne modifie jamais le document. Désactivez-la avec **Animer les modifications de l’IA** dans **Paramètres → Modèles → Discussion** ; elle reste aussi désactivée tant que **Animations** est désactivé, que le système demande de réduire les animations ou que le mode ultraléger est actif, et les modifications apparaissent alors simplement.

## Notifications

Quand un agent demande une permission et que vous n’avez pas répondu au bout de quelques secondes, Pairdraw envoie une notification système ; vous pouvez ainsi travailler dans une autre application pendant qu’il s’exécute. **Paramètres → Notifications** active aussi les notifications quand une réponse se termine ou échoue. Elles ne sont envoyées que lorsque Pairdraw est en arrière-plan ou affiche un autre document, et un clic sur l’une d’elles ouvre le chat de ce document. Dans le navigateur, cliquez d’abord sur **Autoriser les notifications** à cet endroit ; l’application de bureau suit les réglages de notification de votre système.

## Exemples de consignes

- « Crée une carte avec un titre, une description et un bouton bleu »
- « Donne le même rayon de coins à tous les boutons de cette page »
- « Quelles polices sont utilisées dans ce fichier ? »
- « Remplace le fond du cadre sélectionné par un dégradé du bleu au violet »
- « Exporte le cadre sélectionné en SVG »
- « Trouve tous les textes dont la taille de police est inférieure à 12 »
- « Décris le composant sélectionné : quel rôle semble-t-il avoir ? »
- « Montre-moi le JSX de ce cadre »
- « Fais de ce composant un interrupteur que je peux essayer en aperçu »

## Conseils

- Sélectionnez des objets avant de demander : l’assistant sait ce qui est sélectionné.
- Soyez précis sur les couleurs, les tailles et les positions pour obtenir des résultats exacts.
- L’assistant peut modifier plusieurs objets en un seul message.
- Vous pouvez consulter d’autres pages pendant qu’une réponse est générée : l’assistant continue de travailler sur la page où le message a été envoyé, et ses aperçus s’affichent à votre retour. Pendant votre absence, le chat indique la page sur laquelle il travaille, avec **Aller à la page** pour y revenir.
- Annulez ce qui ne vous plaît pas avec Édition → Annuler ou **Annuler les modifications** ; le chat et l’assistant le voient tous deux.
- Toute la disposition est recalculée automatiquement après chaque exécution d’outil.

## Confidentialité et coût

Les requêtes sont envoyées au fournisseur configuré. Vérifiez ses conditions, sa politique de données et ses tarifs avant d’envoyer des documents sensibles. Pairdraw ne fournit pas de crédits de modèles.
