import type { GameState } from "../types/game";

export interface GameSessionAdapter {
  load(): GameState | undefined;
  save(state: GameState): void;
  clear(): void;
}

const STORAGE_KEY = "legend-xi-draft-local-session";

export const localGameSession: GameSessionAdapter = {
  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GameState) : undefined;
  },
  save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },
  clear() {
    localStorage.removeItem(STORAGE_KEY);
  },
};
