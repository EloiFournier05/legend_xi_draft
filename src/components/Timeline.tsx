import type { TimelineEvent } from "../types/game";

interface TimelineProps {
  events: TimelineEvent[];
  full?: boolean;
}

const tone = {
  goal: "border-gold text-gold",
  chance: "border-neon text-neon",
  card: "border-red-400 text-red-300",
  tactic: "border-blue-300 text-blue-200",
  sub: "border-emerald-300 text-emerald-200",
  calm: "border-white/20 text-slate-300",
  defense: "border-slate-300 text-slate-200",
  corner: "border-cyan-300 text-cyan-200",
  penalty: "border-amber-300 text-amber-200",
  keeper: "border-violet-300 text-violet-200",
  woodwork: "border-orange-300 text-orange-200",
  counter: "border-lime-300 text-lime-200",
  freeKick: "border-sky-300 text-sky-200",
};

export function Timeline({ events, full }: TimelineProps) {
  return (
    <section className="card-frame rounded-lg p-4">
      <h2 className="mb-3 font-display text-xl font-black">Timeline</h2>
      <div className={["thin-scrollbar grid gap-2 overflow-y-auto pr-1", full ? "max-h-[620px]" : "max-h-[320px]"].join(" ")}>
        {events.map((event) => (
          <div key={event.id} className={`rounded-lg border bg-black/20 p-3 text-sm ${tone[event.type]}`}>
            {event.text}
          </div>
        ))}
      </div>
    </section>
  );
}
