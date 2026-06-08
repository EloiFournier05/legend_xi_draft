import { createClient, type RealtimeChannel, type SupabaseClient } from "@supabase/supabase-js";
import type { GameState, TeamSide } from "../types/game";

export interface OnlineGameRecord {
  id: string;
  code: string;
  status: string;
  game_state: GameState;
  created_at: string;
  updated_at: string;
}

export interface JoinedOnlineGame {
  gameId: string;
  code: string;
  role: TeamSide;
  gameState: GameState;
}

let client: SupabaseClient | undefined;

const getSupabase = () => {
  if (client) return client;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Variables Supabase manquantes. Configure VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans Vercel.");
  }
  client = createClient(supabaseUrl, supabaseAnonKey);
  return client;
};

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const createShortCode = () =>
  Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");

export const createShareUrl = (code: string) => {
  const url = new URL(window.location.href);
  url.searchParams.set("join", code);
  return url.toString();
};

export const onlineGameSession = {
  createShareUrl,

  async createGame(gameState: GameState, clientId: string): Promise<JoinedOnlineGame> {
    const supabase = getSupabase();
    let attempt = 0;

    while (attempt < 5) {
      const code = createShortCode();
      const state: GameState = {
        ...gameState,
        online: {
          ...gameState.online,
          hostClientId: clientId,
          player2ClientId: undefined,
          simulationHost: "player1",
        },
      };

      const { data, error } = await supabase
        .from("games")
        .insert({
          code,
          status: "setup",
          game_state: state,
        })
        .select("id, code, game_state")
        .single();

      if (!error && data) {
        return {
          gameId: data.id,
          code: data.code,
          role: "player1",
          gameState: data.game_state as GameState,
        };
      }

      if (error?.code !== "23505") throw error;
      attempt += 1;
    }

    throw new Error("Impossible de générer un code de partie unique.");
  },

  async joinGame(codeInput: string, clientId: string): Promise<JoinedOnlineGame> {
    const supabase = getSupabase();
    const code = codeInput.trim().toUpperCase();
    const { data, error } = await supabase.from("games").select("id, code, game_state").eq("code", code).single();

    if (error || !data) throw new Error("Partie introuvable.");

    const gameState = data.game_state as GameState;
    const online = gameState.online ?? { simulationHost: "player1" as const };

    if (online.hostClientId === clientId) {
      return { gameId: data.id, code: data.code, role: "player1", gameState };
    }

    if (online.player2ClientId && online.player2ClientId !== clientId) {
      throw new Error("La place Joueur 2 est déjà prise dans cette partie.");
    }

    const claimedState: GameState = {
      ...gameState,
      online: {
        ...online,
        player2ClientId: clientId,
      },
    };

    const { data: updated, error: updateError } = await supabase
      .from("games")
      .update({
        game_state: claimedState,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .is("game_state->online->>player2ClientId", null)
      .select("id, code, game_state")
      .maybeSingle();

    if (updateError) throw updateError;
    if (!updated) throw new Error("La place Joueur 2 vient d'être prise par quelqu'un d'autre.");

    return {
      gameId: updated.id,
      code: updated.code,
      role: "player2",
      gameState: updated.game_state as GameState,
    };
  },

  async saveState(gameId: string, gameState: GameState) {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("games")
      .update({
        status: gameState.screen,
        game_state: gameState,
        updated_at: new Date().toISOString(),
      })
      .eq("id", gameId);

    if (error) throw error;
  },

  subscribe(
    gameId: string,
    onChange: (gameState: GameState) => void,
    onStatus: (status: "connected" | "disconnected" | "error", message?: string) => void,
  ): RealtimeChannel {
    const supabase = getSupabase();
    return supabase
      .channel(`game:${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const next = payload.new as OnlineGameRecord;
          onChange(next.game_state);
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") onStatus("connected");
        if (status === "CLOSED") onStatus("disconnected", "Connexion realtime fermée.");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") onStatus("error", `Realtime indisponible : ${status}`);
      });
  },

  unsubscribe(channel?: RealtimeChannel) {
    if (!channel) return;
    void getSupabase().removeChannel(channel);
  },
};
