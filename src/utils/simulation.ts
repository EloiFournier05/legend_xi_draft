import { calculateStrength } from "./teamStrength";
import type { DraftedPlayer, MatchState, MatchStats, MatchTeamState, TeamSide, TimelineEvent } from "../types/game";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const eventId = () => crypto.randomUUID();
const opponent = (side: TeamSide): TeamSide => (side === "player1" ? "player2" : "player1");
const sample = <T>(items: T[]) => items[Math.floor(Math.random() * items.length)];

const extendedStats: Array<keyof Pick<MatchStats, "corners" | "penalties" | "fouls" | "saves" | "bigChances" | "woodwork" | "freeKicks">> = [
  "corners",
  "penalties",
  "fouls",
  "saves",
  "bigChances",
  "woodwork",
  "freeKicks",
];

const ensureStats = (team: MatchTeamState) => {
  extendedStats.forEach((key) => {
    team.stats[key] = team.stats[key] ?? 0;
  });
};

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

const setPieceTaker = (team: MatchTeamState) =>
  weightedPick(activePlayers(team), (pick) => {
    const attrs = pick.player.hiddenAttributes;
    return attrs.passing * 1.15 + attrs.creativity + attrs.technique + (["CM", "CAM", "LW", "RW", "LB", "RB"].includes(pick.player.positions[0]) ? 16 : 0);
  });

const aerialTarget = (team: MatchTeamState) =>
  weightedPick(activePlayers(team), (pick) => {
    const attrs = pick.player.hiddenAttributes;
    const positionBonus = ["CB", "ST"].includes(pick.player.positions[0]) ? 24 : ["CDM", "CF"].includes(pick.player.positions[0]) ? 12 : 2;
    return attrs.physical * 1.15 + attrs.attack + attrs.finishing * 0.35 + positionBonus;
  });

const runner = (team: MatchTeamState) =>
  weightedPick(activePlayers(team), (pick) => {
    const attrs = pick.player.hiddenAttributes;
    return attrs.pace * 1.25 + attrs.attack + attrs.technique + (["LW", "RW", "ST", "CF"].includes(pick.player.positions[0]) ? 18 : 0);
  });

const goalkeeper = (team: MatchTeamState) =>
  weightedPick(activePlayers(team), (pick) => {
    const attrs = pick.player.hiddenAttributes;
    return attrs.goalkeeping * (pick.player.positions[0] === "GK" ? 2.4 : 0.25);
  });

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

const addGoal = (team: MatchTeamState, finisher?: DraftedPlayer, creator?: DraftedPlayer) => {
  const scorerName = finisher?.player.name ?? "un attaquant";
  const assisterName = creator?.player.name;
  team.stats.goals += 1;
  team.stats.scorers[scorerName] = (team.stats.scorers[scorerName] ?? 0) + 1;
  if (assisterName) team.stats.assists[assisterName] = (team.stats.assists[assisterName] ?? 0) + 1;
  return { scorerName, assisterName };
};

const updatePossession = (match: MatchState) => {
  const s1 = calculateStrength(match.teams.player1, match.minute);
  const s2 = calculateStrength(match.teams.player2, match.minute);
  const base = 50 + (s1.midfield + s1.creativity - s2.midfield - s2.creativity) * 0.22 + match.momentum * 0.04;
  match.teams.player1.stats.possession = Math.round(clamp(base + (Math.random() - 0.5) * 5, 35, 65));
  match.teams.player2.stats.possession = 100 - match.teams.player1.stats.possession;
};

const openPlayGoal = (match: MatchState, side: TeamSide, attack: ReturnType<typeof calculateStrength>, defense: ReturnType<typeof calculateStrength>) => {
  const team = match.teams[side];
  const finisher = scorer(team);
  const creator = assister(team, finisher?.instanceId);
  const xg = clamp(0.18 + Math.random() * 0.42 + (attack.finishing - defense.goalkeeping) / 500, 0.08, 0.78);
  addShot(team, xg, true);
  const { scorerName, assisterName } = addGoal(team, finisher, creator);
  match.momentum += side === "player1" ? 8 : -8;
  pushEvent(match, {
    minute: match.minute,
    type: "goal",
    team: side,
    text: sample([
      `${match.minute}' But de ${scorerName}, servi par ${assisterName ?? "un coequipier"}.`,
      `${match.minute}' ${scorerName} conclut une action rapide. Passe decisive de ${assisterName ?? "un coequipier"}.`,
      `${match.minute}' ${team.name} frappe fort : ${scorerName} termine l'action avec sang-froid.`,
    ]),
  });
};

