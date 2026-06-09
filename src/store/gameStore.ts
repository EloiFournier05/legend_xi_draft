import { create } from "zustand";
import { createStarterSlots, getFormation } from "../data/formations";
import { createDraftedPlayer, isDraftComplete, isPlayerAlreadyDrafted, otherSide, randomSquad } from "../utils/draft";
import { assignPlayersToFormation } from "../utils/teamStrength";
import { simulateMinute } from "../utils/simulation";
import type { DraftedPlayer, GameState, HistoricalSquad, MatchState, SessionState, TeamSide } from "../types/game";

type SetupPayload = {
  player1Name?: string;
  player2Name?: string;
  player1Formation?: string;
  player2Formation?: string;
};

interface SubstitutionPair {
  outInstanceId: string;
  inInstanceId: string;
}

interface GameActions {
  session: SessionState;
  setScreen: (screen: GameState["screen"]) => void;
  setSession: (session: Partial<SessionState>) => void;
  replaceFromRemote: (gameState: GameState) => void;
  newLocalGame: () => void;
  updateSetup: (payload: SetupPayload) => void;
  startDraft: () => void;
  rerollSquad: () => void;
  selectDraftPlayer: (playerId?: string) => void;
  selectDestination: (destination?: string) => void;
  confirmDraftPick: () => void;
  launchMatch: () => void;
  tickMatch: () => void;
  togglePause: () => void;
  changeMatchFormation: (side: TeamSide, formationId: string) => void;
  applySubstitutions: (side: TeamSide, pairs: SubstitutionPair[]) => void;
  replay: () => void;
}

const createClientId = () => {
  const key = "legend-xi-client-id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const next = crypto.randomUUID();
  localStorage.setItem(key, next);
  return next;
};

export const makeInitialState = (): GameState => ({
  screen: "home",
  debug: false,
  players: {
    player1: {
      id: "player1",
      name: "Joueur 1",
      formationId: "4-3-3",
      starters: createStarterSlots("4-3-3"),
      bench: [],
      rerollsLeft: 3,
    },
    player2: {
      id: "player2",
      name: "Joueur 2",
      formationId: "4-2-3-1",
      starters: createStarterSlots("4-2-3-1"),
      bench: [],
      rerollsLeft: 3,
    },
  },
  draft: {
    activePlayer: "player1",
    turnNumber: 1,
  },
  online: {
    simulationHost: "player1",
  },
});

const clonePickForMatch = (pick?: DraftedPlayer): DraftedPlayer | undefined =>
  pick ? { ...pick, enteredAtMinute: 0, redCard: false } : undefined;

const emptyMatchStats = () => ({
  goals: 0,
  scorers: {},
  assists: {},
  shots: 0,
  shotsOnTarget: 0,
  possession: 50,
  xg: 0,
  redCards: 0,
  corners: 0,
  penalties: 0,
  fouls: 0,
  saves: 0,
  bigChances: 0,
  woodwork: 0,
  freeKicks: 0,
});

