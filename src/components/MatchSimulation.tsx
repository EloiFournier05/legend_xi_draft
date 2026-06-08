import { Pause, Play } from "lucide-react";
import { useEffect } from "react";
import type { MatchState, TeamSide } from "../types/game";
import { MatchStats } from "./MatchStats";
import { SquadPitch } from "./SquadPitch";
import { SubstitutionPanel } from "./SubstitutionPanel";
import { Timeline } from "./Timeline";

interface MatchSimulationProps {
  match: MatchState;
  canTick?: boolean;
  canPause?: boolean;
  canControlSide?: (side: TeamSide) => boolean;
  onTick: () => void;
  onPause: () => void;
  onSubstitute: (side: TeamSide, pairs: { outInstanceId: string; inInstanceId: string }[]) => void;
  onFormationChange: (side: TeamSide, formationId: string) => void;
}

export function MatchSimulation({ match, canTick = true, canPause = true, canControlSide = () => true, onTick, onPause, onSubstitute, onFormationChange }: MatchSimulationProps) {
  useEffect(() => {
    if (!canTick || match.isPaused || match.isFinished) return;
    const interval = window.setInterval(onTick, 1000);
    return () => window.clearInterval(interval);
  }, [canTick, match.isPaused, match.isFinished, onTick]);

  const team1 = match.teams.player1;
  const team2 = match.teams.player2;
  const progress = Math.min(100, (match.minute / 90) * 100);

  return (
    <div className="grid gap-4">
      <section className="card-frame rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase text-neon">Minute {match.minute}'</p>
            <h1 className="font-display text-4xl font-black">
              {team1.stats.goals} - {team2.stats.goals}
            </h1>
            <p className="text-sm text-slate-300">
              {team1.name} vs {team2.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onPause}
            disabled={!canPause}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-4 py-3 font-bold"
          >
            {match.isPaused ? <Play size={18} /> : <Pause size={18} />}
            {match.isPaused ? "Reprendre" : "Pause"}
          </button>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-neon" style={{ width: `${progress}%` }} />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px_1fr]">
        <SquadPitch title={team1.name} formation={team1.formationId} starters={team1.starters} bench={team1.bench} compact />
        <div className="grid content-start gap-4">
          <MatchStats team1={team1} team2={team2} />
          <Timeline events={match.timeline} />
        </div>
        <SquadPitch title={team2.name} formation={team2.formationId} starters={team2.starters} bench={team2.bench} compact />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SubstitutionPanel team={team1} disabled={!canControlSide("player1")} onApply={onSubstitute} onFormationChange={onFormationChange} />
        <SubstitutionPanel team={team2} disabled={!canControlSide("player2")} onApply={onSubstitute} onFormationChange={onFormationChange} />
      </div>
    </div>
  );
}
