import { getFormation } from "../data/formations";
import type { DraftedPlayer, FormationSlot, MatchTeamState, PlayerState, StarterSlot, StrengthBreakdown } from "../types/game";

const sameGroup = (expected: string, actual: string) => {
  const groups = [
    ["LB", "CB", "RB", "LWB", "RWB"],
    ["CDM", "CM", "CAM", "LM", "RM"],
    ["LW", "RW", "CF", "ST"],
  ];
  return groups.some((group) => group.includes(expected) && group.includes(actual));
};

export const positionFit = (pick: DraftedPlayer, slot: FormationSlot): number => {
  if (pick.player.positions.includes(slot.label)) return 1;
  if (slot.label === "GK" || pick.player.positions[0] === "GK") return 0.42;
  if (sameGroup(slot.label, pick.player.positions[0])) return 0.86;
  return 0.64;
};

const average = (values: number[], fallback = 70) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;

const activeStarters = (slots: StarterSlot[]) => slots.filter((slot) => slot.pick && !slot.pick.redCard);

const fatigueMultiplier = (minute: number, physical: number, enteredAtMinute = 0) => {
  const minutesPlayed = Math.max(0, minute - enteredAtMinute);
  const fatigue = Math.min(0.24, (minutesPlayed / 90) * (1.04 - physical / 130));
  return 1 - fatigue;
};

export const calculateStrength = (team: PlayerState | MatchTeamState, minute = 0): StrengthBreakdown => {
  const starters = activeStarters(team.starters);
  const formation = getFormation(team.formationId);
  const weights = formation.style === "offensive" ? { atk: 1.05, def: 0.96 } : formation.style === "defensive" ? { atk: 0.96, def: 1.06 } : { atk: 1, def: 1 };

  const fittedRatings = starters.map((starter) => {
    const pick = starter.pick!;
    const attrs = pick.player.hiddenAttributes;
    const fatigue = fatigueMultiplier(minute, attrs.physical, pick.enteredAtMinute);
    return attrs.overall * positionFit(pick, starter.slot) * fatigue;
  });

  const attack = average(
    starters
      .filter((starter) => starter.slot.line === "attaque" || ["LW", "RW", "ST", "CF", "CAM"].includes(starter.pick!.player.positions[0]))
      .map((starter) => starter.pick!.player.hiddenAttributes.attack * positionFit(starter.pick!, starter.slot)),
  );
  const midfield = average(
    starters
      .filter((starter) => starter.slot.line === "milieu")
      .map((starter) => (starter.pick!.player.hiddenAttributes.passing + starter.pick!.player.hiddenAttributes.pressing) / 2),
  );
  const defense = average(
    starters
      .filter((starter) => starter.slot.line === "defense")
      .map((starter) => starter.pick!.player.hiddenAttributes.defense * positionFit(starter.pick!, starter.slot)),
  );
  const goalkeeping = average(
    starters
      .filter((starter) => starter.slot.label === "GK")
      .map((starter) => starter.pick!.player.hiddenAttributes.goalkeeping * positionFit(starter.pick!, starter.slot)),
    58,
  );
  const creativity = average(starters.map((starter) => starter.pick!.player.hiddenAttributes.creativity), 65);
  const finishing = average(starters.map((starter) => starter.pick!.player.hiddenAttributes.finishing), 65);
  const discipline = average(starters.map((starter) => starter.pick!.player.hiddenAttributes.discipline), 65);
  const fit = average(starters.map((starter) => positionFit(starter.pick!, starter.slot)), 0.7);

  const squadCounts = new Map<string, number>();
  const countryCounts = new Map<string, number>();
  starters.forEach((starter) => {
    const pick = starter.pick!;
    squadCounts.set(pick.sourceSquadId, (squadCounts.get(pick.sourceSquadId) ?? 0) + 1);
    countryCounts.set(pick.sourceCountry, (countryCounts.get(pick.sourceCountry) ?? 0) + 1);
  });
  const strongestSquadStack = Math.max(0, ...squadCounts.values());
  const strongestCountryStack = Math.max(0, ...countryCounts.values());
  const tagBonus = starters.reduce((bonus, starter) => {
    const tag = starter.pick!.player.legendTag;
    if (tag === "Ballon d'Or") return bonus + 1.6;
    if (tag === "Captain" || tag === "Big Game Player") return bonus + 1.1;
    if (tag === "Maestro" || tag === "Engine" || tag === "Wall") return bonus + 0.7;
    return bonus;
  }, 0);
  const synergy = Math.min(8, Math.max(0, strongestSquadStack - 2) * 1.8 + Math.max(0, strongestCountryStack - 3) * 0.8 + tagBonus);
  const redCardPenalty = Math.max(0, 11 - starters.length) * 7.5;

  const total =
    average(fittedRatings) * 0.34 +
    attack * weights.atk * 0.16 +
    midfield * 0.14 +
    defense * weights.def * 0.14 +
    goalkeeping * 0.1 +
    creativity * 0.05 +
    finishing * 0.04 +
    discipline * 0.03 +
    synergy -
    redCardPenalty;

  return {
    total: Math.max(35, total),
    attack,
    midfield,
    defense,
    goalkeeping,
    creativity,
    finishing,
    discipline,
    positionFit: fit,
    synergy,
    redCardPenalty,
  };
};

export const assignPlayersToFormation = (players: DraftedPlayer[], formationId: string): StarterSlot[] => {
  const slots: StarterSlot[] = getFormation(formationId).slots.map((slot) => ({ slot }));
  const remaining = [...players];

  slots.forEach((starter) => {
    const exactIndex = remaining.findIndex((pick) => pick.player.positions.includes(starter.slot.label));
    const groupIndex = exactIndex >= 0 ? exactIndex : remaining.findIndex((pick) => sameGroup(starter.slot.label, pick.player.positions[0]));
    const chosenIndex = groupIndex >= 0 ? groupIndex : 0;
    const [pick] = remaining.splice(chosenIndex, 1);
    starter.pick = pick ? { ...pick, assignedSlotId: starter.slot.id } : undefined;
  });

  return slots;
};
