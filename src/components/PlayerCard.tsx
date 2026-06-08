import type { DraftedPlayer, Player } from "../types/game";
import { formatShortPlayerName } from "../utils/playerNames";

interface PlayerCardProps {
  player?: Player;
  pick?: DraftedPlayer;
  compact?: boolean;
  selected?: boolean;
  disabled?: boolean;
  slotLabel?: string;
  onClick?: () => void;
}

const primaryPosition = (player?: Player) => player?.positions[0] ?? "VIDE";

export function PlayerCard({ player, pick, compact, selected, disabled, slotLabel, onClick }: PlayerCardProps) {
  const shownPlayer = player ?? pick?.player;
  const isEmpty = !shownPlayer;
  const displayName = shownPlayer && pick ? formatShortPlayerName(shownPlayer.name) : shownPlayer?.name;

  return (
    <button
      type="button"
      disabled={disabled || !onClick}
      onClick={onClick}
      className={[
        "player-card flex min-h-[88px] w-full flex-col justify-between rounded-lg p-3 text-left",
        compact ? "min-h-[66px] p-2" : "",
        selected ? "border-neon shadow-[0_0_0_2px_rgba(75,240,195,0.28)]" : "",
        disabled ? "opacity-50" : "",
        !onClick ? "cursor-default" : "hover:border-neon/80",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="rounded bg-black/30 px-2 py-1 text-xs font-bold text-gold">{slotLabel ?? primaryPosition(shownPlayer)}</span>
        {pick?.redCard ? <span className="rounded bg-red-500 px-2 py-1 text-xs font-black text-white">ROUGE</span> : null}
      </div>
      <div>
        <p className={compact ? "text-sm font-black leading-tight" : "text-base font-black leading-tight"}>
          {isEmpty ? "Slot libre" : displayName}
        </p>
        {pick ? <p className="mt-1 text-xs text-slate-300">{pick.sourceDisplayName}</p> : null}
        {shownPlayer?.legendTag ? <p className="mt-1 text-xs font-semibold text-neon">{shownPlayer.legendTag}</p> : null}
      </div>
    </button>
  );
}
