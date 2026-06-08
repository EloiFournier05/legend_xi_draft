# Legend XI Draft

Application web locale en français pour drafter deux XI de légende à partir d'effectifs historiques européens depuis 2000, puis simuler un match en 90 secondes.

## Stack

- React + Vite
- TypeScript
- Tailwind CSS
- Zustand
- Données locales TypeScript
- Aucun backend pour la V1

## Lancer le projet

```bash
npm install
npm run dev
```

Puis ouvrir l'URL affichée par Vite.

## Scripts

```bash
npm run dev
npm run build
npm run preview
```

## Architecture

- `src/data/squads.ts` : 50 effectifs historiques et attributs cachés générés localement.
- `src/data/formations.ts` : formations et slots fixes.
- `src/types/game.ts` : modèles `GameState`, `PlayerState`, `DraftState`, `MatchState`.
- `src/store/gameStore.ts` : orchestration locale de la partie.
- `src/utils/draft.ts` : tirage, reroll, validation de draft.
- `src/utils/teamStrength.ts` : cohérence poste/slot, synergies et force d'équipe.
- `src/utils/simulation.ts` : moteur de match semi temps réel.
- `src/services/gameSession.ts` : abstraction de session locale remplaçable plus tard par Supabase/Firebase.
- `src/components` : composants réutilisables.

## Notes V1

- Les notes des joueurs ne sont jamais affichées dans l'interface.
- Les doublons de joueurs sont autorisés.
- Les logos, photos et assets officiels ne sont pas utilisés.
- La simulation avance d'une minute par seconde réelle, jusqu'à 90 minutes.

## Mode online

Le projet est prêt pour Vercel + Supabase. Voir [ONLINE_DEPLOY.md](./ONLINE_DEPLOY.md).
