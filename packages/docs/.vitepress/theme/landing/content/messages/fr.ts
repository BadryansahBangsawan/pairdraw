import type { LandingMessages } from './types'

export const fr: LandingMessages = {
  nav: {
    label: 'Pairdraw',
    home: 'Pairdraw, retour en haut',
    howItWorks: 'Fonctionnement',
    features: 'Fonctions',
    agents: 'Agents',
    scripting: 'Scripts',
    faq: 'FAQ',
    docs: 'Documentation',
    github: 'GitHub',
    download: 'Télécharger'
  },
  hero: {
    frame: 'Hero',
    kicker: 'Éditeur de design open source, sous licence MIT',
    title: 'Concevez avec votre agent.',
    lede: 'Pairdraw ouvre vos fichiers .fig et .pen et laisse un agent d’IA dessiner sur le même canevas pendant que vous continuez à modifier.',
    download: 'Télécharger pour {platform}',
    downloadAny: 'Télécharger Pairdraw',
    github: 'Voir sur GitHub',
    finePrint:
      'Gratuit pour macOS, Windows et Linux. Utilisez votre propre modèle ou agent de code.',
    prompt: 'Écris le titre du hero : « Concevez avec votre agent. » Garde-le sur deux lignes.',
    status: {
      reading: '{agent} lit la page',
      adding: '{agent} ajoute H1',
      writing: '{agent} écrit H1'
    },
    comment: 'Garde le titre sur deux lignes.',
    reply: 'Réglé sur 890 de large, pour qu’il passe à la ligne après « avec ».',
    now: 'à l’instant',
    measure: 'W 890 × H 280',
    layers: 'Calques',
    layer: {
      frame: { name: 'Cadre Hero', detail: 'Cadre, 1200 × 980' },
      heading: {
        name: 'H1',
        adding: '{agent} l’ajoute',
        writing: '{agent} l’écrit',
        detail: '{agent} le redimensionne'
      },
      comment: { name: 'Commentaire', detail: '{human}, 1 réponse' },
      lead: { name: 'Chapeau', detail: 'Texte, 24 px' }
    },
    pause: 'Mettre l’animation en pause',
    play: 'Lancer l’animation'
  },
  how: {
    title: 'D’une phrase à des calques modifiables.',
    lede: 'L’agent accède au canevas par le serveur MCP de Pairdraw et modifie le fichier que vous avez ouvert. Rien n’est exporté, collé ni reconstruit.',
    steps: [
      {
        title: 'Demandez dans le chat',
        detail:
          'Décrivez l’écran dans le chat, sur l’Accueil ou dans le champ sous le canevas. Utilisez votre propre clé API ou un agent de code déjà présent sur votre ordinateur.'
      },
      {
        title: 'Regardez-le dessiner',
        detail:
          'Les calques apparaissent l’un après l’autre pendant que le cadre en cours de travail scintille. Une fois l’agent arrêté, une notification compte ce qui a changé.'
      },
      {
        title: 'Modifiez le résultat',
        detail:
          'Ce que l’agent a dessiné, ce sont des calques ordinaires dans votre fichier. Sélectionnez-les, modifiez-les ou demandez une autre passe. Chaque tour peut être annulé.'
      }
    ],
    frames: ['1  Demandez dans le chat', '2  Regardez-le dessiner', '3  Modifiez le résultat'],
    request: 'Ajoute un écran Objectifs avec un anneau d’épargne et trois objectifs.',
    reading: 'Lecture de Budget app.fig, page 1',
    placeholder: 'Demander des modifications à Objectifs',
    send: 'Envoyer',
    card: {
      title: 'Objectifs',
      amount: '$2,400',
      saved: 'sur $3,500 épargnés',
      goals: [
        { title: 'Nouvel ordinateur', detail: '$900 / $1,400' },
        { title: 'Voyage à Bali', detail: '$1,100 / $1,500' },
        { title: 'Imprévus', detail: '$400 / $600' }
      ]
    },
    progress: '{count} calques sur {total}',
    props: { title: 'Anneau d’épargne', ring: 'Anneau', size: 'Taille' },
    toast: '{count} calques ajoutés',
    undo: 'Annuler'
  },
  features: {
    title: 'Un éditeur complet, dont chaque outil est ouvert à l’agent.',
    lede: 'Ce que vous faites à la main, l’agent peut l’appeler. Vous travaillez tous les deux sur les mêmes calques, dans le même fichier.',
    frame: 'Fonctions, cliquez sur un calque pour changer',
    list: 'Calques',
    tabs: {
      ai: {
        label: 'L’IA crée des designs',
        title: 'L’IA crée des designs',
        detail:
          'Décrivez ce que vous voulez dans le chat, sur l’Accueil ou dans le champ sous le canevas. {count} outils créent et modifient les calques.'
      },
      browser: {
        label: 'Navigateur intégré',
        title: 'Navigateur intégré',
        detail:
          'Ouvrez une page dans sa propre fenêtre, importez la page ou un élément en calques, et laissez le chat la lire et y cliquer avec votre accord.'
      },
      controls: {
        label: 'Contrôles fonctionnels',
        title: 'Contrôles fonctionnels',
        detail:
          'Donnez à un composant un comportement Reka UI, comme un interrupteur, un curseur ou des onglets, et essayez-le en direct avec de vraies saisies et le clavier.'
      },
      prototypes: {
        label: 'Prototypes',
        title: 'Prototypes',
        detail:
          'Reliez des cadres par des interactions au clic ou après un délai, puis lisez-les sur le canevas avec une transition instantanée ou en fondu.'
      },
      layout: {
        label: 'Auto layout et CSS Grid',
        title: 'Auto layout et CSS Grid',
        detail:
          'Mise en page flex et grille avec marges intérieures, espacement, alignement et pistes qui s’ajustent quand le contenu change.'
      }
    },
    ai: {
      prompt:
        'Conçois un écran de réglages avec des interrupteurs de notification et un bouton de déconnexion.',
      settings: 'Réglages',
      alerts: 'Alertes de budget',
      summary: 'Résumé hebdomadaire',
      signIn: 'Nouvelle connexion',
      signOut: 'Se déconnecter'
    },
    browser: {
      url: 'https://example.com/pricing',
      import: 'Importer en calques',
      imported: 'Importé en calques'
    },
    controls: {
      period: 'Période de facturation',
      monthly: 'Mensuel',
      yearly: 'Annuel',
      limit: 'Plafond du budget',
      roundUp: 'Arrondir',
      notify: 'M’avertir'
    },
    prototypes: {
      overview: 'Vue d’ensemble',
      budgets: 'Budgets',
      action: 'Voir les budgets',
      back: 'Retour'
    },
    layout: {
      alignment: 'Alignement',
      vertical: ['En haut', 'Au milieu', 'En bas'],
      horizontal: ['à gauche', 'au centre', 'à droite']
    }
  },
  agents: {
    title: 'Gardez l’agent que vous utilisez déjà.',
    lede: 'Il fonctionne avec votre propre abonnement et accède au canevas par le serveur MCP de l’éditeur. « Connecter » installe l’adaptateur et connecte l’agent, étape par étape.',
    frame: 'Rapport mensuel, 5 agents sur le canevas',
    report: 'Rapport mensuel',
    month: 'nov.',
    server: 'Serveur MCP Pairdraw',
    connect: { before: 'Dans le navigateur, lancez', after: 'puis ouvrez le lien qu’il affiche.' }
  },
  scripting: {
    title: 'Tout se scripte.',
    lede: 'Le document que l’agent modifie est aussi ouvert à vos scripts. Chaque commande accepte --json.',
    items: [
      {
        title: 'CLI',
        detail:
          'Inspectez, interrogez, exportez, convertissez et vérifiez des fichiers .fig et .pen sans ouvrir l’éditeur.'
      },
      {
        title: 'Serveur MCP',
        detail:
          'Connectez Claude Code, Cursor ou tout client MCP à l’app en cours d’exécution ou à des fichiers sur disque.'
      },
      {
        title: 'Vue SDK',
        detail: 'Des primitives et composables sans interface pour construire votre propre éditeur.'
      }
    ],
    terminal: 'Terminal'
  },
  privacy: {
    frame: 'Confidentialité',
    title: 'Pairdraw n’envoie aucune donnée d’utilisation.',
    lede: 'Pas de ping quotidien, d’analytics ni de statistiques d’utilisation. La page de confidentialité indique à quoi l’app se connecte et quand.',
    link: 'Lire la page de confidentialité',
    items: [
      {
        title: 'Local d’abord',
        detail:
          'Les documents restent sur votre ordinateur, sauf si vous les placez sur un serveur.'
      },
      {
        title: 'Vos clés',
        detail:
          'Utilisez votre propre clé, ou laissez le chat passer par un agent de code que vous faites déjà tourner.'
      },
      {
        title: 'Un cloud à vous',
        detail:
          'Pour modifier à plusieurs, gardez le document sur un serveur Pairdraw Cloud géré par votre équipe.'
      }
    ]
  },
  faq: {
    title: 'Questions',
    lede: 'Le reste se trouve dans la {docs}, ou ouvrez une issue sur {github}.',
    docs: 'documentation',
    github: 'GitHub',
    items: [
      {
        question: 'Pairdraw est-il gratuit ?',
        answer:
          'Oui. Pairdraw est sous licence MIT. Pairdraw Cloud, le serveur optionnel, est sous licence Apache 2.0.'
      },
      {
        question: 'Sur quelles plateformes puis-je l’utiliser ?',
        answer:
          'macOS 13 ou ultérieur, Windows 10 ou ultérieur, et Linux avec WebKitGTK 2.40 ou ultérieur. L’app web se lance depuis une copie du dépôt.'
      },
      {
        question: 'Ai-je besoin d’une clé API ?',
        answer:
          'Non. Utilisez votre propre clé pour les principaux fournisseurs, ou laissez le chat passer par un agent de code déjà présent sur votre ordinateur.'
      },
      {
        question: 'Peut-il ouvrir mes fichiers Figma ?',
        answer:
          'Pairdraw lit et écrit les fichiers .fig natifs, ouvre les documents .pen pris en charge, et copie-colle des calques entre les apps.'
      },
      {
        question: 'Qu’est-ce que l’app envoie chez elle ?',
        answer:
          'Rien sur votre utilisation : pas de ping quotidien, d’analytics ni de statistiques d’utilisation. La page de confidentialité liste chaque connexion.'
      }
    ]
  },
  closing: {
    frame: 'Téléchargement',
    title: 'Vos fichiers. Votre agent. Un seul canevas.',
    you: 'Vous',
    platforms: {
      mac: 'Apple Silicon et Intel',
      windows: 'Windows 10 ou ultérieur',
      linux: 'WebKitGTK 2.40 ou ultérieur'
    },
    updates: 'Les copies installées se mettent à jour depuis l’app.'
  },
  overlay: {
    title: 'Télécharger Pairdraw',
    version: 'Version {version}. Gratuit et sous licence MIT.',
    close: 'Fermer',
    platforms: {
      mac: 'Apple Silicon et Intel, macOS 13 ou ultérieur',
      windows: 'x64 et ARM64, Windows 10 ou ultérieur',
      linux: 'x64 et ARM64, WebKitGTK 2.40+'
    },
    note: 'Les copies installées se mettent à jour depuis l’app. Le build n’est pas encore signé : la première fois, ouvrez-le par clic droit, puis Ouvrir.',
    allFiles: 'Tous les fichiers, avec sommes de contrôle',
    unavailable:
      'La liste des téléchargements n’a pas pu être chargée. Tous les fichiers sont sur la page des versions sur GitHub.'
  },
  footer: {
    tagline:
      'Un éditeur de design open source où vous et un agent d’IA dessinez sur le même canevas.',
    product: 'Produit',
    roadmap: 'Feuille de route',
    changelog: 'Journal des modifications',
    cloud: 'Pairdraw Cloud',
    docs: 'Documentation',
    gettingStarted: 'Premiers pas',
    cli: 'Référence de la CLI',
    mcp: 'Serveur MCP',
    sdk: 'Vue SDK',
    community: 'Communauté',
    issues: 'Issues',
    security: 'Signaler un problème de sécurité',
    legal: 'Mentions légales',
    mit: 'Licence MIT',
    apache: 'Apache 2.0 pour Cloud',
    privacy: 'Confidentialité',
    license: 'Pairdraw est sous licence MIT. Pairdraw Cloud est sous licence Apache 2.0.',
    language: 'Langue'
  },
  loading: 'Chargement de l’éditeur',
  clipboard: {
    copy: 'Copier',
    copied: 'Copié'
  },
  stage: {
    activate: 'Essayer en direct'
  },
  download: {
    title: 'Télécharger Pairdraw',
    lede: 'L’app de bureau, gratuite et open source, sans inscription. Les plateformes sans version prête à l’emploi se compilent à partir des sources.',
    version: 'Version {version}, publiée le {date}',
    forPlatform: 'Télécharger pour {platform}',
    moreFiles: 'Autres téléchargements pour {platform}',
    releaseNotes: 'Notes de version',
    yourSystem: 'Votre système',
    arch: {
      appleSilicon: 'Apple Silicon',
      intel: 'Intel',
      x64: 'x64',
      arm: 'ARM'
    },
    formats: {
      dmg: 'Image disque',
      zip: 'App dans une archive zip',
      exe: 'Programme d’installation',
      msi: 'Pour les installations gérées',
      appimage: 'Fonctionne sur la plupart des distributions',
      deb: 'Debian, Ubuntu',
      rpm: 'Fedora, openSUSE',
      'tar.gz': 'Se lance depuis n’importe quel dossier, sans installation'
    },
    requirements: 'Configuration requise',
    allTitle: 'Tous les téléchargements',
    checksums: 'Sommes de contrôle SHA-256',
    onGitHub: 'Version sur GitHub',
    unavailable:
      'La liste des téléchargements n’a pas pu être chargée. Tous les fichiers sont sur la page des versions sur GitHub.',
    others: {
      title: 'Autres façons de l’obtenir',
      cli: {
        title: 'Ligne de commande',
        detail: 'Inspectez, exportez, vérifiez et scriptez des fichiers .fig sans ouvrir l’app.'
      },
      source: {
        title: 'Depuis les sources',
        detail: 'Compilez l’app vous-même avec Bun et Rust.',
        action: 'Instructions de compilation'
      }
    },
    beta: {
      badge: 'Bêta',
      title: 'Essayez la suite',
      lede: 'Les bêtas apportent les fonctions de la prochaine version en avance, avant qu’elles n’arrivent à tous.',
      caveats: [
        'Une app en version stable ne passe pas à une bêta ; installez la bêta pour l’essayer.',
        'Sous Linux, supprimez une bêta installée avec .deb ou .rpm avant d’installer la version finale.',
        'Les bêtas de la CLI et du SDK sont sur npm sous l’étiquette next.'
      ],
      notes: 'Nouveautés'
    }
  }
}
