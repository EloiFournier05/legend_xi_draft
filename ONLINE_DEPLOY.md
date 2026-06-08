# Déploiement online Vercel + Supabase

Cette V1 conserve le mode local et ajoute un mode online sans authentification.

## Architecture

- `src/services/onlineGameSession.ts` contient toute la logique Supabase.
- `src/session/GameSessionProvider.tsx` choisit le mode local ou online.
- `games.game_state` stocke tout le `GameState` en JSONB.
- Supabase Realtime synchronise les updates sur `games`.
- Le créateur est `Joueur 1`.
- Le joueur qui rejoint est `Joueur 2`.
- La simulation online est contrôlée par le host (`Joueur 1`) pour éviter la désynchronisation.

## Variables Vercel

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Étapes sans installation locale

1. Créer un projet Supabase depuis https://supabase.com.
2. Ouvrir `SQL Editor` dans Supabase.
3. Copier-coller tout le contenu de `supabase/schema.sql`.
4. Exécuter le SQL.
5. Dans Supabase, aller dans `Project Settings > API`.
6. Copier `Project URL` vers `VITE_SUPABASE_URL`.
7. Copier `anon public key` vers `VITE_SUPABASE_ANON_KEY`.
8. Mettre le dossier du projet sur GitHub.
9. Dans Vercel, cliquer `Add New Project`.
10. Importer le repo GitHub.
11. Vérifier que Vercel détecte `Vite`.
12. Ajouter les deux variables d'environnement dans `Settings > Environment Variables`.
13. Déployer.
14. Tester avec deux onglets ou deux appareils :
    - onglet 1 : `Créer en ligne`
    - copier le lien ou le code
    - onglet 2 : ouvrir le lien ou `Rejoindre`
    - Joueur 1 configure son équipe
    - Joueur 2 configure son équipe
    - Joueur 1 lance la draft
    - chaque joueur drafte uniquement à son tour
    - Joueur 1 lance le match

## Notes de sécurité V1

Les policies RLS sont ouvertes pour permettre une V1 sans compte utilisateur. Pour une V2, ajouter une vraie authentification Supabase et restreindre chaque update au client autorisé.
