import { roleColor } from "@/lib/role-colors";
import type { Rank } from "@/lib/crew";

export function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-fg";
  return (
    <article className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs tracking-widest text-muted uppercase">{label}</p>
      <p className={`mt-2 font-display text-2xl ${color}`}>{value}</p>
    </article>
  );
}

export function RankPill({ rank }: { rank: Rank }) {
  return <span className="rounded-full border border-line px-3 py-1 text-xs tracking-widest uppercase">{rank}</span>;
}

export function Field({
  name,
  label,
  type = "text",
  placeholder,
}: {
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs tracking-widest text-muted uppercase">
      {label}
      <input
        name={name}
        type={type}
        required={type !== "text" || name !== "notes"}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0" : undefined}
        placeholder={placeholder}
        className="min-h-11 rounded-xl border border-line bg-bg px-3 text-sm text-fg normal-case placeholder:text-muted"
      />
    </label>
  );
}

export function RolePie({ slices }: { slices: { name: string; value: number; color: string }[] }) {
  const ordered = [...slices].sort((a, b) => b.value - a.value);
  const drawn = ordered.filter((slice) => slice.value > 0);
  const total = drawn.reduce((sum, slice) => sum + slice.value, 0);
  if (!total) return <p className="text-sm text-muted">Nobody assigned yet</p>;
  const r = 70;
  const cx = 90;
  const cy = 90;
  let angle = -Math.PI / 2;
  return (
    <div className="flex flex-wrap items-center gap-4">
      <svg viewBox="0 0 180 180" className="h-44 w-44 shrink-0" role="img" aria-label="Roles by crew count">
        {drawn.length === 1 ? (
          <circle cx={cx} cy={cy} r={r} fill={drawn[0].color} />
        ) : (
          drawn.map((slice) => {
            const sweep = (slice.value / total) * Math.PI * 2;
            const start = angle;
            angle += sweep;
            const large = sweep > Math.PI ? 1 : 0;
            const x1 = cx + r * Math.cos(start);
            const y1 = cy + r * Math.sin(start);
            const x2 = cx + r * Math.cos(angle);
            const y2 = cy + r * Math.sin(angle);
            return (
              <path
                key={slice.name}
                d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
                fill={slice.color}
              >
                <title>{`${slice.name}: ${slice.value}`}</title>
              </path>
            );
          })
        )}
      </svg>
      <ul className="flex flex-col gap-1 text-sm">
        {ordered.map((slice) => (
          <li key={slice.name} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ background: slice.color }} />
            <span>
              {slice.name} · {slice.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
