import type { MatchTeamState } from "../types/game";

interface MatchStatsProps {
  team1: MatchTeamState;
  team2: MatchTeamState;
}

const Row = ({ label, left, right }: { label: string; left: string | number; right: string | number }) => (
  <div className="grid grid-cols-[1fr_1.4fr_1fr] items-center gap-3 border-b border-white/10 py-2 text-sm">
    <span className="font-bold text-neon">{left}</span>
    <span className="text-center text-slate-300">{label}</span>
    <span className="text-right font-bold text-gold">{right}</span>
  </div>
);

export function MatchStats({ team1, team2 }: MatchStatsProps) {
  return (
    <section className="card-frame rounded-lg p-4">
      <h2 className="mb-3 font-display text-xl font-black">Statistiques</h2>
      <Row label="Possession" left={`${team1.stats.possession}%`} right={`${team2.stats.possession}%`} />
      <Row label="Tirs" left={team1.stats.shots} right={team2.stats.shots} />
      <Row label="Tirs cadrés" left={team1.stats.shotsOnTarget} right={team2.stats.shotsOnTarget} />
      <Row label="xG" left={team1.stats.xg.toFixed(2)} right={team2.stats.xg.toFixed(2)} />
      <Row label="Rouges" left={team1.stats.redCards} right={team2.stats.redCards} />
    </section>
  );
}
