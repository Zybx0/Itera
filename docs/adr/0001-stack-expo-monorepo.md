# ADR-0001 — Expo + React Native, monorepo avec cœur TypeScript pur

- Statut : accepté (2026-09-25)

## Contexte
Cibles : iOS d'abord, web ensuite, desktop (Windows/macOS/Linux) plus tard. Un seul
développeur au départ. Besoin d'un rendu « verre liquide » natif sur iOS.

## Décision
- **Expo (React Native)** pour iOS + web avec une seule base de code, Expo Router pour la
  navigation, `expo-glass-effect` pour Liquid Glass.
- **Monorepo npm workspaces** : `packages/core` (logique pure, sans React) et `apps/app`.
- Desktop plus tard via **Tauri** enveloppant le build web (léger, sécurisé, accès au
  trousseau OS), ou React Native Windows/macOS si un rendu natif est requis.

## Alternatives écartées
- Flutter : bon multiplateforme mais pas d'accès direct à Liquid Glass natif, et le cœur
  ne serait pas réutilisable côté web/serveur JS.
- SwiftUI natif + app web séparée : meilleur rendu iOS mais deux bases de code.
- Electron pour le desktop : plus lourd et surface d'attaque plus grande que Tauri.

## Conséquences
Le cœur est testable sous Node et réutilisable (serveur de sync, desktop). Les modules
natifs imposent un *development build* (pas Expo Go).
