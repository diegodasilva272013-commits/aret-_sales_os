import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

export const AnimatedCounter: React.FC<{
  from: number;
  to: number;
  durationInFrames: number;
  startFrame?: number;
  prefix?: string;
  suffix?: string;
  fontSize?: number;
  color?: string;
}> = ({ from, to, durationInFrames, startFrame = 0, prefix = "", suffix = "", fontSize = 64, color = "#f0f0ff" }) => {
  const frame = useCurrentFrame();
  const adjustedFrame = frame - startFrame;

  if (adjustedFrame < 0) {
    return (
      <span style={{ fontSize, fontWeight: "bold", color, fontFamily: "Inter, system-ui, sans-serif" }}>
        {prefix}{from.toLocaleString("es-AR")}{suffix}
      </span>
    );
  }

  const progress = interpolate(adjustedFrame, [0, durationInFrames], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const value = Math.round(interpolate(progress, [0, 1], [from, to]));

  const opacity = interpolate(adjustedFrame, [0, 15], [0, 1], { extrapolateRight: "clamp" });

  return (
    <span style={{ fontSize, fontWeight: "bold", color, fontFamily: "Inter, system-ui, sans-serif", opacity }}>
      {prefix}{value.toLocaleString("es-AR")}{suffix}
    </span>
  );
};
