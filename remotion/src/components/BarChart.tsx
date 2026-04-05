import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

type Bar = { label: string; value: number; color: string };

export const BarChart: React.FC<{
  data: Bar[];
  maxHeight?: number;
  barWidth?: number;
  startFrame?: number;
  durationInFrames?: number;
}> = ({ data, maxHeight = 240, barWidth = 70, startFrame = 0, durationInFrames = 45 }) => {
  const frame = useCurrentFrame();
  const adjustedFrame = frame - startFrame;

  const maxVal = Math.max(...data.map((d) => d.value), 1);

  const progress = interpolate(adjustedFrame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const opacity = interpolate(adjustedFrame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 20, opacity, height: maxHeight + 50 }}>
      {data.map((bar, i) => {
        const barDelay = i * 5;
        const barProgress = interpolate(adjustedFrame - barDelay, [0, durationInFrames - barDelay], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        });

        const height = (bar.value / maxVal) * maxHeight * barProgress;

        return (
          <div key={bar.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <span style={{ color: "#f0f0ff", fontSize: 16, fontWeight: "bold", fontFamily: "Inter, system-ui, sans-serif" }}>
              {Math.round(bar.value * barProgress)}
            </span>
            <div
              style={{
                width: barWidth,
                height,
                backgroundColor: bar.color,
                borderRadius: "8px 8px 0 0",
                transition: "none",
              }}
            />
            <span style={{ color: "#9090b0", fontSize: 13, fontFamily: "Inter, system-ui, sans-serif", textAlign: "center", maxWidth: barWidth + 10 }}>
              {bar.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};
