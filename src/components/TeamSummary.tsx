import { getFormation } from "../data/formations";
import type { MatchTeamState, PlayerState } from "../types/game";
import { SquadPitch } from "./SquadPitch";

interface TeamSummaryProps {
  team: PlayerState | MatchTeamState;
}

export function TeamSummary({ team }: TeamSummaryProps) {
  return (
    <SquadPitch
      title={team.name}
      formation={getFormation(team.formationId).name}
      starters={team.starters}
      bench={team.bench}
      compact
    />
  );
}
