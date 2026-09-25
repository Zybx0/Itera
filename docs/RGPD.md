# RGPD — Itera

> Ce document n'est pas un avis juridique. Il décrit comment le produit est conçu pour
> respecter le RGPD (règlement UE 2016/679) et la loi Informatique et Libertés, et ce
> qu'il faudra faire si l'application évolue. À faire relire par un·e juriste avant tout
> lancement public à grande échelle.

## 1. Situation actuelle (v0.1)

- Aucune donnée ne quitte l'appareil ; l'éditeur **ne reçoit, ne stocke et ne consulte
  aucune donnée** : pas de compte, pas de serveur, pas d'analytics, pas de SDK tiers,
  pas de cookies ni traceurs.
- Les données (cartes, historique) sont stockées localement et chiffrées ; elles sont
  sous le seul contrôle de l'utilisateur.
- Conséquence : l'éditeur n'est vraisemblablement pas « responsable de traitement » pour
  ces données tant qu'il n'y a pas accès. Nous appliquons néanmoins **tous les principes**
  comme si c'était le cas (approche prudente, et prête pour la suite).

## 2. Protection des données dès la conception (art. 25)

| Principe (art. 5) | Mise en œuvre |
|---|---|
| Licéité, transparence | Politique de confidentialité in-app (`src/app/privacy.tsx`) + fiche store. |
| Limitation des finalités | Données utilisées uniquement pour planifier les révisions. |
| Minimisation | Aucun identifiant, aucune donnée de compte, aucune donnée d'appareil collectée. |
| Exactitude | L'utilisateur modifie librement ses cartes. |
| Limitation de conservation | Données supprimées à la désinstallation ou via « Effacer toutes mes données ». |
| Intégrité et confidentialité (art. 32) | Chiffrement XChaCha20-Poly1305, clé dans le Keychain, verrouillage biométrique, CSP (voir SECURITE.md). |

## 3. Droits des personnes — où ils sont dans le produit

| Droit | Article | Implémentation |
|---|---|---|
| Information | 12–14 | Écran « Confidentialité » + politique publiée sur le site. |
| Accès | 15 | Réglages → Exporter (JSON lisible = copie intégrale). |
| Rectification | 16 | Édition des cartes et paquets. |
| Effacement | 17 | Réglages → Effacer toutes mes données (suppression sécurisée + destruction de clé). |
| Limitation | 18 | Sans objet (aucun traitement par l'éditeur). |
| Portabilité | 20 | Export JSON documenté, structuré et versionné (`format: itera.export`). |
| Opposition | 21 | Sans objet (aucun traitement fondé sur l'intérêt légitime). |

## 4. Registre des activités de traitement (art. 30) — modèle

Tant qu'aucun serveur n'existe, le registre contient une seule entrée « à blanc », à
compléter dès qu'un traitement côté éditeur apparaît.

| Champ | Valeur |
|---|---|
| Traitement | Fonctionnement de l'application de répétition espacée |
| Responsable | *[Nom / raison sociale, adresse, contact]* |
| Finalité | Permettre à l'utilisateur de créer et réviser ses cartes |
| Base légale | Exécution du service demandé (art. 6.1.b) |
| Catégories de personnes | Utilisateurs de l'app |
| Catégories de données | Contenu des cartes, historique de révision (local uniquement) |
| Destinataires | Aucun |
| Transferts hors UE | Aucun |
| Durée de conservation | Jusqu'à suppression par l'utilisateur |
| Mesures de sécurité | Voir SECURITE.md |

## 5. Web : hébergement et cookies

- L'app web n'utilise **aucun cookie** et aucun traceur → pas de bandeau de consentement
  requis (lignes directrices CNIL). Le stockage IndexedDB est « strictement nécessaire »
  au service demandé.
- Choisir un hébergeur **dans l'UE**. Les journaux d'accès du serveur (adresse IP) sont
  des données personnelles : les désactiver ou limiter leur conservation (≤ 12 mois,
  recommandation CNIL), et le mentionner dans la politique.
- Aucune police, image ou script chargé depuis un tiers (la CSP l'empêche) → pas de fuite
  d'IP vers Google Fonts, CDN, etc.
- Mentions légales obligatoires sur le site (LCEN art. 6) : éditeur, hébergeur, contact.

## 6. App Store

- Étiquette de confidentialité : **« Données non collectées »**.
- Manifeste de confidentialité iOS (`app.json` → `ios.privacyManifests`) :
  `NSPrivacyTracking: false`, aucune donnée collectée. Les API « à raison requise »
  utilisées par les modules Expo sont déclarées par Expo ; à revérifier à chaque SDK.
- Chiffrement : `ITSAppUsesNonExemptEncryption: false` — le chiffrement ne sert qu'à
  protéger les données de l'utilisateur sur son appareil (exemption). À réévaluer si
  une synchronisation chiffrée est ajoutée (déclaration export US possible).

## 7. Plan d'action « si l'application décolle »

À exécuter **avant** de mettre en production l'une de ces fonctionnalités :

**Synchronisation / comptes**
- [ ] Architecture E2EE : le serveur ne reçoit que des `StoredRecord` chiffrés côté
      client (déjà le format de stockage) ; il ne doit jamais connaître la clé.
- [ ] Minimiser les données de compte (e-mail seulement, ou compte anonyme par clé).
- [ ] Hébergement UE, contrat de sous-traitance (art. 28) avec chaque prestataire,
      liste des sous-traitants publiée.
- [ ] Suppression de compte **dans l'app** (exigence Apple + art. 17), effective aussi
      sur le serveur et les sauvegardes (délai documenté).
- [ ] Mettre à jour le registre (§4), la politique, l'étiquette App Store.
- [ ] Analyse d'impact (AIPD, art. 35) si traitement à grande échelle de données
      potentiellement sensibles (contenu libre des cartes).
- [ ] Procédure de violation de données (art. 33-34 : CNIL sous 72 h).
- [ ] Désigner un point de contact vie privée (DPO si obligatoire).

**Mesure d'audience / rapports de plantage**
- [ ] Préférer ne rien collecter. Sinon : outil exempté de consentement selon la CNIL
      (configuration stricte) ou opt-in explicite ; jamais de contenu de carte ; mise à
      jour de la CSP et de la politique.

**Mineurs**
- [ ] Si l'app vise des élèves : information adaptée ; en France, consentement parental
      sous 15 ans pour les traitements fondés sur le consentement.

**Paiements / abonnements**
- [ ] Passer par l'App Store (Apple est responsable des données de paiement) ; ne
      stocker que le statut d'abonnement.
