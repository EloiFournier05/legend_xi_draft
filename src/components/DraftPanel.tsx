import { RotateCcw, ShieldCheck } from "lucide-react";
import { nextDestinationOptions } from "../utils/draft";
import type { DraftState, PlayerState, TeamSide } from "../types/game";
import { PlayerCard } from "./PlayerCard";

interface DraftPanelProps {
  draft: DraftState;
  players: Record<TeamSide, PlayerState>;
  canAct?: boolean;
  waitingLabel?: string;
  onSelectPlayer: (playerId?: string) => void;
  onSelectDestination: (destination?: string) => void;
  onReroll: () => void;
  onConfirm: () => void;
}

export function DraftPanel({ draft, players, canAct = true, waitingLabel, onSelectPlayer, onSelectDestination, onReroll, onConfirm }: DraftPanelProps) {
  const active = players[draft.activePlayer];
  const currentSquad = draft.currentSquad;
  const selectedPlayer = currentSquad?.players.find((player) => player.id === draft.selectedPlayerId);
  const destinations = nextDestinationOptions(active);
  const canConfirm = Boolean(selectedPlayer && draft.selectedDestination);

  return (
    <section className="card-frame rounded-lg p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-neon">Tour {draft.turnNumber}</p>
          <h2 className="font-display text-2xl font-black">{active.name} drafte</h2>
          <p className="text-sm text-slate-300">Rerolls restants : {active.rerollsLeft}</p>
        </div>
        <button
          type="button"
          onClick={onReroll}
          disabled={!canAct || !currentSquad || Boolean(draft.selectedPlayerId) || active.rerollsLeft <= 0}
          className="inline-flex items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-4 py-3 font-bold text-gold disabled:opacity-40"
          title="Changer l'effectif tiré"
        >
          <RotateCcw size={18} />
          Reroll
        </button>
      </div>
      {!canAct && waitingLabel ? (
        <div className="mb-4 rounded-lg border border-white/10 bg-black/25 p-3 text-sm font-bold text-slate-300">{waitingLabel}</div>
      ) : null}

      {currentSquad ? (
        <div className="mb-4 rounded-lg border border-white/10 bg-black/20 p-4">
          <p className="text-sm text-slate-300">Effectif tiré</p>
          <h3 className="font-display text-2xl font-black text-gold">{currentSquad.displayName}</h3>
          <p className="text-sm text-slate-300">{currentSquad.country}</p>
        </div>
      ) : null}

      <div className="grid gap-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-bold">Choisir un joueur</h3>
            <span className="text-xs text-slate-400">Notes cachées</span>
          </div>
          <div className="thin-scrollbar grid max-h-[340px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {currentSquad?.players.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                compact
                selected={draft.selectedPlayerId === player.id}
                disabled={!canAct}
                onClick={() => onSelectPlayer(player.id)}
              />
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 font-bold">Choisir un slot</h3>
          <div className="grid grid-cols-2 gap-2">
            {destinations.map((destination) => (
              <button
                type="button"
                key={destination.id}
                disabled={!canAct}
                onClick={() => onSelectDestination(destination.id)}
                className={[
                  "rounded-lg border px-3 py-3 text-left text-sm font-bold",
                  draft.selectedDestination === destination.id
                    ? "border-neon bg-neon/15 text-neon"
                    : "border-white/10 bg-black/20 text-slate-200",
                ].join(" ")}
              >
                {destination.label}
                <span className="block text-xs font-normal text-slate-400">{destination.group}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        disabled={!canAct || !canConfirm}
        onClick={onConfirm}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-neon px-5 py-4 font-black text-night disabled:opacity-40"
      >
        <ShieldCheck size={20} />
        Valider le pick
      </button>
    </section>
  );
}
