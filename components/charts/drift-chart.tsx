type DriftChartRow = {
  month: string;
  [series: string]: number | string;
};

type DriftChartProps = {
  rows: DriftChartRow[];
};

const palette = ["#67e8f9", "#fdba74", "#34d399", "#c084fc", "#f472b6", "#facc15"];

export function DriftChart({ rows }: DriftChartProps) {
  const width = 640;
  const height = 260;
  const chartLeft = 24;
  const chartRight = width - 24;
  const chartTop = 24;
  const chartBottom = height - 24;
  const seriesKeys = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row).filter((key) => key !== "month")))
  );
  const maxValue = Math.max(
    1,
    ...rows.flatMap((row) => seriesKeys.map((key) => Number(row[key] ?? 0)))
  );
  const yFor = (value: number) => chartBottom - (value / maxValue) * (chartBottom - chartTop);
  const xFor = (index: number) =>
    chartLeft + (index / Math.max(rows.length - 1, 1)) * (chartRight - chartLeft);

  return (
    <div className="space-y-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        {Array.from({ length: 5 }, (_, index) => Math.round((maxValue / 5) * (index + 1))).map((mark, index) => (
          <g key={`${mark}-${index}`}>
            <line
              x1={chartLeft}
              x2={chartRight}
              y1={yFor(mark)}
              y2={yFor(mark)}
              stroke="rgba(148,163,184,0.12)"
              strokeDasharray="4 6"
            />
            <text x={6} y={yFor(mark) + 4} className="fill-slate-500 text-[10px]">
              {mark}
            </text>
          </g>
        ))}

        {seriesKeys.map((key, index) => {
          const path = rows
            .map((row, index) => {
              const xPoint = xFor(index);
              const yPoint = yFor(Number(row[key] ?? 0));
              return `${index === 0 ? "M" : "L"} ${xPoint} ${yPoint}`;
            })
            .join(" ");

          return (
            <path
              key={key}
              d={path}
              fill="none"
              stroke={palette[index % palette.length]}
              strokeWidth={3}
              strokeLinecap="round"
            />
          );
        })}

        {rows.map((row, index) => (
          <text key={row.month} x={xFor(index)} y={height - 4} textAnchor="middle" className="fill-slate-400 text-[10px]">
            {row.month}
          </text>
        ))}
      </svg>

      <div className="flex flex-wrap gap-3">
        {seriesKeys.map((key, index) => (
          <span key={key} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-200">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: palette[index % palette.length] }}
            />
            {key}
          </span>
        ))}
      </div>
    </div>
  );
}
