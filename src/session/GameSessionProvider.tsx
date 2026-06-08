import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { makeInitialState, selectPersistableGameState, useGameStore } from "../store/gameStore";
import { onlineGameSession } from "../services/onlineGameSession";
import type { SessionState, TeamSide } from "../types/game";

type SubstitutionPair = { outInstanceId: string; inInstanceId: string };

interface GameSessionApi {
  session: SessionState;
  isOnline: boolean;
  isHost: boolean;
  canControl: (side: TeamSide) => boolean;
  canActDraft: boolean;
  createOnlineGame: () => Promise<void>;
  joinOnlineGame: (code: string) => Promise<void>;
  leaveOnlineGame: () => void;
  copyShareLink: () => Promise<void>;
  newLocalGame: () => void;
  setScreen: ReturnType<typeof useGameStore.getState>["setScreen"];
  updateSetup: ReturnType<typeof useGameStore.getState>["updateSetup"];
  startDraft: ReturnType<typeof useGameStore.getState>["startDraft"];
  rerollSquad: ReturnType<typeof useGameStore.getState>["rerollSquad"];
  selectDraftPlayer: ReturnType<typeof useGameStore.getState>["selectDraftPlayer"];
  selectDestination: ReturnType<typeof useGameStore.getState>["selectDestination"];
  confirmDraftPick: ReturnType<typeof useGameStore.getState>["confirmDraftPick"];
  launchMatch: ReturnType<typeof useGameStore.getState>["launchMatch"];
  tickMatch: ReturnType<typeof useGameStore.getState>["tickMatch"];
  togglePause: ReturnType<typeof useGameStore.getState>["togglePause"];
  changeMatchFormation: ReturnType<typeof useGameStore.getState>["changeMatchFormation"];
  applySubstitutions: ReturnType<typeof useGameStore.getState>["applySubstitutions"];
  replay: ReturnType<typeof useGameStore.getState>["replay"];
}

const GameSessionContext = createContext<GameSessionApi | undefined>(undefined);

const persistCurrentState = async () => {
  const state = useGameStore.getState();
  if (state.session.mode !== "online" || !state.session.gameId) return;
  await onlineGameSession.saveState(state.session.gameId, selectPersistableGameState(state));
};

