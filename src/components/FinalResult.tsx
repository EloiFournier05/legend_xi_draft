import type { MatchState } from "../types/game";
import { MatchStats } from "./MatchStats";
import { Timeline } from "./Timeline";

interface FinalResultProps {
  match: MatchState;
  onReplay: () => void;
}

const topPerformer = (match: MatchState) => {
  const all = [...match.teams.player1.starters, ...match.teams.player2.starters]
    .map((slot) => slot.pick)
    .filter(Boolean)
    .map((pick) => pick!);
  return all.sort((a, b) => {
    const aa = a.player.hiddenAttributes;
    const bb = b.player.hiddenAttributes;
    const scoreA = aa.overall + aa.mentality * 0.2 + aa.attack * 0.12 + aa.defense * 0.08;
    const scoreB = bb.overall + bb.mentality * 0.2 + bb.attack * 0.12 + bb.defense * 0.08;
    return scoreB - scoreA;
  })[0];
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
      .map(([name, count]) => `${name} (${count})`)
      .join(", ") || "Aucun";

  return (
    <div className="grid gap-4">
      <section className="card-frame rounded-lg p-6 text-center">
        <p className="text-sm font-semibold uppercase text-neon">Résultat final</p>
        <h1 className="font-display text-5xl font-black text-gold">
          {team1.stats.goals} - {team2.stats.goals}
        </h1>
        <p className="mt-2 text-xl font-bold">{winner}</p>
        <p className="mt-2 text-slate-300">Homme du match : {motm?.player.name ?? "non attribué"}</p>
        <button type="button" onClick={onReplay} className="mt-5 rounded-lg bg-neon px-6 py-4 font-black text-night">
          Rejouer
        </button>
      </section>
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
