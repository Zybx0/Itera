# ADR-0002 — Local-first, chiffrement applicatif par enregistrement

- Statut : accepté (2026-09-25)

## Contexte
Données potentiellement sensibles ; exigence RGPD ; web et iOS n'offrent pas le même
chiffrement de base de données (SQLCipher indisponible sur le web).

## Décision
Chaque enregistrement est sérialisé en JSON, chiffré avec XChaCha20-Poly1305 (clé de
256 bits propre à l'appareil, AAD = id) et stocké comme blob opaque `(id, payload)`.
Le stockage (SQLite, IndexedDB) ne voit aucune donnée en clair ni métadonnée. Toute la
collection est déchiffrée en mémoire au démarrage.

## Conséquences
- Même code de chiffrement sur toutes les plateformes, testé une seule fois.
- Une future synchronisation peut transporter ces blobs sans que le serveur puisse les
  lire (E2EE « gratuit »).
- Pas de requêtes SQL sur le contenu : filtrage en mémoire (acceptable jusqu'à ~100 k
  cartes ; au-delà prévoir un index chiffré ou un chargement paresseux).