export function GameSessionProvider({ children }: { children: ReactNode }) {
  const session = useGameStore((state) => state.session);
  const draft = useGameStore((state) => state.draft);
  const setSession = useGameStore((state) => state.setSession);
  const replaceFromRemote = useGameStore((state) => state.replaceFromRemote);
  const channelRef = useRef<RealtimeChannel | undefined>(undefined);
  const applyingRemoteRef = useRef(false);

  const isOnline = session.mode === "online";
  const isHost = session.mode === "online" && session.role === "player1";

  const canControl = useCallback(
    (side: TeamSide) => session.mode === "local" || session.role === side,
    [session.mode, session.role],
  );

  const canActDraft = session.mode === "local" || session.role === draft.activePlayer;

  const runLocalAction = useCallback(
    async (action: () => void, options?: { side?: TeamSide; hostOnly?: boolean; draftTurnOnly?: boolean; persist?: boolean }) => {
      const state = useGameStore.getState();
      if (state.session.mode === "online") {
        if (options?.hostOnly && state.session.role !== "player1") return;
        if (options?.side && state.session.role !== options.side) return;
        if (options?.draftTurnOnly && state.session.role !== state.draft.activePlayer) return;
      }

      action();

      const shouldPersist = options?.persist !== false && useGameStore.getState().session.mode === "online";
      if (shouldPersist && !applyingRemoteRef.current) {
        setSession({ syncStatus: "loading", error: undefined });
        try {
          await persistCurrentState();
          setSession({ syncStatus: "connected" });
        } catch (error) {
          setSession({ syncStatus: "error", error: error instanceof Error ? error.message : "Synchronisation impossible." });
        }
      }
    },
    [setSession],
  );

  const subscribeToGame = useCallback(
    (gameId: string) => {
      onlineGameSession.unsubscribe(channelRef.current);
      channelRef.current = onlineGameSession.subscribe(
        gameId,
        (gameState) => {
          applyingRemoteRef.current = true;
          replaceFromRemote(gameState);
          setSession({ syncStatus: "connected", error: undefined });
          applyingRemoteRef.current = false;
        },
        (status, message) => setSession({ syncStatus: status, error: message }),
      );
    },
    [replaceFromRemote, setSession],
  );

  const createOnlineGame = useCallback(async () => {
    setSession({ mode: "online", syncStatus: "loading", error: undefined });
    try {
      const initial = {
        ...makeInitialState(),
        screen: "createOnline" as const,
      };
      const result = await onlineGameSession.createGame(initial, useGameStore.getState().session.clientId);
      replaceFromRemote(result.gameState);
      setSession({
        mode: "online",
        syncStatus: "connected",
        role: result.role,
        gameId: result.gameId,
        code: result.code,
        shareUrl: onlineGameSession.createShareUrl(result.code),
        error: undefined,
      });
      subscribeToGame(result.gameId);
    } catch (error) {
      setSession({ mode: "online", syncStatus: "error", error: error instanceof Error ? error.message : "Création impossible." });
    }
  }, [replaceFromRemote, setSession, subscribeToGame]);

  const joinOnlineGame = useCallback(
    async (code: string) => {
      setSession({ mode: "online", syncStatus: "loading", error: undefined });
      try {
        const result = await onlineGameSession.joinGame(code, useGameStore.getState().session.clientId);
        replaceFromRemote(result.gameState);
        setSession({
          mode: "online",
          syncStatus: "connected",
          role: result.role,
          gameId: result.gameId,
          code: result.code,
          shareUrl: onlineGameSession.createShareUrl(result.code),
          error: undefined,
        });
        subscribeToGame(result.gameId);
      } catch (error) {
        setSession({ mode: "online", syncStatus: "error", error: error instanceof Error ? error.message : "Connexion impossible." });
      }
    },
    [replaceFromRemote, setSession, subscribeToGame],
  );

  const leaveOnlineGame = useCallback(() => {
    onlineGameSession.unsubscribe(channelRef.current);
    channelRef.current = undefined;
    useGameStore.getState().setSession({
      mode: "local",
      syncStatus: "idle",
      role: undefined,
      gameId: undefined,
      code: undefined,
      shareUrl: undefined,
      error: undefined,
    });
    useGameStore.getState().setScreen("home");
  }, []);

  useEffect(() => {
    const joinCode = new URLSearchParams(window.location.search).get("join");
    if (joinCode && session.mode === "local" && session.syncStatus === "idle") {
      useGameStore.getState().setScreen("joinOnline");
    }
  }, [session.mode, session.syncStatus]);

  useEffect(() => () => onlineGameSession.unsubscribe(channelRef.current), []);

  const api = useMemo<GameSessionApi>(
    () => ({
      session,
      isOnline,
      isHost,
      canControl,
      canActDraft,
      createOnlineGame,
      joinOnlineGame,
      leaveOnlineGame,
      copyShareLink: async () => {
        if (session.shareUrl) await navigator.clipboard.writeText(session.shareUrl);
      },
      setScreen: (screen) => void runLocalAction(() => useGameStore.getState().setScreen(screen)),
      newLocalGame: () => useGameStore.getState().newLocalGame(),
      updateSetup: (payload) => {
        const side = payload.player1Formation !== undefined || payload.player1Name !== undefined ? "player1" : "player2";
        void runLocalAction(() => useGameStore.getState().updateSetup(payload), { side });
      },
      startDraft: () => void runLocalAction(() => useGameStore.getState().startDraft(), { hostOnly: true }),
      rerollSquad: () => void runLocalAction(() => useGameStore.getState().rerollSquad(), { draftTurnOnly: true }),
      selectDraftPlayer: (playerId) => void runLocalAction(() => useGameStore.getState().selectDraftPlayer(playerId), { draftTurnOnly: true }),
      selectDestination: (destination) => void runLocalAction(() => useGameStore.getState().selectDestination(destination), { draftTurnOnly: true }),
      confirmDraftPick: () => void runLocalAction(() => useGameStore.getState().confirmDraftPick(), { draftTurnOnly: true }),
      launchMatch: () => void runLocalAction(() => useGameStore.getState().launchMatch(), { hostOnly: true }),
      tickMatch: () => void runLocalAction(() => useGameStore.getState().tickMatch(), { hostOnly: true }),
      togglePause: () => void runLocalAction(() => useGameStore.getState().togglePause(), { hostOnly: true }),
      changeMatchFormation: (side, formationId) =>
        void runLocalAction(() => useGameStore.getState().changeMatchFormation(side, formationId), { side }),
      applySubstitutions: (side, pairs: SubstitutionPair[]) =>
        void runLocalAction(() => useGameStore.getState().applySubstitutions(side, pairs), { side }),
      replay: () => void runLocalAction(() => useGameStore.getState().replay(), { hostOnly: true }),
    }),
    [
      canActDraft,
      canControl,
      createOnlineGame,
      isHost,
      isOnline,
      joinOnlineGame,
      leaveOnlineGame,
      runLocalAction,
      session,
    ],
  );

  return <GameSessionContext.Provider value={api}>{children}</GameSessionContext.Provider>;
}

export const useGameSession = () => {
  const context = useContext(GameSessionContext);
  if (!context) throw new Error("useGameSession doit être utilisé dans GameSessionProvider.");
  return context;
};
