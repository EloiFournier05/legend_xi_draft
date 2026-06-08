import type { StarterSlot } from "../types/game";
import { PlayerCard } from "./PlayerCard";

interface SquadPitchProps {
  title: string;
  formation: string;
  starters: StarterSlot[];
  bench?: { instanceId: string; player: { name: string; positions: string[] }; sourceDisplayName: string; redCard?: boolean }[];
  selectableDestinations?: string[];
  selectedDestination?: string;
  onSelectDestination?: (destination: string) => void;
  compact?: boolean;
}

export function SquadPitch({
  title,
  formation,
  starters,
  bench = [],
  selectableDestinations = [],
  selectedDestination,
  onSelectDestination,
  compact,
}: SquadPitchProps) {
  return (
    <section className="card-frame rounded-lg p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-black">{title}</h2>
          <p className="text-sm text-slate-300">{formation}</p>
        </div>
        <span className="rounded bg-black/30 px-2 py-1 text-xs font-bold text-gold">
          {starters.filter((slot) => slot.pick).length}/11 + {bench.length}/5
        </span>
      </div>
      <div className="pitch-lines relative h-[520px] overflow-hidden rounded-lg border border-white/10 md:h-[580px]">
        {starters.map((starter) => {
          const selectable = selectableDestinations.includes(starter.slot.id);
          const visiblePick = starter.pick?.redCard ? undefined : starter.pick;
          return (
            <div
              key={starter.slot.id}
              className="pitch-slot absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${starter.slot.x}%`, top: `${starter.slot.y}%` }}
            >
              <PlayerCard
                compact={compact}
                pick={visiblePick}
                slotLabel={starter.slot.label}
                selected={selectedDestination === starter.slot.id}
                disabled={!selectable && selectableDestinations.length > 0}
                onClick={selectable && onSelectDestination ? () => onSelectDestination(starter.slot.id) : undefined}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => {
          const pick = bench[index];
          const destination = `bench-${index}`;
          const selectable = selectableDestinations.includes(destination);
          return (
            <PlayerCard
              key={destination}
              compact
              pick={pick}
              slotLabel={`B${index + 1}`}
              selected={selectedDestination === destination}
              disabled={!selectable && selectableDestinations.length > 0}
              onClick={selectable && onSelectDestination ? () => onSelectDestination(destination) : undefined}
            />
          );
        })}
      </div>
    </section>
  );
}
