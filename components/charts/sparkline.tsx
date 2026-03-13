"use client";

type SparklineProps = {
  values?: number[];
  points?: number[];
  className?: string;
  stroke?: string;
};

export function Sparkline({
  values,
  points,
  className,
  stroke = "rgba(103,232,249,0.95)",
}: SparklineProps) {
  const series = points ?? values ?? [];

  if (series.length === 0) {
    return (
      <div className={className}>
        <div className="h-16 rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.02]" />
      </div>
    );
  }

  const width = 240;
  const height = 72;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = Math.max(1, max - min);

  const polylinePoints = series.map((value, index) => {
    const x = series.length === 1 ? width / 2 : (index / (series.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  });

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-16 w-full overflow-visible"
        aria-hidden="true"
      >
        <polyline
          fill="none"
          stroke={stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polylinePoints.join(" ")}
        />
      </svg>
    </div>
  );
}
