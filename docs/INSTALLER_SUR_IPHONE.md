# Installer Itera sur son iPhone (usage personnel)

Trois façons, du plus simple au plus « natif ». Aucune ne publie l'app sur l'App Store :
elle reste pour vous seul.

| | A. App web installée | B. App native via Xcode | C. App native via EAS |
|---|---|---|---|
| Coût | Gratuit | Gratuit | 99 $/an (Apple Developer) |
| Matériel | iPhone seul | **Mac** + câble | iPhone seul |
| Hors ligne | ✅ | ✅ | ✅ |
| Liquid Glass natif, Face ID | ❌ (verre CSS, pas de Face ID) | ✅ | ✅ |
| Durée | Illimitée, mises à jour instantanées | **Expire tous les 7 jours** (réinstaller) | 1 an |

> Vos cartes sont stockées **sur l'appareil**, séparément pour chaque version (l'app web et
> l'app native ne partagent pas leurs données). Pour passer de l'une à l'autre :
> Réglages → *Exporter une sauvegarde chiffrée*, puis *Importer* dans l'autre.

---

## A. App web installée sur l'écran d'accueil (gratuit, sans Mac)

Il faut une adresse en HTTPS : on publie la version web gratuitement sur **Cloudflare Pages**
(qui applique automatiquement nos en-têtes de sécurité `_headers`).

### 1. Mettre en ligne (une seule fois)
1. Créer un compte sur <https://dash.cloudflare.com> (gratuit).
2. **Workers & Pages → Create → Pages → Connect to Git** → autoriser GitHub → choisir
   le dépôt `Itera`.
3. Réglages de build :
   - *Production branch* : `main`
   - *Framework preset* : **None**
   - *Build command* : `npm run build:web`
   - *Build output directory* : `apps/app/dist`
   - *Environment variables* → ajouter `NODE_VERSION` = `22`
4. **Save and Deploy**. Après 2-3 minutes vous obtenez une adresse du type
   `https://itera-xxx.pages.dev`.

Ensuite, chaque merge sur `main` redéploie automatiquement.

> Confidentialité : l'adresse est publique mais ne donne accès à **aucune donnée** — vos
> cartes ne sont jamais envoyées au serveur, elles restent chiffrées sur votre téléphone.
> Pour réserver l'accès au site lui-même, activer *Cloudflare Access* (gratuit) sur le projet.

### 2. Installer sur l'iPhone
1. Ouvrir l'adresse dans **Safari** (pas Chrome).
2. Bouton **Partager** → **Sur l'écran d'accueil** → **Ajouter**.
3. Ouvrir Itera **depuis l'icône** une première fois avec du réseau : l'app se met en
   cache. Elle fonctionne ensuite **hors ligne** (mode avion compris).

Mises à jour : à la réouverture avec du réseau, la nouvelle version est téléchargée et
active au lancement suivant.

⚠️ Supprimer l'icône de l'écran d'accueil supprime aussi les données de l'app web :
faites des sauvegardes chiffrées régulières.

---

## B. App native avec Xcode (gratuit, nécessite un Mac)

Prérequis : un Mac avec **Xcode** (App Store), **Node 22**, votre identifiant Apple
habituel, l'iPhone et son câble.

1. Sur l'iPhone : **Réglages → Confidentialité et sécurité → Mode développeur** → activer
   (redémarrage demandé).
2. Sur le Mac :
   ```bash
   git clone https://github.com/Zybx0/Itera.git && cd Itera
   npm install
   cd apps/app
   npx expo prebuild -p ios --clean
   npx expo run:ios --device --configuration Release
   ```
   `prebuild --clean` régénère entièrement le dossier `ios/` (il n'est jamais gardé dans
   le dépôt) en appliquant nos correctifs de configuration, notamment celui qui évite un
   plantage immédiat au lancement sur les iPhone récents (voir
   `apps/app/plugins/withIosSceneLifecycle.js`). Si `ios/` existe déjà d'un essai
   précédent et que l'app se ferme aussitôt ouverte, c'est probablement qu'il date d'avant
   ce correctif : relancez `npx expo prebuild -p ios --clean` pour le régénérer.
   Choisir votre iPhone dans la liste. La première fois, Xcode demande une équipe de
   signature : ouvrir `apps/app/ios/Itera.xcworkspace` dans Xcode → cible *Itera* →
   *Signing & Capabilities* → *Team* : votre identifiant Apple (*Personal Team*). Si le
   *Bundle Identifier* `app.itera.ios` est refusé, le rendre unique (ex.
   `app.itera.ios.votrenom`) dans `apps/app/app.json` puis relancer la commande.
3. Sur l'iPhone : **Réglages → Général → VPN et gestion de l'appareil** → faire confiance
   au certificat de développeur.

Limites d'un compte gratuit : l'app **cesse de s'ouvrir après 7 jours** ; relancer la
commande de l'étape 2 (les données sont conservées). Au plus 3 apps de ce type par appareil.

---

## C. App native via EAS (99 $/an, sans Mac)

Pour une vraie app qui ne expire pas au bout de 7 jours, sans la publier.

1. S'inscrire au **Apple Developer Program** (<https://developer.apple.com/programs/>).
2. Créer un compte gratuit sur <https://expo.dev>.
3. Sur n'importe quel ordinateur, dans le dépôt :
   ```bash
   cd apps/app
   npx eas-cli@latest login
   npx eas-cli@latest device:create      # ouvrir le lien sur l'iPhone pour l'enregistrer
   npx eas-cli@latest build --platform ios --profile preview
   ```
   EAS construit l'app dans le cloud (signature gérée automatiquement) et fournit un
   **lien / QR code d'installation** à ouvrir sur l'iPhone. Profil `preview` =
   distribution interne (*ad hoc*) : seuls les appareils enregistrés peuvent l'installer.
4. Sur l'iPhone : activer le **Mode développeur** si demandé (voir B.1).

Variante : `--profile production` puis `npx eas-cli@latest submit` et **TestFlight** en
test interne (toujours privé, pas de publication App Store).

---

## Et Expo Go ?

L'app gratuite *Expo Go* peut lancer Itera depuis un ordinateur (`npm run ios`, puis
scanner le QR code), mais l'ordinateur doit rester allumé et sur le même Wi-Fi : utile
pour tester une modification, pas pour un usage quotidien. Compatibilité complète
(Liquid Glass, Face ID) non vérifiée à ce jour.
