import { formations } from "../data/formations";

interface FormationSelectorProps {
  value: string;
  onChange: (formationId: string) => void;
  label?: string;
  disabled?: boolean;
}

export function FormationSelector({ value, onChange, label = "Formation", disabled = false }: FormationSelectorProps) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-300">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-white/10 bg-panel px-3 py-3 text-white outline-none focus:border-neon disabled:opacity-50"
      >
        {formations.map((formation) => (
          <option key={formation.id} value={formation.id}>
            {formation.name}
          </option>
        ))}
      </select>
    </label>
  );
}
