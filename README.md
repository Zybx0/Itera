# Itera

Application de **répétition espacée** (cartes mémoire façon Anki) pour **iOS** et le
**web**, au design « verre liquide ». Local-first, **chiffrée**, sans compte ni traceur,
conçue pour respecter le RGPD.

- Planification **FSRS** (l'algorithme d'Anki moderne)
- Toutes les données chiffrées sur l'appareil (XChaCha20-Poly1305, clé dans le trousseau)
- Export JSON / sauvegarde chiffrée par phrase de passe / import / effacement total
- Verrouillage Face ID, interface Liquid Glass sur iOS 26

```bash
npm install
npm run check      # typecheck + lint + tests
npm run web        # lancer la version web
```

## Documentation

| Document | Contenu |
|---|---|
| [docs/FICHE_DE_SUIVI.md](docs/FICHE_DE_SUIVI.md) | **À lire en premier** : stack, architecture, flux, recettes, feuille de route |
| [docs/SECURITE.md](docs/SECURITE.md) | Modèle de menaces, cryptographie, checklist de release |
| [docs/RGPD.md](docs/RGPD.md) | Conformité, droits des personnes, plan si l'app se développe |
| [docs/adr/](docs/adr/) | Décisions d'architecture |
| [SECURITY.md](SECURITY.md) | Signaler une vulnérabilité |