const makeMatchState = (state: GameState): MatchState => ({
  minute: 0,
  isPaused: false,
  isFinished: false,
  momentum: 0,
  lastEventSecond: 0,
  timeline: [
    {
      id: crypto.randomUUID(),
      minute: 0,
      type: "calm",
      text: "0' Coup d'envoi. Les deux XI de légende entrent dans l'arène.",
    },
  ],
  teams: {
    player1: {
      side: "player1",
      name: state.players.player1.name,
      formationId: state.players.player1.formationId,
      starters: state.players.player1.starters.map((starter) => ({
        slot: starter.slot,
        pick: clonePickForMatch(starter.pick),
      })),
      bench: state.players.player1.bench.map((pick) => ({ ...pick, enteredAtMinute: undefined, redCard: false })),
      substitutionsMade: 0,
      substitutionSessions: 0,
      stats: emptyMatchStats(),
    },
    player2: {
      side: "player2",
      name: state.players.player2.name,
      formationId: state.players.player2.formationId,
      starters: state.players.player2.starters.map((starter) => ({
        slot: starter.slot,
        pick: clonePickForMatch(starter.pick),
      })),
      bench: state.players.player2.bench.map((pick) => ({ ...pick, enteredAtMinute: undefined, redCard: false })),
      substitutionsMade: 0,
      substitutionSessions: 0,
      stats: emptyMatchStats(),
    },
  },
});

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  ...makeInitialState(),
  session: {
    mode: "local",
    syncStatus: "idle",
    clientId: createClientId(),
  },

  setScreen: (screen) => set({ screen }),

  setSession: (session) =>
    set((state) => ({
      session: {
        ...state.session,
        ...session,
      },
    })),

  replaceFromRemote: (gameState) =>
    set((state) => ({
      ...gameState,
      session: state.session,
    })),

  newLocalGame: () =>
    set((state) => ({
      ...makeInitialState(),
      screen: "setup",
      session: {
        ...state.session,
        mode: "local",
        syncStatus: "idle",
        role: undefined,
        gameId: undefined,
        code: undefined,
        shareUrl: undefined,
        error: undefined,
      },
    })),

  updateSetup: (payload) =>
    set((state) => {
      const player1Formation = payload.player1Formation ?? state.players.player1.formationId;
      const player2Formation = payload.player2Formation ?? state.players.player2.formationId;
      return {
        players: {
          player1: {
            ...state.players.player1,
            name: payload.player1Name ?? state.players.player1.name,
            formationId: player1Formation,
            starters: createStarterSlots(player1Formation),
          },
          player2: {
            ...state.players.player2,
            name: payload.player2Name ?? state.players.player2.name,
            formationId: player2Formation,
            starters: createStarterSlots(player2Formation),
          },
        },
      };
    }),

  startDraft: () =>
    set((state) => ({
      screen: "draft",
      draft: {
        activePlayer: "player1",
        currentSquad: randomSquad(),
        selectedPlayerId: undefined,
        selectedDestination: undefined,
        turnNumber: 1,
      },
      players: {
        player1: { ...state.players.player1, bench: [], rerollsLeft: 3, starters: createStarterSlots(state.players.player1.formationId) },
        player2: { ...state.players.player2, bench: [], rerollsLeft: 3, starters: createStarterSlots(state.players.player2.formationId) },
      },
    })),

  rerollSquad: () =>
    set((state) => {
      const side = state.draft.activePlayer;
      const active = state.players[side];
      if (!state.draft.currentSquad || state.draft.selectedPlayerId || active.rerollsLeft <= 0) return state;
      return {
        draft: {
          ...state.draft,
          currentSquad: randomSquad(state.draft.currentSquad.id),
        },
        players: {
          ...state.players,
          [side]: {
            ...active,
            rerollsLeft: active.rerollsLeft - 1,
          },
        },
      };
    }),

  selectDraftPlayer: (playerId) =>
    set((state) => {
      const player = state.draft.currentSquad?.players.find((candidate) => candidate.id === playerId);
      if (player && isPlayerAlreadyDrafted(state.players, player)) return state;
      return {
        draft: { ...state.draft, selectedPlayerId: playerId },
      };
    }),

  selectDestination: (destination) =>
    set((state) => ({
      draft: { ...state.draft, selectedDestination: destination },
    })),

  confirmDraftPick: () =>
    set((state) => {
      const squad = state.draft.currentSquad as HistoricalSquad | undefined;
      const player = squad?.players.find((candidate) => candidate.id === state.draft.selectedPlayerId);
      const destination = state.draft.selectedDestination;
      if (!squad || !player || !destination) return state;
      if (isPlayerAlreadyDrafted(state.players, player)) {
        return {
          draft: {
            ...state.draft,
            selectedPlayerId: undefined,
            selectedDestination: undefined,
          },
        };
      }

      const side = state.draft.activePlayer;
      const active = state.players[side];
      const pick = createDraftedPlayer(player, squad, side);
      const updatedActive =
        destination.startsWith("bench")
          ? {
              ...active,
              bench: active.bench.length < 5 ? [...active.bench, pick] : active.bench,
            }
          : {
              ...active,
              starters: active.starters.map((starter) =>
                starter.slot.id === destination ? { ...starter, pick: { ...pick, assignedSlotId: destination } } : starter,
              ),
            };

      const updatedPlayers = {
        ...state.players,
        [side]: updatedActive,
      };

      if (isDraftComplete(updatedPlayers)) {
        return {
          players: updatedPlayers,
          screen: "summary",
          draft: {
            ...state.draft,
            currentSquad: undefined,
            selectedPlayerId: undefined,
            selectedDestination: undefined,
          },
        };
      }

      const nextSide = otherSide(side);
      return {
        players: updatedPlayers,
        draft: {
          activePlayer: nextSide,
          currentSquad: randomSquad(),
          selectedPlayerId: undefined,
          selectedDestination: undefined,
          turnNumber: state.draft.turnNumber + 1,
        },
      };
    }),

  launchMatch: () =>
    set((state) => ({
      screen: "match",
      match: makeMatchState(state),
    })),

  tickMatch: () =>
    set((state) => {
      if (!state.match) return state;
      const match = simulateMinute(state.match);
      return {
        match,
        screen: match.isFinished ? "final" : state.screen,
      };
    }),

  togglePause: () =>
    set((state) => ({
      match: state.match ? { ...state.match, isPaused: !state.match.isPaused } : state.match,
    })),

  changeMatchFormation: (side, formationId) =>
    set((state) => {
      if (!state.match) return state;
      const team = state.match.teams[side];
      const active = team.starters.map((starter) => starter.pick).filter((pick): pick is DraftedPlayer => Boolean(pick && !pick.redCard));
      const reassigned = assignPlayersToFormation(active, formationId);
      return {
        match: {
          ...state.match,
          teams: {
            ...state.match.teams,
            [side]: {
              ...team,
              formationId,
              starters: reassigned,
            },
          },
          timeline: [
            {
              id: crypto.randomUUID(),
              minute: state.match.minute,
              type: "tactic",
              team: side,
              text: `${state.match.minute}' Changement tactique : ${team.name} passe en ${getFormation(formationId).name}.`,
            },
            ...state.match.timeline,
          ],
        },
      };
    }),

  applySubstitutions: (side, pairs) =>
    set((state) => {
      if (!state.match || pairs.length === 0) return state;
      const team = state.match.teams[side];
      if (team.substitutionSessions >= 3 || team.substitutionsMade >= 5) return state;

      const allowedPairs = pairs.slice(0, Math.max(0, 5 - team.substitutionsMade));
      let starters = [...team.starters];
      let bench = [...team.bench];
      const labels: string[] = [];

      allowedPairs.forEach((pair) => {
        const starterIndex = starters.findIndex((starter) => starter.pick?.instanceId === pair.outInstanceId && !starter.pick.redCard);
        const benchIndex = bench.findIndex((pick) => pick.instanceId === pair.inInstanceId);
        if (starterIndex < 0 || benchIndex < 0) return;

        const outgoing = starters[starterIndex].pick!;
        const incoming = { ...bench[benchIndex], enteredAtMinute: state.match!.minute, redCard: false };
        starters[starterIndex] = {
          ...starters[starterIndex],
          pick: { ...incoming, assignedSlotId: starters[starterIndex].slot.id },
        };
        bench = bench.filter((pick) => pick.instanceId !== incoming.instanceId);
        bench.push({ ...outgoing, assignedSlotId: undefined });
        labels.push(`${incoming.player.name} remplace ${outgoing.player.name}`);
      });

      if (labels.length === 0) return state;

      return {
        match: {
          ...state.match,
          teams: {
            ...state.match.teams,
            [side]: {
              ...team,
              starters,
              bench,
              substitutionsMade: team.substitutionsMade + labels.length,
              substitutionSessions: team.substitutionSessions + 1,
            },
          },
          timeline: [
            {
              id: crypto.randomUUID(),
              minute: state.match.minute,
              type: "sub",
              team: side,
              text: `${state.match.minute}' ${team.name} effectue un changement : ${labels.join(", ")}.`,
            },
            ...state.match.timeline,
          ],
        },
      };
    }),

  replay: () => set((state) => ({ ...makeInitialState(), screen: "setup", session: state.session })),
}));

export const getCurrentState = () => useGameStore.getState();

export const selectPersistableGameState = (state: GameState & Partial<GameActions>): GameState => ({
  screen: state.screen,
  players: state.players,
  draft: state.draft,
  match: state.match,
  online: state.online,
  debug: state.debug,
});
