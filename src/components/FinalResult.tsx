import type { MatchState } from "../types/game";
import { calculatePlayerMatchRating } from "../utils/playerRatings";
import { formatShortPlayerName } from "../utils/playerNames";
import { FinalRatingsPitch } from "./FinalRatingsPitch";
import { MatchStats } from "./MatchStats";
import { Timeline } from "./Timeline";

interface FinalResultProps {
  match: MatchState;
  onReplay: () => void;
}

const topPerformer = (match: MatchState) => {
  const all = (["player1", "player2"] as const).flatMap((side) => {
    const team = match.teams[side];
    const opponent = match.teams[side === "player1" ? "player2" : "player1"];
    return team.starters
      .map((slot) => slot.pick)
      .filter(Boolean)
      .map((pick) => ({
        pick: pick!,
        rating: calculatePlayerMatchRating(pick!, team, opponent, 90),
      }));
  });
  return all.sort((a, b) => b.rating - a.rating)[0]?.pick;
};

export function FinalResult({ match, onReplay }: FinalResultProps) {
  const team1 = match.teams.player1;
  const team2 = match.teams.player2;
  const winner =
    team1.stats.goals === team2.stats.goals ? "Match nul" : team1.stats.goals > team2.stats.goals ? `${team1.name} gagne` : `${team2.name} gagne`;
  const motm = topPerformer(match);
  const formatLeaders = (items: Record<string, number>) =>
    Object.entries(items)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `${formatShortPlayerName(name)} (${count})`)
      .join(", ") || "Aucun";

  return (
    <div className="grid gap-4">
      <section className="card-frame rounded-lg p-6 text-center">
        <p className="text-sm font-semibold uppercase text-neon">Résultat final</p>
        <h1 className="font-display text-5xl font-black text-gold">
          {team1.stats.goals} - {team2.stats.goals}
        </h1>
        <p className="mt-2 text-xl font-bold">{winner}</p>
        <p className="mt-2 text-slate-300">Homme du match : {motm ? formatShortPlayerName(motm.player.name) : "non attribué"}</p>
        <button type="button" onClick={onReplay} className="mt-5 rounded-lg bg-neon px-6 py-4 font-black text-night">
          Rejouer
        </button>
      </section>
      <FinalRatingsPitch match={match} />
      <MatchStats team1={team1} team2={team2} />
      <section className="card-frame grid gap-4 rounded-lg p-4 md:grid-cols-2">
        <div>
          <h2 className="font-display text-xl font-black text-neon">{team1.name}</h2>
          <p className="mt-2 text-sm text-slate-300">Buteurs : {formatLeaders(team1.stats.scorers)}</p>
          <p className="mt-1 text-sm text-slate-300">Passeurs : {formatLeaders(team1.stats.assists)}</p>
        </div>
        <div>
          <h2 className="font-display text-xl font-black text-gold">{team2.name}</h2>
          <p className="mt-2 text-sm text-slate-300">Buteurs : {formatLeaders(team2.stats.scorers)}</p>
          <p className="mt-1 text-sm text-slate-300">Passeurs : {formatLeaders(team2.stats.assists)}</p>
        </div>
      </section>
      <Timeline events={match.timeline} full />
    </div>
  );
}
