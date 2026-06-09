import { getFormation } from "../data/formations";
import type { DraftedPlayer, MatchState, MatchTeamState, StarterSlot, TeamSide } from "../types/game";
import { calculatePlayerMatchRating } from "../utils/playerRatings";
import { formatShortPlayerName } from "../utils/playerNames";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

const ratingTone = (rating: number) => {
  if (rating >= 9.5) return "bg-[#315bff] text-white";
  if (rating >= 8.5) return "bg-[#05a660] text-white";
  if (rating >= 7) return "bg-[#00c853] text-night";
  if (rating >= 6.5) return "bg-[#d6b400] text-night";
  if (rating >= 6) return "bg-[#f59e0b] text-night";
  return "bg-[#ef4444] text-white";
};

const pitchPosition = (slot: StarterSlot, side: TeamSide) => {
  const depth = (100 - slot.slot.y) / 100;
  const x = side === "player1" ? 8 + depth * 38 : 92 - depth * 38;
  const rawY = side === "player1" ? slot.slot.x : 100 - slot.slot.x;
  return {
    left: `${clamp(x, 7, 93)}%`,
    top: `${clamp(rawY, 8, 92)}%`,
  };
};

const activeStarters = (team: MatchTeamState) =>
  team.starters.filter((starter) => starter.pick && !starter.pick.redCard) as Array<StarterSlot & { pick: DraftedPlayer }>;

const teamAverage = (match: MatchState, side: TeamSide) => {
  const team = match.teams[side];
  const opponent = match.teams[side === "player1" ? "player2" : "player1"];
  const ratings = activeStarters(team).map((starter) => calculatePlayerMatchRating(starter.pick, team, opponent, 90));
  return ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0;
};

function RatingPlayer({ starter, team, opponent, side }: { starter: StarterSlot & { pick: DraftedPlayer }; team: MatchTeamState; opponent: MatchTeamState; side: TeamSide }) {
  const rating = calculatePlayerMatchRating(starter.pick, team, opponent, 90);
  const goals = team.stats.scorers[starter.pick.player.name] ?? 0;
  const assists = team.stats.assists[starter.pick.player.name] ?? 0;
  const position = pitchPosition(starter, side);

  return (
    <div className="absolute w-[72px] -translate-x-1/2 -translate-y-1/2 text-center sm:w-[86px]" style={position}>
      <div className="mx-auto grid h-9 w-9 place-items-center rounded-full border border-white/45 bg-white/90 text-[11px] font-black text-night shadow-md sm:h-11 sm:w-11 sm:text-xs">
        {initials(starter.pick.player.name)}
      </div>
      <div className="mt-[-8px] flex items-center justify-center gap-1">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-black leading-none shadow ${ratingTone(rating)}`}>{rating.toFixed(1)}</span>
        {goals ? <span className="rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-black leading-none text-gold">B{goals}</span> : null}
        {assists ? <span className="rounded bg-black/65 px-1.5 py-0.5 text-[10px] font-black leading-none text-neon">P{assists}</span> : null}
      </div>
      <p className="mx-auto mt-1 max-w-[78px] truncate text-[10px] font-black leading-tight text-white drop-shadow sm:max-w-[92px] sm:text-[11px]">
        {formatShortPlayerName(starter.pick.player.name)}
      </p>
    </div>
  );
}

function TeamHeader({ match, side }: { match: MatchState; side: TeamSide }) {
  const team = match.teams[side];
  const average = teamAverage(match, side);

  return (
    <div className={["flex min-w-0 items-center gap-2", side === "player2" ? "justify-end text-right" : ""].join(" ")}>
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-white">{team.name}</p>
        <p className="text-xs text-slate-400">{getFormation(team.formationId).name}</p>
      </div>
      <span className={`rounded px-2 py-1 text-sm font-black ${ratingTone(average)}`}>{average.toFixed(2)}</span>
    </div>
  );
}

export function FinalRatingsPitch({ match }: { match: MatchState }) {
  const team1 = match.teams.player1;
  const team2 = match.teams.player2;

  return (
    <section className="card-frame rounded-lg p-4">
      <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamHeader match={match} side="player1" />
        <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-center">
          <p className="font-display text-2xl font-black text-gold">
            {team1.stats.goals} - {team2.stats.goals}
          </p>
        </div>
        <TeamHeader match={match} side="player2" />
      </div>

      <div className="relative min-h-[470px] overflow-hidden rounded-lg border border-white/10 bg-[#2f7e5c] shadow-inner sm:min-h-[520px]">
        <div className="absolute inset-y-0 left-1/2 w-px bg-white/25" />
        <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
        <div className="absolute inset-y-[32%] left-0 w-[9%] rounded-r border-y border-r border-white/25" />
        <div className="absolute inset-y-[32%] right-0 w-[9%] rounded-l border-y border-l border-white/25" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:100%_20%]" />

        {activeStarters(team1).map((starter) => (
          <RatingPlayer key={starter.pick.instanceId} starter={starter} team={team1} opponent={team2} side="player1" />
        ))}
        {activeStarters(team2).map((starter) => (
          <RatingPlayer key={starter.pick.instanceId} starter={starter} team={team2} opponent={team1} side="player2" />
        ))}
      </div>
    </section>
  );
}
