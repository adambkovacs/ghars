type SparklineProps = {
  points: number[];
  stroke?: string;
  fill?: string;
  height?: number;
};

export function Sparkline({
  points,
  stroke = "#67e8f9",
  fill = "rgba(103, 232, 249, 0.14)",
  height = 88,
}: SparklineProps) {
  const width = 280;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = Math.max(max - min, 1);

  const path = points
    .map((point, index) => {
      const x = (index / Math.max(points.length - 1, 1)) * width;
      const y = height - ((point - min) / range) * (height - 12) - 6;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const area = `${path} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full overflow-visible">
      <path d={area} fill={fill} />
      <path d={path} fill="none" stroke={stroke} strokeWidth={2.4} strokeLinecap="round" />
    </svg>
  );
}
