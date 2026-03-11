type StateRingSegment = {
  label: string;
  value: number;
  color: string;
};

type StateRingProps = {
  segments: StateRingSegment[];
};

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export function StateRing({ segments }: StateRingProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const arcs = segments.map((segment) => {
    const sweep = (segment.value / Math.max(total, 1)) * 360;
    return { ...segment, sweep };
  });

  return (
    <div className="grid gap-3 md:grid-cols-[200px_1fr] md:items-center">
      <svg viewBox="0 0 200 200" className="mx-auto h-44 w-44">
        <circle cx="100" cy="100" r="64" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="18" />
        {arcs.map((segment, index) => {
          const start = arcs.slice(0, index).reduce((sum, item) => sum + item.sweep, 0);
          const path = describeArc(100, 100, 64, start, start + segment.sweep);

          return (
            <path
              key={segment.label}
              d={path}
              fill="none"
              stroke={segment.color}
              strokeLinecap="round"
              strokeWidth="18"
            />
          );
        })}
        <text x="100" y="92" textAnchor="middle" className="fill-slate-300 text-[11px] uppercase tracking-[0.34em]">
          states
        </text>
        <text x="100" y="118" textAnchor="middle" className="fill-white text-[28px] font-semibold">
          {total}
        </text>
      </svg>

      <ul className="space-y-2">
        {arcs.map((segment) => (
          <li key={segment.label} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.025] px-3 py-2">
            <span className="flex items-center gap-2 text-sm text-slate-200">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
              {segment.label}
            </span>
            <span className="text-sm font-semibold text-white">{segment.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
