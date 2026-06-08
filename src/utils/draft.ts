import { historicalSquads } from "../data/squads";
import { extraHistoricalSquads } from "../data/extraSquads";
import type { DraftedPlayer, HistoricalSquad, Player, PlayerState, TeamSide } from "../types/game";

const draftSquads = [...historicalSquads, ...extraHistoricalSquads];

export const randomSquad = (avoidSquadId?: string): HistoricalSquad => {
  const pool = draftSquads.length > 1 ? draftSquads.filter((squad) => squad.id !== avoidSquadId) : draftSquads;
  return pool[Math.floor(Math.random() * pool.length)];
};

export const createDraftedPlayer = (player: Player, squad: HistoricalSquad, team: TeamSide): DraftedPlayer => ({
  instanceId: `${team}-${squad.id}-${player.id}-${crypto.randomUUID()}`,
  player,
  sourceSquadId: squad.id,
  sourceDisplayName: squad.displayName,
  sourceClubName: squad.clubName,
  sourceCountry: squad.country,
});

export const countPicks = (player: PlayerState): number =>
  player.starters.filter((slot) => slot.pick).length + player.bench.length;

export const isTeamComplete = (player: PlayerState): boolean =>
  player.starters.every((slot) => slot.pick) && player.bench.length >= 5;

export const isDraftComplete = (players: Record<TeamSide, PlayerState>): boolean =>
  isTeamComplete(players.player1) && isTeamComplete(players.player2);

export const nextDestinationOptions = (player: PlayerState) => [
  ...player.starters
    .filter((starter) => !starter.pick)
    .map((starter) => ({
      id: starter.slot.id,
      label: `${starter.slot.label} titulaire`,
      group: "XI",
    })),
  ...Array.from({ length: Math.max(0, 5 - player.bench.length) }, (_, index) => ({
    id: `bench-${player.bench.length + index}`,
    label: `Banc ${player.bench.length + index + 1}`,
    group: "Banc",
  })),
];

export const otherSide = (side: TeamSide): TeamSide => (side === "player1" ? "player2" : "player1");
