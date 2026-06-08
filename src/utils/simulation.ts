import { calculateStrength } from "./teamStrength";
import type { DraftedPlayer, MatchState, MatchTeamState, TeamSide, TimelineEvent } from "../types/game";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const eventId = () => crypto.randomUUID();
const opponent = (side: TeamSide): TeamSide => (side === "player1" ? "player2" : "player1");

const weightedPick = (players: DraftedPlayer[], score: (player: DraftedPlayer) => number) => {
  const weighted = players.map((player) => ({ player, weight: Math.max(1, score(player)) }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * total;
  for (const item of weighted) {
    cursor -= item.weight;
    if (cursor <= 0) return item.player;
  }
  return weighted[0]?.player;
};

const activePlayers = (team: MatchTeamState) =>
  team.starters.map((slot) => slot.pick).filter((pick): pick is DraftedPlayer => Boolean(pick && !pick.redCard));

const scorer = (team: MatchTeamState) =>
  weightedPick(activePlayers(team), (pick) => {
    const attrs = pick.player.hiddenAttributes;
    const positionBonus = ["ST", "CF"].includes(pick.player.positions[0]) ? 28 : ["LW", "RW", "CAM"].includes(pick.player.positions[0]) ? 16 : 3;
    return attrs.finishing * 1.25 + attrs.attack + positionBonus;
  });

const assister = (team: MatchTeamState, scorerId?: string) =>
  weightedPick(
    activePlayers(team).filter((pick) => pick.instanceId !== scorerId),
    (pick) => pick.player.hiddenAttributes.creativity + pick.player.hiddenAttributes.passing + (["CM", "CAM", "LW", "RW"].includes(pick.player.positions[0]) ? 18 : 0),
  );

const cardedPlayer = (team: MatchTeamState) =>
  weightedPick(activePlayers(team), (pick) => 105 - pick.player.hiddenAttributes.discipline + (["CB", "CDM"].includes(pick.player.positions[0]) ? 12 : 0));

const pushEvent = (match: MatchState, event: Omit<TimelineEvent, "id">) => {
  match.timeline = [{ ...event, id: eventId() }, ...match.timeline].slice(0, 120);
};

const addShot = (team: MatchTeamState, xg: number, onTarget: boolean) => {
  team.stats.shots += 1;
  team.stats.xg = Number((team.stats.xg + xg).toFixed(2));
  if (onTarget) team.stats.shotsOnTarget += 1;
};

const updatePossession = (match: MatchState) => {
  const s1 = calculateStrength(match.teams.player1, match.minute);
  const s2 = calculateStrength(match.teams.player2, match.minute);
  const base = 50 + (s1.midfield + s1.creativity - s2.midfield - s2.creativity) * 0.22 + match.momentum * 0.04;
  match.teams.player1.stats.possession = Math.round(clamp(base + (Math.random() - 0.5) * 5, 35, 65));
  match.teams.player2.stats.possession = 100 - match.teams.player1.stats.possession;
};

export const simulateMinute = (match: MatchState): MatchState => {
  if (match.isPaused || match.isFinished) return match;

  const next: MatchState = structuredClone(match);
  next.minute = Math.min(90, next.minute + 1);
  updatePossession(next);

  const p1 = calculateStrength(next.teams.player1, next.minute);
  const p2 = calculateStrength(next.teams.player2, next.minute);
  const p1Weight = p1.total * 0.8 + Math.random() * 20 + next.momentum * 0.08;
  const p2Weight = p2.total * 0.8 + Math.random() * 20 - next.momentum * 0.08;
  const attackingSide: TeamSide = Math.random() * (p1Weight + p2Weight) < p1Weight ? "player1" : "player2";
  const defendingSide = opponent(attackingSide);
  const attack = attackingSide === "player1" ? p1 : p2;
  const defense = attackingSide === "player1" ? p2 : p1;
  const attackingTeam = next.teams[attackingSide];
  const defendingTeam = next.teams[defendingSide];

  const eventGap = next.minute - next.lastEventSecond;
  const shouldEvent = eventGap >= 2 || Math.random() < 0.36;
  if (shouldEvent) {
    next.lastEventSecond = next.minute;
    const pressure = attack.attack + attack.creativity + attack.finishing - defense.defense - defense.goalkeeping * 0.7;
    const goalChance = clamp(0.035 + pressure / 4200 + Math.random() * 0.035, 0.018, 0.16);
    const bigChance = clamp(0.18 + pressure / 1800, 0.08, 0.34);
    const cardChance = clamp((105 - attackingTeam.stats.possession + (100 - attack.discipline)) / 3800, 0.006, 0.035);

    if (Math.random() < goalChance) {
      const finisher = scorer(attackingTeam);
      const creator = assister(attackingTeam, finisher?.instanceId);
      const xg = clamp(0.18 + Math.random() * 0.42 + (attack.finishing - defense.goalkeeping) / 500, 0.08, 0.78);
      const scorerName = finisher?.player.name ?? "un attaquant";
      const assisterName = creator?.player.name;
      addShot(attackingTeam, xg, true);
      attackingTeam.stats.goals += 1;
      attackingTeam.stats.scorers[scorerName] = (attackingTeam.stats.scorers[scorerName] ?? 0) + 1;
      if (assisterName) attackingTeam.stats.assists[assisterName] = (attackingTeam.stats.assists[assisterName] ?? 0) + 1;
      next.momentum += attackingSide === "player1" ? 8 : -8;
      pushEvent(next, {
        minute: next.minute,
        type: "goal",
        team: attackingSide,
        text: `${next.minute}' But de ${scorerName}, passe décisive de ${assisterName ?? "un coéquipier"}.`,
      });
    } else if (Math.random() < bigChance) {
      const finisher = scorer(attackingTeam);
      const xg = clamp(0.09 + Math.random() * 0.28, 0.04, 0.44);
      const onTarget = Math.random() < 0.55;
      addShot(attackingTeam, xg, onTarget);
      pushEvent(next, {
        minute: next.minute,
        type: "chance",
        team: attackingSide,
        text: `${next.minute}' Énorme occasion pour ${finisher?.player.name ?? attackingTeam.name}, mais ${onTarget ? "le gardien s'interpose" : "la frappe passe à côté"}.`,
      });
    } else if (Math.random() < cardChance) {
      const unluckyTeam = Math.random() < 0.55 ? defendingTeam : attackingTeam;
      const unluckySide = unluckyTeam.side;
      const sentOff = cardedPlayer(unluckyTeam);
      if (sentOff && unluckyTeam.stats.redCards < 2) {
        unluckyTeam.starters = unluckyTeam.starters.map((slot) =>
          slot.pick?.instanceId === sentOff.instanceId ? { ...slot, pick: { ...slot.pick, redCard: true } } : slot,
        );
        unluckyTeam.stats.redCards += 1;
        next.momentum += unluckySide === "player1" ? -10 : 10;
        pushEvent(next, {
          minute: next.minute,
          type: "card",
          team: unluckySide,
          text: `${next.minute}' Carton rouge pour ${sentOff.player.name}. ${unluckyTeam.name} va devoir souffrir.`,
        });
      }
    } else if (Math.random() < 0.42) {
      pushEvent(next, {
        minute: next.minute,
        type: "defense",
        team: defendingSide,
        text: `${next.minute}' Action défensive décisive de ${defendingTeam.name}, le danger est écarté.`,
      });
    } else {
      pushEvent(next, {
        minute: next.minute,
        type: "calm",
        team: attackingSide,
        text: `${next.minute}' ${attackingTeam.name} fait circuler et cherche l'ouverture.`,
      });
    }
  }

  next.momentum = clamp(next.momentum * 0.96 + (Math.random() - 0.5) * 3, -35, 35);
  if (next.minute >= 90) next.isFinished = true;
  return next;
};
