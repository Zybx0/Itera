# Instructions pour les contributeurs (humains et agents IA)

Lire d'abord `docs/FICHE_DE_SUIVI.md`. Règles essentielles :

- `packages/core` ne dépend jamais de React/Expo ; l'app n'importe que depuis `@itera/core`.
- Toute écriture de données passe par `Collection` ; toute donnée lue est validée (zod).
- Écrans : rendu pur — `useNow()` + sélecteurs `selectXxx(state, …)`, jamais `Date.now()`
  ni méthode de `Collection` pendant le rendu (React Compiler).
- Contenu des cartes = texte brut. Jamais de HTML, `eval`, `dangerouslySetInnerHTML`.
- Aucune requête réseau, analytics ou SDK tiers sans mise à jour de `docs/RGPD.md`,
  `docs/SECURITE.md` et de la CSP (`apps/app/public/_headers`).
- Dépendances Expo : `npx expo install` dans `apps/app`. Versions exactes.
- Expo change à chaque SDK : vérifier la doc de la version utilisée (`apps/app/package.json`).
- Avant de terminer : `npm run check` ; si l'UI web change : `npm run build:web` puis
  `npm run test:e2e:web --workspace @itera/app`.
- Mettre à jour `docs/FICHE_DE_SUIVI.md` (§15 Journal) à chaque changement structurant.
