export type Screen = "home" | "setup" | "draft" | "summary" | "match" | "final" | "createOnline" | "joinOnline";

export type TeamSide = "player1" | "player2";

export type SessionMode = "local" | "online";

export type SyncStatus = "idle" | "loading" | "connected" | "disconnected" | "error";

export type Position =
  | "GK"
  | "LB"
  | "CB"
  | "RB"
  | "LWB"
  | "RWB"
  | "CDM"
  | "CM"
  | "CAM"
  | "LM"
  | "RM"
  | "LW"
  | "RW"
  | "CF"
  | "ST";

export type LegendTag = "Ballon d'Or" | "Captain" | "Big Game Player" | "Maestro" | "Wall" | "Engine";

export interface HiddenAttributes {
  overall: number;
  attack: number;
  defense: number;
  technique: number;
  physical: number;
  mentality: number;
  goalkeeping: number;
  creativity: number;
  pace: number;
  finishing: number;
  passing: number;
  pressing: number;
  discipline: number;
}

export interface Player {
  id: string;
  name: string;
  positions: Position[];
  hiddenAttributes: HiddenAttributes;
  preferredFoot?: "Droit" | "Gauche" | "Deux pieds";
  legendTag?: LegendTag;
}

export interface HistoricalSquad {
  id: string;
  clubName: string;
  season: string;
  displayName: string;
  country: string;
  strengthTier: 1 | 2 | 3 | 4 | 5;
  players: Player[];
}

export interface FormationSlot {
  id: string;
  label: Position;
  line: "gardien" | "defense" | "milieu" | "attaque";
  x: number;
  y: number;
}

export interface Formation {
  id: string;
  name: string;
  slots: FormationSlot[];
  style: "equilibree" | "offensive" | "defensive" | "pressing";
}

export interface DraftedPlayer {
  instanceId: string;
  player: Player;
  sourceSquadId: string;
  sourceDisplayName: string;
  sourceClubName: string;
  sourceCountry: string;
  assignedSlotId?: string;
  enteredAtMinute?: number;
  redCard?: boolean;
}

export interface StarterSlot {
  slot: FormationSlot;
  pick?: DraftedPlayer;
}

export interface PlayerState {
  id: TeamSide;
  name: string;
  formationId: string;
  starters: StarterSlot[];
  bench: DraftedPlayer[];
  rerollsLeft: number;
}

export interface DraftState {
  activePlayer: TeamSide;
  currentSquad?: HistoricalSquad;
  selectedPlayerId?: string;
  selectedDestination?: string;
  turnNumber: number;
}

export interface MatchStats {
  goals: number;
  scorers: Record<string, number>;
  assists: Record<string, number>;
  shots: number;
  shotsOnTarget: number;
  possession: number;
  xg: number;
  redCards: number;
}

export interface TimelineEvent {
  id: string;
  minute: number;
  text: string;
  type: "goal" | "chance" | "card" | "tactic" | "sub" | "calm" | "defense";
  team?: TeamSide;
}

export interface MatchTeamState {
  side: TeamSide;
  name: string;
  formationId: string;
  starters: StarterSlot[];
  bench: DraftedPlayer[];
  substitutionsMade: number;
  substitutionSessions: number;
  stats: MatchStats;
}

export interface MatchState {
  minute: number;
  isPaused: boolean;
  isFinished: boolean;
  teams: Record<TeamSide, MatchTeamState>;
  timeline: TimelineEvent[];
  momentum: number;
  lastEventSecond: number;
}

export interface GameState {
  screen: Screen;
  players: Record<TeamSide, PlayerState>;
  draft: DraftState;
  match?: MatchState;
  online?: {
    hostClientId?: string;
    player2ClientId?: string;
    simulationHost: TeamSide;
  };
  debug: boolean;
}

export interface SessionState {
  mode: SessionMode;
  syncStatus: SyncStatus;
  role?: TeamSide;
  gameId?: string;
  code?: string;
  shareUrl?: string;
  clientId: string;
  error?: string;
}

export interface StrengthBreakdown {
  total: number;
  attack: number;
  midfield: number;
  defense: number;
  goalkeeping: number;
  creativity: number;
  finishing: number;
  discipline: number;
  positionFit: number;
  synergy: number;
  redCardPenalty: number;
}
