# Sécurité — Itera

Posture retenue : **traiter les cartes comme des données sensibles** (elles peuvent
contenir des informations médicales, juridiques, personnelles…). Ce document décrit le
modèle de menaces, les mesures en place, les risques acceptés et la checklist de release.

## 1. Actifs à protéger

| Actif | Où | Sensibilité |
|---|---|---|
| Contenu des cartes, noms de paquets, étiquettes | Stockage local chiffré | Élevée |
| Historique de révision (horaires, durées) | Stockage local chiffré | Moyenne (révèle des habitudes) |
| Clé de données (256 bits) | Keychain iOS / IndexedDB (enveloppée) | Critique |
| Fichiers d'export | Hors de l'app (choix de l'utilisateur) | Élevée si non chiffrés |
| Phrase de passe de sauvegarde | Mémoire uniquement, jamais stockée | Critique |

## 2. Modèle de menaces (STRIDE simplifié)

| Menace | Scénario | Mesure |
|---|---|---|
| Vol / perte de l'appareil | Lecture des fichiers de l'app | Données chiffrées ; clé Keychain `WHEN_UNLOCKED_THIS_DEVICE_ONLY` ; verrouillage Face ID optionnel ; protection de données iOS. |
| Sauvegarde iCloud / copie du disque | Extraction de la base | La base ne contient que des blobs chiffrés ; la clé n'est jamais sauvegardée (`THIS_DEVICE_ONLY`). |
| Capture d'écran du sélecteur d'apps | Contenu visible dans l'aperçu | Écran de masquage dès que l'app devient inactive (`LockGate`). |
| Fichier d'import piégé | Injection, DoS mémoire, pollution de prototype | Taille max, JSON strict, schéma zod (clés inconnues supprimées), limites de champs, intégrité référentielle, paramètres Argon2 bornés. Testé. |
| Contenu de carte malveillant | XSS / injection HTML | Rendu **texte brut** uniquement ; suppression des caractères de contrôle et des surcharges bidi (« Trojan Source »). |
| Altération de la base locale | Modifier / échanger des enregistrements | AEAD (tag Poly1305) + AAD = id de l'enregistrement ; enregistrements invalides ignorés et signalés. |
| XSS sur la version web | Script tiers lit les données | CSP `default-src 'none'`, scripts uniquement `'self'` + hash ; aucune ressource tierce ; clé d'enveloppe non extractible. |
| Clickjacking | Intégration dans une iframe | `frame-ancestors 'none'`, `X-Frame-Options: DENY`. |
| Chaîne d'approvisionnement | Dépendance compromise | Versions exactes + lockfile, `npm ci`, `npm audit`, Dependabot, dependency review, CodeQL, actions épinglées par SHA, peu de dépendances cryptographiques (noble, auditées). |
| Fuite de secrets dans le dépôt | Clés API / certificats commités | `.gitignore` (`*.p8`, `*.p12`, `.env*`…), gitleaks en CI. |
| Fuite par les logs | Contenu dans un rapport d'erreur | Les erreurs n'incluent jamais de contenu ; aucun envoi de logs ; `errorMessage()` ne montre que des messages génériques. |
| Attaque par force brute d'une sauvegarde | Deviner la phrase de passe | Argon2id (m = 19 MiB, t = 2) + phrase ≥ 12 caractères. |

## 3. Cryptographie

| Usage | Algorithme | Détails |
|---|---|---|
| Chiffrement des enregistrements | XChaCha20-Poly1305 | Clé 256 bits, nonce 192 bits aléatoire par écriture, AAD = `itera/record/v1/<id>`. Format : `0x01 ‖ nonce ‖ ciphertext‖tag`. L'octet de version permet de changer d'algorithme sans casser l'existant. |
| Sauvegardes chiffrées | Argon2id → XChaCha20-Poly1305 | Sel 128 bits, paramètres stockés dans le fichier et **bornés** à la lecture (min OWASP, max 256 MiB). AAD = `itera/export/v1`. Phrase normalisée NFKC. |
| Enveloppe de clé (web) | AES-GCM 256 (WebCrypto) | Clé d'enveloppe générée `extractable: false`, stockée dans IndexedDB. |
| Aléa | `crypto.getRandomValues` | iOS : `expo-crypto` (SecRandomCopyBytes) injecté par `polyfills.ts`. Pas de repli `Math.random` : échec explicite. |
| Identifiants | UUID v4 depuis le CSPRNG | |

Bibliothèques : `@noble/ciphers`, `@noble/hashes` (auditées, sans dépendance, temps
constant). **Ne jamais implémenter de primitive soi-même.** Toute évolution
cryptographique = nouvelle ADR + nouvel octet de version + tests de compatibilité.

## 4. Gestion de la clé par plateforme

- **iOS** : `expo-secure-store`, clé `itera.data-key.v1`, accessibilité
  `WHEN_UNLOCKED_THIS_DEVICE_ONLY`. Conséquence assumée : pas de restauration sur un autre
  appareil sans export.
- **Web** : clé de données chiffrée par une clé AES-GCM non extractible. Protège contre la
  copie des fichiers du profil navigateur ; **ne protège pas** contre du code exécuté dans
  la page (d'où la CSP). Évolution possible : option « phrase de passe au démarrage »
  (clé dérivée par Argon2id, jamais stockée).
- **Effacement** : suppression des données **puis** de la clé (crypto-shredding).

## 5. Sécurité web (en-têtes)

Définis dans `apps/app/public/_headers` et vérifiés par l'e2e :
`Content-Security-Policy` (`default-src 'none'`, `script-src 'self' 'sha256-…'`,
`style-src 'self' 'unsafe-inline'`, `connect-src 'self'`, `frame-ancestors 'none'`,
`base-uri 'none'`, `form-action 'none'`, `object-src 'none'`), HSTS (2 ans, preload),
`nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy` restrictive, COOP/CORP.

- `'unsafe-inline'` pour les styles est requis par react-native-web (styles injectés à
  l'exécution) ; risque faible car les scripts, eux, sont verrouillés.
- Le hash du script inline d'Expo Router est recalculé par `npm run csp:hash` ; la CI
  échoue s'il ne correspond plus.

## 6. Sécurité du code

- ESLint : `no-eval`, `no-implied-eval`, `no-new-func`, `react/no-danger` en erreur.
- TypeScript strict + `noUncheckedIndexedAccess`.
- Le cœur est testé sur les cas hostiles : altération, mauvaise clé, blob déplacé, fichier
  malformé, pollution de prototype, paramètres KDF abusifs, échec disque au milieu d'une
  écriture (l'état mémoire reste cohérent).
- Toutes les écritures sont atomiques (transaction SQLite / IndexedDB) et sérialisées.

## 7. Risques acceptés (à réévaluer à chaque release)

| Risque | Justification |
|---|---|
| `npm audit` signale 15 vulnérabilités **modérées** transitives (`uuid` < 11.1.1 via `xcode` → `@expo/config-plugins` ; `decode-uri-component` via `query-string` → `expo-router`). | `uuid` n'est utilisé qu'à la **génération du projet natif** (outil de build), pas dans l'app. `decode-uri-component` : DoS sur une URL malformée dans le client local uniquement (auto-DoS). Pas de correctif compatible (version ESM-only). La CI bloque à partir de « high ». Suivre les mises à jour Expo. |
| Styles inline autorisés par la CSP. | Requis par react-native-web. |
| Clé web utilisable par du code dans la page. | Limite intrinsèque du web ; atténuée par la CSP et l'absence de toute ressource tierce. |

## 8. Checklist avant chaque release

- [ ] `npm run check` vert, e2e web vert, CI verte (CodeQL sans alerte).
- [ ] `npm audit --omit=dev` : aucune vulnérabilité high/critical ; section 7 à jour.
- [ ] Aucune nouvelle dépendance non justifiée (surtout réseau, analytics, crash reporting).
- [ ] Aucune requête réseau ajoutée (sinon : mise à jour CSP, RGPD.md, fiche App Store).
- [ ] Hash CSP à jour (`npm run csp:hash`).
- [ ] Test manuel iPhone : verrouillage Face ID, masquage dans le sélecteur d'apps,
      export chiffré → import sur un autre appareil.
- [ ] Manifeste de confidentialité iOS (`app.json` → `privacyManifests`) cohérent.
- [ ] FICHE_DE_SUIVI.md §15 mis à jour.

## 9. Réponse à incident

1. Recevoir le signalement (voir `../SECURITY.md`), accuser réception sous 72 h.
2. Évaluer : impact, versions touchées, exploitation active ?
3. Corriger dans une branche privée, ajouter un test de non-régression.
4. Publier (App Store accéléré si nécessaire, web immédiat) et avertir les utilisateurs.
5. Si des données personnelles traitées par l'éditeur sont concernées (après ajout d'un
   serveur) : notification CNIL sous 72 h (RGPD art. 33) et, si risque élevé, information
   des personnes (art. 34). Documenter l'incident dans un registre des violations.
