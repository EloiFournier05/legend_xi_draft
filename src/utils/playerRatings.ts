import type { DraftedPlayer, MatchTeamState } from "../types/game";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const isDefender = (position: string) => ["LB", "CB", "RB", "LWB", "RWB", "CDM"].includes(position);
const isMidfielder = (position: string) => ["CDM", "CM", "CAM", "LM", "RM"].includes(position);
const isForward = (position: string) => ["LW", "RW", "CF", "ST"].includes(position);

export const calculatePlayerMatchRating = (pick: DraftedPlayer, team: MatchTeamState, opponent: MatchTeamState, minute: number) => {
  if (pick.redCard) return 3;

  const attrs = pick.player.hiddenAttributes;
  const primary = pick.player.positions[0];
  const goals = team.stats.scorers[pick.player.name] ?? 0;
  const assists = team.stats.assists[pick.player.name] ?? 0;
  const minutesPlayed = Math.max(1, minute - (pick.enteredAtMinute ?? 0));
  const staminaDip = Math.min(0.35, (minutesPlayed / 90) * (1.05 - attrs.physical / 135));

  let rating = 6.1;
  rating += (attrs.overall - 80) * 0.025;
  rating += (attrs.mentality - 78) * 0.01;
  rating -= staminaDip;

  rating += goals * (primary === "GK" ? 0.35 : isDefender(primary) ? 0.95 : 1.15);
  rating += assists * (isMidfielder(primary) ? 0.7 : 0.55);
  rating += team.stats.goals * (isForward(primary) ? 0.08 : isMidfielder(primary) ? 0.06 : 0.03);
  rating -= opponent.stats.goals * (primary === "GK" ? 0.28 : isDefender(primary) ? 0.18 : 0.05);

  if (primary === "GK") {
    rating += team.stats.saves * 0.11;
    rating += opponent.stats.shotsOnTarget > 0 ? Math.min(0.35, team.stats.saves / opponent.stats.shotsOnTarget) : 0;
  } else if (isDefender(primary)) {
    rating += Math.max(0, team.stats.possession - 50) * 0.006;
    rating += Math.max(0, 6 - opponent.stats.shotsOnTarget) * 0.035;
  } else if (isMidfielder(primary)) {
    rating += Math.max(0, team.stats.possession - 45) * 0.008;
    rating += team.stats.bigChances * 0.035;
  } else if (isForward(primary)) {
    rating += team.stats.xg * 0.08;
    rating += team.stats.bigChances * 0.045;
  }

  if (pick.player.legendTag === "Captain" || pick.player.legendTag === "Big Game Player") rating += 0.08;
  if (pick.player.legendTag === "Ballon d'Or") rating += 0.12;

  return Number(clamp(rating, 3, 10).toFixed(1));
};
