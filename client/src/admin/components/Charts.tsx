import { cn } from '@/lib/cn';

interface Series {
  label: string;
  color: string;
  data: { date: string; count: number }[];
}

/** Grouped bars per day (last 14 days). Plain SVG — no chart library needed for two series. */
export function ActivityChart({ series }: { series: Series[] }) {
  const days = series[0]?.data ?? [];
  const rawMax = Math.max(1, ...series.flatMap((s) => s.data.map((d) => d.count)));
  // Whole-number gridlines: with few events use one line per count, otherwise round up to a multiple of 4.
  const steps = rawMax <= 4 ? rawMax : 4;
  const max = rawMax <= 4 ? rawMax : Math.ceil(rawMax / 4) * 4;
  const W = 560;
  const H = 180;
  const pad = { l: 24, r: 8, t: 10, b: 24 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const slot = innerW / Math.max(1, days.length);
  const bar = Math.max(4, Math.min(14, slot / (series.length + 0.8)));

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="النشاط خلال آخر 14 يوماً" className="w-full" style={{ direction: "ltr" }}>
        {Array.from({ length: steps + 1 }, (_, i) => i / steps).map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={pad.t + innerH * (1 - t)} y2={pad.t + innerH * (1 - t)} stroke="#e1e8ef" strokeDasharray={t === 0 ? undefined : '3 4'} />
            <text x={pad.l - 6} y={pad.t + innerH * (1 - t) + 3} textAnchor="end" fontSize="9" fill="#7d91a5">
              {Math.round(max * t)}
            </text>
          </g>
        ))}
        {days.map((day, i) => {
          const x0 = pad.l + slot * i + (slot - bar * series.length) / 2;
          return (
            <g key={day.date}>
              {series.map((s, k) => {
                const count = s.data[i]?.count ?? 0;
                const h = (count / max) * innerH;
                return <rect key={s.label} x={x0 + k * bar} y={pad.t + innerH - h} width={bar - 1.5} height={Math.max(h, count ? 2 : 0)} rx="2" fill={s.color} />;
              })}
              {(i % 2 === 0 || days.length < 8) && (
                <text x={pad.l + slot * i + slot / 2} y={H - 8} textAnchor="middle" fontSize="9" fill="#7d91a5">
                  {day.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
        {series.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

export function BarList({ items, className }: { items: { label: string; value: number; color?: string }[]; className?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={cn('space-y-3', className)}>
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-gray-700">{item.label}</span>
            <span dir="ltr" className="font-semibold text-gray-900">{item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full" style={{ width: `${(item.value / max) * 100}%`, background: item.color ?? '#0a6bb5' }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