const penaltySequence = (match: MatchState, side: TeamSide, defendingSide: TeamSide) => {
  const team = match.teams[side];
  const defendingTeam = match.teams[defendingSide];
  const taker = scorer(team);
  const fouled = runner(team);
  const keeper = goalkeeper(defendingTeam);
  const takerAttrs = taker?.player.hiddenAttributes;
  const keeperAttrs = keeper?.player.hiddenAttributes;
  const scoreChance = clamp(0.69 + ((takerAttrs?.finishing ?? 75) + (takerAttrs?.mentality ?? 75) - (keeperAttrs?.goalkeeping ?? 70)) / 420, 0.5, 0.88);

  team.stats.penalties += 1;
  defendingTeam.stats.fouls += 1;

  if (Math.random() < scoreChance) {
    addShot(team, 0.76, true);
    const { scorerName } = addGoal(team, taker);
    match.momentum += side === "player1" ? 7 : -7;
    pushEvent(match, {
      minute: match.minute,
      type: "penalty",
      team: side,
      text: `${match.minute}' Penalty obtenu par ${fouled?.player.name ?? team.name}. ${scorerName} transforme sans trembler.`,
    });
    return;
  }

  const saved = Math.random() < 0.62;
  addShot(team, 0.76, saved);
  if (saved) defendingTeam.stats.saves += 1;
  pushEvent(match, {
    minute: match.minute,
    type: "penalty",
    team: side,
    text: saved
      ? `${match.minute}' Penalty pour ${team.name}, mais ${keeper?.player.name ?? "le gardien"} sort une parade immense.`
      : `${match.minute}' Penalty pour ${team.name}. ${taker?.player.name ?? "Le tireur"} manque le cadre.`,
  });
};

const cornerSequence = (match: MatchState, side: TeamSide, defendingSide: TeamSide, attack: ReturnType<typeof calculateStrength>, defense: ReturnType<typeof calculateStrength>) => {
  const team = match.teams[side];
  const defendingTeam = match.teams[defendingSide];
  const taker = setPieceTaker(team);
  const target = aerialTarget(team);
  const keeper = goalkeeper(defendingTeam);
  const goalChance = clamp(0.035 + ((target?.player.hiddenAttributes.physical ?? 75) + attack.attack - defense.defense - defense.goalkeeping) / 2600, 0.018, 0.12);

  team.stats.corners += 1;

  if (Math.random() < goalChance) {
    addShot(team, 0.19, true);
    const { scorerName, assisterName } = addGoal(team, target, taker);
    match.momentum += side === "player1" ? 6 : -6;
    pushEvent(match, {
      minute: match.minute,
      type: "corner",
      team: side,
      text: `${match.minute}' Corner de ${assisterName ?? taker?.player.name ?? team.name}. ${scorerName} gagne son duel aerien et marque.`,
    });
    return;
  }

  if (Math.random() < 0.48) {
    const onTarget = Math.random() < 0.52;
    addShot(team, clamp(0.05 + Math.random() * 0.17, 0.04, 0.25), onTarget);
    if (onTarget) defendingTeam.stats.saves += 1;
    pushEvent(match, {
      minute: match.minute,
      type: onTarget ? "keeper" : "corner",
      team: side,
      text: onTarget
        ? `${match.minute}' Corner tendu de ${taker?.player.name ?? team.name}, tete de ${target?.player.name ?? "son partenaire"}, arret de ${keeper?.player.name ?? "gardien"}.`
        : `${match.minute}' Corner pour ${team.name}. ${target?.player.name ?? "Un joueur"} coupe la trajectoire, mais ca file au-dessus.`,
    });
    return;
  }

  pushEvent(match, {
    minute: match.minute,
    type: "corner",
    team: side,
    text: sample([
      `${match.minute}' Corner pour ${team.name}, la defense repousse au premier poteau.`,
      `${match.minute}' ${taker?.player.name ?? team.name} depose le corner, mais ${defendingTeam.name} s'en sort.`,
      `${match.minute}' Corner dangereux pour ${team.name}, personne ne parvient a reprendre.`,
    ]),
  });
};

