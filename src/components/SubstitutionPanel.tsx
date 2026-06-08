import { useMemo, useState } from "react";
import { formations } from "../data/formations";
import type { MatchTeamState, TeamSide } from "../types/game";
import { formatShortPlayerName } from "../utils/playerNames";

interface SubstitutionPanelProps {
  team: MatchTeamState;
  disabled?: boolean;
  onApply: (side: TeamSide, pairs: { outInstanceId: string; inInstanceId: string }[]) => void;
  onFormationChange: (side: TeamSide, formationId: string) => void;
}

export function SubstitutionPanel({ team, disabled = false, onApply, onFormationChange }: SubstitutionPanelProps) {
  const [outId, setOutId] = useState("");
  const [inId, setInId] = useState("");
  const [pairs, setPairs] = useState<{ outInstanceId: string; inInstanceId: string }[]>([]);
  const activePlayers = useMemo(
    () => team.starters.map((starter) => starter.pick).filter((pick) => pick && !pick.redCard),
    [team.starters],
  );
  const remainingSubs = 5 - team.substitutionsMade;
  const remainingSessions = 3 - team.substitutionSessions;
  const canAdd = outId && inId && pairs.length < remainingSubs && !pairs.some((pair) => pair.outInstanceId === outId || pair.inInstanceId === inId);
  const canValidate = pairs.length > 0 && remainingSubs > 0 && remainingSessions > 0;

  return (
    <section className="card-frame rounded-lg p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-black">{team.name}</h3>
          <p className="text-sm text-slate-300">
            {remainingSubs} changements · {remainingSessions} sessions
          </p>
        </div>
        <select
          value={team.formationId}
          disabled={disabled}
          onChange={(event) => onFormationChange(team.side, event.target.value)}
          className="rounded-lg border border-white/10 bg-panel px-3 py-2 text-sm"
        >
          {formations.map((formation) => (
            <option key={formation.id} value={formation.id}>
              {formation.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <select disabled={disabled} value={outId} onChange={(event) => setOutId(event.target.value)} className="rounded-lg border border-white/10 bg-panel px-3 py-3">
          <option value="">Sortant</option>
          {activePlayers.map((pick) => (
            <option key={pick!.instanceId} value={pick!.instanceId}>
              {formatShortPlayerName(pick!.player.name)}
            </option>
          ))}
        </select>
        <select disabled={disabled} value={inId} onChange={(event) => setInId(event.target.value)} className="rounded-lg border border-white/10 bg-panel px-3 py-3">
          <option value="">Entrant</option>
          {team.bench.map((pick) => (
            <option key={pick.instanceId} value={pick.instanceId}>
              {formatShortPlayerName(pick.player.name)}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={disabled || !canAdd}
          onClick={() => {
            setPairs([...pairs, { outInstanceId: outId, inInstanceId: inId }]);
            setOutId("");
            setInId("");
          }}
          className="flex-1 rounded-lg border border-neon/40 bg-neon/10 px-3 py-3 font-bold text-neon disabled:opacity-40"
        >
          Ajouter
        </button>
        <button
          type="button"
          disabled={disabled || !canValidate}
          onClick={() => {
            onApply(team.side, pairs);
            setPairs([]);
          }}
          className="flex-1 rounded-lg bg-gold px-3 py-3 font-black text-night disabled:opacity-40"
        >
          Valider session
        </button>
      </div>
      {pairs.length ? (
        <ul className="mt-3 grid gap-1 text-sm text-slate-300">
          {pairs.map((pair) => {
            const outgoing = activePlayers.find((pick) => pick?.instanceId === pair.outInstanceId);
            const incoming = team.bench.find((pick) => pick.instanceId === pair.inInstanceId);
            return (
              <li key={`${pair.outInstanceId}-${pair.inInstanceId}`}>
                {incoming ? formatShortPlayerName(incoming.player.name) : ""} pour {outgoing ? formatShortPlayerName(outgoing.player.name) : ""}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
