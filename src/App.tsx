import { Copy, Crown, Gamepad2, LogIn, RotateCcw, Sparkles, Wifi } from "lucide-react";
import { useState, type ReactNode } from "react";
import { getFormation } from "./data/formations";
import { DraftPanel } from "./components/DraftPanel";
import { FinalResult } from "./components/FinalResult";
import { FormationSelector } from "./components/FormationSelector";
import { MatchSimulation } from "./components/MatchSimulation";
import { PlayerCard } from "./components/PlayerCard";
import { SquadPitch } from "./components/SquadPitch";
import { TeamSummary } from "./components/TeamSummary";
import { useGameSession } from "./session/GameSessionProvider";
import { useGameStore } from "./store/gameStore";
import { nextDestinationOptions } from "./utils/draft";
import type { DraftState, PlayerState, TeamSide } from "./types/game";

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen px-3 py-4 sm:px-5 lg:px-8">
      <div className="mx-auto grid max-w-[1560px] gap-5">{children}</div>
    </main>
  );
}

function OnlineStatusBanner() {
  const { session, isOnline, copyShareLink, leaveOnlineGame } = useGameSession();
  if (!isOnline) return null;

  return (
    <section className="card-frame rounded-lg p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase text-neon">
            {session.role === "player1" ? "Tu es Joueur 1" : "Tu es Joueur 2"} · {session.syncStatus}
          </p>
          <p className="text-sm text-slate-300">
            Code : <span className="font-black text-gold">{session.code}</span>
          </p>
          {session.error ? <p className="mt-1 text-sm text-red-300">{session.error}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={copyShareLink} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm font-bold">
            <Copy size={16} />
            Copier le lien
          </button>
          <button type="button" onClick={leaveOnlineGame} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm font-bold">
            Quitter
          </button>
        </div>
      </div>
    </section>
  );
}

function HomeScreen() {
  const { newLocalGame, setScreen } = useGameSession();
  return (
    <Shell>
      <section className="grid min-h-[calc(100vh-2rem)] place-items-center">
        <div className="card-frame w-full max-w-3xl rounded-lg p-6 text-center sm:p-10">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-lg border border-gold/40 bg-gold/10 text-gold">
            <Crown size={34} />
          </div>
          <p className="text-sm font-bold uppercase tracking-wide text-neon">Draft local · Online realtime · Simulation 90 secondes</p>
          <h1 className="mt-2 font-display text-5xl font-black text-gold sm:text-7xl">Legend XI Draft</h1>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">
            Compose deux XI de légende à partir d'effectifs historiques depuis 2000, puis influence le match avec tes choix tactiques.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <button type="button" onClick={newLocalGame} className="inline-flex items-center justify-center gap-2 rounded-lg bg-neon px-4 py-4 font-black text-night">
              <Gamepad2 size={20} />
              Partie locale
            </button>
            <button type="button" onClick={() => setScreen("createOnline")} className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-4 py-4 font-black text-night">
              <Wifi size={20} />
              Créer en ligne
            </button>
            <button type="button" onClick={() => setScreen("joinOnline")} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/10 px-4 py-4 font-black text-white">
              <LogIn size={20} />
              Rejoindre
            </button>
          </div>
          <p className="mt-5 text-xs text-slate-500">Joao je t'aime</p>
        </div>
      </section>
    </Shell>
  );
}

function CreateOnlineScreen() {
  const { session, createOnlineGame, copyShareLink, setScreen } = useGameSession();
  return (
    <Shell>
      <section className="card-frame mx-auto w-full max-w-2xl rounded-lg p-6">
        <p className="text-sm font-bold uppercase text-neon">Mode en ligne</p>
        <h1 className="mt-2 font-display text-4xl font-black">Créer une partie</h1>
        <p className="mt-3 text-slate-300">
          Le créateur est Joueur 1. Il génère la simulation et l'état est synchronisé dans Supabase.
        </p>
        {session.code ? (
          <div className="mt-5 rounded-lg border border-white/10 bg-black/20 p-4">
            <p className="text-sm text-slate-300">Code de partie</p>
            <p className="font-display text-4xl font-black text-gold">{session.code}</p>
            <p className="mt-2 break-all text-sm text-slate-300">{session.shareUrl}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={copyShareLink} className="inline-flex items-center gap-2 rounded-lg bg-neon px-4 py-3 font-black text-night">
                <Copy size={18} />
                Copier le lien
              </button>
              {session.role === "player1" ? (
                <button type="button" onClick={() => setScreen("setup")} className="rounded-lg bg-gold px-4 py-3 font-black text-night">
                  Configurer la partie
                </button>
              ) : (
                <span className="rounded-lg border border-white/10 bg-white/10 px-4 py-3 text-sm font-bold text-slate-300">
                  En attente du créateur
                </span>
              )}
            </div>
          </div>
        ) : (
          <button type="button" onClick={createOnlineGame} disabled={session.syncStatus === "loading"} className="mt-6 rounded-lg bg-gold px-5 py-4 font-black text-night disabled:opacity-40">
            {session.syncStatus === "loading" ? "Création..." : "Créer la room"}
          </button>
        )}
        {session.error ? <p className="mt-4 text-sm text-red-300">{session.error}</p> : null}
      </section>
    </Shell>
  );
}

function JoinOnlineScreen() {
  const { session, joinOnlineGame } = useGameSession();
  const [code, setCode] = useState(new URLSearchParams(window.location.search).get("join") ?? "");

  return (
    <Shell>
      <section className="card-frame mx-auto w-full max-w-2xl rounded-lg p-6">
        <p className="text-sm font-bold uppercase text-neon">Mode en ligne</p>
        <h1 className="mt-2 font-display text-4xl font-black">Rejoindre une partie</h1>
        <label className="mt-5 grid gap-2">
          <span className="text-sm font-semibold text-slate-300">Code de partie</span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="AB7KQ2"
            className="rounded-lg border border-white/10 bg-panel px-3 py-3 text-white outline-none focus:border-neon"
          />
        </label>
        <button type="button" onClick={() => joinOnlineGame(code)} disabled={!code.trim() || session.syncStatus === "loading"} className="mt-4 rounded-lg bg-neon px-5 py-4 font-black text-night disabled:opacity-40">
          {session.syncStatus === "loading" ? "Connexion..." : "Rejoindre"}
        </button>
        {session.error ? <p className="mt-4 text-sm text-red-300">{session.error}</p> : null}
      </section>
    </Shell>
  );
}

function SetupScreen() {
  const players = useGameStore((state) => state.players);
  const { updateSetup, startDraft, canControl, isOnline, isHost } = useGameSession();

  return (
    <Shell>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase text-neon">Configuration</p>
          <h1 className="font-display text-4xl font-black">Préparer la draft</h1>
        </div>
        <button type="button" onClick={startDraft} disabled={isOnline && !isHost} className="rounded-lg bg-neon px-5 py-3 font-black text-night disabled:opacity-40">
          {isOnline && !isHost ? "Attente du créateur" : "Commencer la draft"}
        </button>
      </header>
      <OnlineStatusBanner />

      <div className="grid gap-4 lg:grid-cols-2">
        {(["player1", "player2"] as const).map((side) => (
          <section key={side} className="card-frame rounded-lg p-5">
            <h2 className="mb-4 font-display text-2xl font-black">{side === "player1" ? "Joueur 1" : "Joueur 2"}</h2>
            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-semibold text-slate-300">Nom</span>
                <input
                  disabled={!canControl(side)}
                  value={players[side].name}
                  onChange={(event) =>
                    side === "player1" ? updateSetup({ player1Name: event.target.value }) : updateSetup({ player2Name: event.target.value })
                  }
                  className="rounded-lg border border-white/10 bg-panel px-3 py-3 text-white outline-none focus:border-neon disabled:opacity-50"
                />
              </label>
              <FormationSelector
                value={players[side].formationId}
                disabled={!canControl(side)}
                onChange={(formationId) =>
                  side === "player1" ? updateSetup({ player1Formation: formationId }) : updateSetup({ player2Formation: formationId })
                }
              />
            </div>
          </section>
        ))}
      </div>
    </Shell>
  );
}

function MobileTeamProgress({ side, player }: { side: TeamSide; player: PlayerState }) {
  const starters = player.starters.filter((slot) => slot.pick).length;
  return (
    <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
      <p className="truncate text-xs font-bold text-slate-300">{side === "player1" ? "J1" : "J2"} · {player.name}</p>
      <p className="text-sm font-black text-white">{starters}/11 <span className="text-slate-500">+</span> {player.bench.length}/5</p>
    </div>
  );
}

interface DraftUiProps {
  draft: DraftState;
  players: Record<TeamSide, PlayerState>;
  canActDraft: boolean;
  waitingLabel?: string;
  onSelectPlayer: (playerId: string) => void;
  onSelectDestination: (destination: string) => void;
  onReroll: () => void;
}

function MobileDraftScreen({ draft, players, canActDraft, waitingLabel, onSelectPlayer, onSelectDestination, onReroll }: DraftUiProps) {
  const active = players[draft.activePlayer];
  const currentSquad = draft.currentSquad;
  const destinations = nextDestinationOptions(active);
  const selectedPlayer = currentSquad?.players.find((player) => player.id === draft.selectedPlayerId);

  return (
    <main className="h-[100dvh] overflow-hidden px-3 py-3">
      <div className="grid h-full grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-3">
        <header className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase text-neon">Tour {draft.turnNumber}</p>
            <h1 className="truncate font-display text-2xl font-black">{active.name} drafte</h1>
          </div>
          <button
            type="button"
            onClick={onReroll}
            disabled={!canActDraft || !currentSquad || Boolean(draft.selectedPlayerId) || active.rerollsLeft <= 0}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 px-3 py-2 text-sm font-bold text-gold disabled:opacity-40"
            title="Changer l'effectif tiré"
          >
            <RotateCcw size={16} />
            {active.rerollsLeft}
          </button>
        </header>

        <section className="grid grid-cols-2 gap-2">
          <MobileTeamProgress side="player1" player={players.player1} />
          <MobileTeamProgress side="player2" player={players.player2} />
        </section>

        <section className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-2 rounded-lg border border-white/10 bg-black/20 p-3">
          <div>
            <p className="text-xs font-bold uppercase text-slate-400">Effectif tiré</p>
            <h2 className="truncate font-display text-xl font-black text-gold">{currentSquad?.displayName}</h2>
            {!canActDraft && waitingLabel ? <p className="mt-1 text-sm font-bold text-slate-300">{waitingLabel}</p> : null}
          </div>

          <div className="rounded-lg border border-neon/20 bg-neon/10 px-3 py-2 text-sm text-slate-200">
            {selectedPlayer ? (
              <span>
                Joueur sélectionné : <b className="text-neon">{selectedPlayer.name}</b>
              </span>
            ) : (
              "Touchez un joueur, puis un emplacement en bas."
            )}
          </div>

          <div className="thin-scrollbar min-h-0 overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-2">
              {currentSquad?.players.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  compact
                  selected={draft.selectedPlayerId === player.id}
                  disabled={!canActDraft}
                  onClick={() => onSelectPlayer(player.id)}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-panel/95 p-2 shadow-2xl">
          <p className="px-1 pb-2 text-xs font-bold uppercase text-slate-400">Emplacement</p>
          <div className="thin-scrollbar flex max-h-[112px] gap-2 overflow-x-auto pb-1">
            {destinations.map((destination) => (
              <button
                type="button"
                key={destination.id}
                disabled={!canActDraft}
                onClick={() => onSelectDestination(destination.id)}
                className={[
                  "min-w-[112px] rounded-lg border px-3 py-2 text-left text-sm font-bold",
                  draft.selectedDestination === destination.id
                    ? "border-neon bg-neon/15 text-neon"
                    : "border-white/10 bg-black/30 text-slate-200",
                ].join(" ")}
              >
                {destination.label}
                <span className="block text-xs font-normal text-slate-400">{destination.group}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function DraftScreen() {
  const players = useGameStore((state) => state.players);
  const draft = useGameStore((state) => state.draft);
  const { selectDraftPlayer, selectDestination, rerollSquad, confirmDraftPick, canActDraft, session } = useGameSession();
  const active = players[draft.activePlayer];
  const destinationIds = nextDestinationOptions(active).map((destination) => destination.id);
  const waitingLabel = session.mode === "online" ? "En attente de l'adversaire" : undefined;

  const confirmAfterStateUpdate = () => {
    window.setTimeout(confirmDraftPick, 0);
  };

  const selectPlayerAndMaybeConfirm = (playerId: string) => {
    if (!canActDraft) return;
    selectDraftPlayer(playerId);
    if (draft.selectedDestination) confirmAfterStateUpdate();
  };

  const selectDestinationAndMaybeConfirm = (destination: string) => {
    if (!canActDraft) return;
    selectDestination(destination);
    if (draft.selectedPlayerId) confirmAfterStateUpdate();
  };

  return (
    <>
      <div className="hidden md:block">
        <Shell>
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase text-neon">Draft alternée</p>
              <h1 className="font-display text-4xl font-black">Choisis ton légendaire</h1>
              <p className="mt-1 text-sm text-slate-400">Un clic sur le joueur, un clic sur le poste : le pick est validé automatiquement.</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 px-4 py-3 text-sm">
              {players.player1.name} : {players.player1.rerollsLeft} rerolls · {players.player2.name} : {players.player2.rerollsLeft} rerolls
            </div>
          </header>
          <OnlineStatusBanner />

          <div className="grid gap-4 xl:grid-cols-[1fr_440px_1fr]">
            <SquadPitch
              title={players.player1.name}
              formation={getFormation(players.player1.formationId).name}
              starters={players.player1.starters}
              bench={players.player1.bench}
              selectableDestinations={canActDraft && draft.activePlayer === "player1" ? destinationIds : []}
              selectedDestination={draft.selectedDestination}
              onSelectDestination={selectDestinationAndMaybeConfirm}
              compact
            />
            <DraftPanel
              draft={draft}
              players={players}
              canAct={canActDraft}
              waitingLabel={waitingLabel}
              onSelectPlayer={selectPlayerAndMaybeConfirm}
              onSelectDestination={selectDestinationAndMaybeConfirm}
              onReroll={rerollSquad}
            />
            <SquadPitch
              title={players.player2.name}
              formation={getFormation(players.player2.formationId).name}
              starters={players.player2.starters}
              bench={players.player2.bench}
              selectableDestinations={canActDraft && draft.activePlayer === "player2" ? destinationIds : []}
              selectedDestination={draft.selectedDestination}
              onSelectDestination={selectDestinationAndMaybeConfirm}
              compact
            />
          </div>
        </Shell>
      </div>

      <div className="md:hidden">
        <MobileDraftScreen
          draft={draft}
          players={players}
          canActDraft={canActDraft}
          waitingLabel={waitingLabel}
          onSelectPlayer={selectPlayerAndMaybeConfirm}
          onSelectDestination={selectDestinationAndMaybeConfirm}
          onReroll={rerollSquad}
        />
      </div>
    </>
  );
}

function SummaryScreen() {
  const players = useGameStore((state) => state.players);
  const { launchMatch, isOnline, isHost } = useGameSession();
  return (
    <Shell>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase text-neon">Avant match</p>
          <h1 className="font-display text-4xl font-black">Compositions finales</h1>
        </div>
        <button type="button" onClick={launchMatch} disabled={isOnline && !isHost} className="inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-3 font-black text-night disabled:opacity-40">
          <Sparkles size={18} />
          {isOnline && !isHost ? "Attente du créateur" : "Lancer le match"}
        </button>
      </header>
      <OnlineStatusBanner />
      <div className="grid gap-4 lg:grid-cols-2">
        <TeamSummary team={players.player1} />
        <TeamSummary team={players.player2} />
      </div>
    </Shell>
  );
}

function MatchScreen() {
  const match = useGameStore((state) => state.match);
  const { tickMatch, togglePause, applySubstitutions, changeMatchFormation, isOnline, isHost, canControl } = useGameSession();

  if (!match) return <HomeScreen />;
  return (
    <Shell>
      <OnlineStatusBanner />
      <MatchSimulation
        match={match}
        canTick={!isOnline || isHost}
        canPause={!isOnline || isHost}
        canControlSide={canControl}
        onTick={tickMatch}
        onPause={togglePause}
        onSubstitute={applySubstitutions}
        onFormationChange={changeMatchFormation}
      />
    </Shell>
  );
}

function FinalScreen() {
  const match = useGameStore((state) => state.match);
  const { replay } = useGameSession();
  if (!match) return <HomeScreen />;
  return (
    <Shell>
      <OnlineStatusBanner />
      <FinalResult match={match} onReplay={replay} />
    </Shell>
  );
}

export default function App() {
  const screen = useGameStore((state) => state.screen);

  if (screen === "home") return <HomeScreen />;
  if (screen === "createOnline") return <CreateOnlineScreen />;
  if (screen === "joinOnline") return <JoinOnlineScreen />;
  if (screen === "setup") return <SetupScreen />;
  if (screen === "draft") return <DraftScreen />;
  if (screen === "summary") return <SummaryScreen />;
  if (screen === "match") return <MatchScreen />;
  return <FinalScreen />;
}