const freeKickSequence = (match: MatchState, side: TeamSide, defendingSide: TeamSide, attack: ReturnType<typeof calculateStrength>, defense: ReturnType<typeof calculateStrength>) => {
  const team = match.teams[side];
  const defendingTeam = match.teams[defendingSide];
  const taker = setPieceTaker(team);
  const keeper = goalkeeper(defendingTeam);
  const attrs = taker?.player.hiddenAttributes;
  const goalChance = clamp(0.014 + ((attrs?.technique ?? 75) + (attrs?.finishing ?? 72) + attack.creativity - defense.goalkeeping) / 4300, 0.008, 0.075);

  team.stats.freeKicks += 1;
  defendingTeam.stats.fouls += 1;

  if (Math.random() < goalChance) {
    addShot(team, 0.11, true);
    const { scorerName } = addGoal(team, taker);
    match.momentum += side === "player1" ? 6 : -6;
    pushEvent(match, {
      minute: match.minute,
      type: "freeKick",
      team: side,
      text: `${match.minute}' Coup franc direct. ${scorerName} enroule au-dessus du mur et trouve la lucarne.`,
    });
    return;
  }

  const hitsWoodwork = Math.random() < 0.13;
  const onTarget = !hitsWoodwork && Math.random() < 0.56;
  addShot(team, clamp(0.04 + Math.random() * 0.11, 0.03, 0.18), onTarget);
  if (hitsWoodwork) team.stats.woodwork += 1;
  if (onTarget) defendingTeam.stats.saves += 1;
  pushEvent(match, {
    minute: match.minute,
    type: hitsWoodwork ? "woodwork" : onTarget ? "keeper" : "freeKick",
    team: side,
    text: hitsWoodwork
      ? `${match.minute}' Coup franc de ${taker?.player.name ?? team.name}, le ballon claque sur le poteau.`
      : onTarget
        ? `${match.minute}' Coup franc cadre de ${taker?.player.name ?? team.name}, ${keeper?.player.name ?? "le gardien"} capte en deux temps.`
        : `${match.minute}' Coup franc interessant pour ${team.name}, mais la tentative passe au-dessus.`,
  });
};

const counterSequence = (match: MatchState, side: TeamSide, defendingSide: TeamSide, attack: ReturnType<typeof calculateStrength>, defense: ReturnType<typeof calculateStrength>) => {
  const team = match.teams[side];
  const defendingTeam = match.teams[defendingSide];
  const ballCarrier = runner(team);
  const finisher = scorer(team);
  const creator = ballCarrier?.instanceId === finisher?.instanceId ? assister(team, finisher?.instanceId) : ballCarrier;
  const keeper = goalkeeper(defendingTeam);
  const goalChance = clamp(0.026 + ((ballCarrier?.player.hiddenAttributes.pace ?? 75) + attack.finishing - defense.defense - defense.goalkeeping * 0.6) / 3200, 0.014, 0.115);

  if (Math.random() < goalChance) {
    addShot(team, 0.26, true);
    const { scorerName, assisterName } = addGoal(team, finisher, creator);
    match.momentum += side === "player1" ? 7 : -7;
    pushEvent(match, {
      minute: match.minute,
      type: "counter",
      team: side,
      text: `${match.minute}' Contre eclair. ${assisterName ?? ballCarrier?.player.name ?? team.name} casse les lignes et ${scorerName} finit le travail.`,
    });
    return;
  }

  const onTarget = Math.random() < 0.54;
  team.stats.bigChances += 1;
  addShot(team, clamp(0.1 + Math.random() * 0.22, 0.08, 0.38), onTarget);
  if (onTarget) defendingTeam.stats.saves += 1;
  pushEvent(match, {
    minute: match.minute,
    type: onTarget ? "keeper" : "counter",
    team: side,
    text: onTarget
      ? `${match.minute}' Contre rapide mene par ${ballCarrier?.player.name ?? team.name}, mais ${keeper?.player.name ?? "le gardien"} gagne son duel.`
      : `${match.minute}' ${team.name} part en contre, ${finisher?.player.name ?? "l'attaquant"} frappe trop croise.`,
  });
};

