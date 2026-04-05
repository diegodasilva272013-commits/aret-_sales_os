import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

type Point = { label: string; value: number };

export const LineChart: React.FC<{
  data: Point[];
  width?: number;
  height?: number;
  color?: string;
  startFrame?: number;
  durationInFrames?: number;
}> = ({ data, width = 600, height = 250, color = "#6c63ff", startFrame = 0, durationInFrames = 60 }) => {
  const frame = useCurrentFrame();
  const adjustedFrame = frame - startFrame;

  if (data.length < 2) return null;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const minVal = Math.min(...data.map((d) => d.value), 0);
  const range = maxVal - minVal || 1;

  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const points = data.map((d, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + chartH - ((d.value - minVal) / range) * chartH,
  }));

  const progress = interpolate(adjustedFrame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  // Build path up to progress
  const visibleCount = Math.ceil(progress * (points.length - 1));
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i <= visibleCount && i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (i === visibleCount && progress < 1) {
      const frac = (progress * (points.length - 1)) - (visibleCount - 1);
      const nx = prev.x + (curr.x - prev.x) * frac;
      const ny = prev.y + (curr.y - prev.y) * frac;
      pathD += ` L ${nx} ${ny}`;
    } else {
      pathD += ` L ${curr.x} ${curr.y}`;
    }
  }

  const opacity = interpolate(adjustedFrame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <svg width={width} height={height} style={{ opacity }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const y = padding.top + chartH * (1 - pct);
        const val = Math.round(minVal + range * pct);
        return (
          <g key={pct}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#2a2a3a" strokeWidth={1} />
            <text x={padding.left - 10} y={y + 4} fill="#5a5a7a" fontSize={12} textAnchor="end" fontFamily="Inter, system-ui, sans-serif">
              {val}
            </text>
          </g>
        );
      })}
      {/* X labels */}
      {data.map((d, i) => (
        <text
          key={i}
          x={points[i].x}
          y={height - 10}
          fill="#5a5a7a"
          fontSize={11}
          textAnchor="middle"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {d.label}
        </text>
      ))}
      {/* Line */}
      <path d={pathD} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {/* Glow */}
      <path d={pathD} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" opacity={0.2} />
      {/* Dots */}
      {points.slice(0, visibleCount + 1).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={5} fill={color} stroke="#0a0a0f" strokeWidth={2} />
      ))}
    </svg>
  );
};
