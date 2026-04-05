import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

type Slice = { label: string; value: number; color: string };

export const PieChart: React.FC<{
  data: Slice[];
  size?: number;
  startFrame?: number;
  durationInFrames?: number;
}> = ({ data, size = 280, startFrame = 0, durationInFrames = 45 }) => {
  const frame = useCurrentFrame();
  const adjustedFrame = frame - startFrame;

  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const progress = interpolate(adjustedFrame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const currentAngle = progress * 360;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;

  let accumulated = 0;
  const paths = data.map((slice) => {
    const sliceAngle = (slice.value / total) * 360;
    const visibleAngle = Math.min(sliceAngle, Math.max(0, currentAngle - accumulated));
    accumulated += sliceAngle;

    if (visibleAngle <= 0) return null;

    const startAngleRad = ((accumulated - sliceAngle) * Math.PI) / 180 - Math.PI / 2;
    const endAngleRad = ((accumulated - sliceAngle + visibleAngle) * Math.PI) / 180 - Math.PI / 2;

    const x1 = cx + r * Math.cos(startAngleRad);
    const y1 = cy + r * Math.sin(startAngleRad);
    const x2 = cx + r * Math.cos(endAngleRad);
    const y2 = cy + r * Math.sin(endAngleRad);
    const largeArc = visibleAngle > 180 ? 1 : 0;

    return (
      <path
        key={slice.label}
        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
        fill={slice.color}
        stroke="#0a0a0f"
        strokeWidth={2}
      />
    );
  });

  const opacity = interpolate(adjustedFrame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 32, opacity }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {data.map((slice) => (
          <div key={slice.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: slice.color }} />
            <span style={{ color: "#9090b0", fontSize: 18, fontFamily: "Inter, system-ui, sans-serif" }}>
              {slice.label}: <strong style={{ color: "#f0f0ff" }}>{slice.value}</strong>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