const bigChanceSequence = (match: MatchState, side: TeamSide, defendingSide: TeamSide) => {
  const team = match.teams[side];
  const defendingTeam = match.teams[defendingSide];
  const finisher = scorer(team);
  const keeper = goalkeeper(defendingTeam);
  const hitsWoodwork = Math.random() < 0.14;
  const onTarget = !hitsWoodwork && Math.random() < 0.58;
  const xg = clamp(0.09 + Math.random() * 0.28, 0.04, 0.44);

  team.stats.bigChances += 1;
  team.stats.woodwork += hitsWoodwork ? 1 : 0;
  addShot(team, xg, onTarget);
  if (onTarget) defendingTeam.stats.saves += 1;

  pushEvent(match, {
    minute: match.minute,
    type: hitsWoodwork ? "woodwork" : onTarget ? "keeper" : "chance",
    team: side,
    text: hitsWoodwork
      ? `${match.minute}' Enorme occasion pour ${finisher?.player.name ?? team.name}, mais le ballon heurte le montant.`
      : onTarget
        ? `${match.minute}' ${finisher?.player.name ?? team.name} pense marquer, ${keeper?.player.name ?? "le gardien"} sort une parade decisive.`
        : `${match.minute}' Grosse situation pour ${finisher?.player.name ?? team.name}, la frappe passe juste a cote.`,
  });
};

export const simulateMinute = (match: MatchState): MatchState => {
  if (match.isPaused || match.isFinished) return match;

  const next: MatchState = structuredClone(match);
  ensureStats(next.teams.player1);
  ensureStats(next.teams.player2);
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
    const goalChance = clamp(0.033 + pressure / 4300 + Math.random() * 0.032, 0.016, 0.15);
    const bigChance = clamp(0.16 + pressure / 1900, 0.075, 0.32);
    const penaltyChance = clamp(0.01 + (attack.creativity + attack.finishing - defense.discipline) / 9000, 0.006, 0.032);
    const cornerChance = clamp(0.08 + (attack.attack + attack.creativity - defense.defense) / 4200, 0.045, 0.14);
    const freeKickChance = clamp(0.045 + (100 - defense.discipline) / 1600, 0.03, 0.08);
    const counterChance = clamp(0.06 + Math.abs(next.momentum) / 900, 0.04, 0.105);
    const cardChance = clamp((105 - attackingTeam.stats.possession + (100 - attack.discipline)) / 3900, 0.005, 0.032);

    if (Math.random() < goalChance) {
      openPlayGoal(next, attackingSide, attack, defense);
    } else if (Math.random() < penaltyChance) {
      penaltySequence(next, attackingSide, defendingSide);
    } else if (Math.random() < freeKickChance) {
      freeKickSequence(next, attackingSide, defendingSide, attack, defense);
    } else if (Math.random() < cornerChance) {
      cornerSequence(next, attackingSide, defendingSide, attack, defense);
    } else if (Math.random() < counterChance) {
      counterSequence(next, attackingSide, defendingSide, attack, defense);
    } else if (Math.random() < bigChance) {
      bigChanceSequence(next, attackingSide, defendingSide);
    } else if (Math.random() < cardChance) {
      const unluckyTeam = Math.random() < 0.55 ? defendingTeam : attackingTeam;
      const unluckySide = unluckyTeam.side;
      const sentOff = cardedPlayer(unluckyTeam);
      if (sentOff && unluckyTeam.stats.redCards < 2) {
        unluckyTeam.starters = unluckyTeam.starters.map((slot) =>
          slot.pick?.instanceId === sentOff.instanceId ? { ...slot, pick: { ...slot.pick, redCard: true } } : slot,
        );
        unluckyTeam.stats.redCards += 1;
        unluckyTeam.stats.fouls += 1;
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
        text: sample([
          `${next.minute}' Intervention decisive de ${defendingTeam.name}, le danger est ecarte.`,
          `${next.minute}' ${defendingTeam.name} ferme l'axe et force une passe en retrait.`,
          `${next.minute}' Gros pressing de ${defendingTeam.name}, recuperation importante au milieu.`,
        ]),
      });
    } else {
      pushEvent(next, {
        minute: next.minute,
        type: "calm",
        team: attackingSide,
        text: sample([
          `${next.minute}' ${attackingTeam.name} fait circuler et cherche l'ouverture.`,
          `${next.minute}' Temps calme, ${attackingTeam.name} installe une longue possession.`,
          `${next.minute}' Le bloc adverse tient bon, ${attackingTeam.name} patiente aux abords de la surface.`,
        ]),
      });
    }
  }

  next.momentum = clamp(next.momentum * 0.96 + (Math.random() - 0.5) * 3, -35, 35);
  if (next.minute >= 90) next.isFinished = true;
  return next;
};
