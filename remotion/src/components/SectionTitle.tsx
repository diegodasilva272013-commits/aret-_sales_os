import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

export const SectionTitle: React.FC<{
  title: string;
  subtitle?: string;
  icon?: string;
  startFrame?: number;
}> = ({ title, subtitle, icon, startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const f = frame - startFrame;

  const titleY = interpolate(f, [0, 25], [60, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const titleOpacity = interpolate(f, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subtitleOpacity = interpolate(f, [15, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lineWidth = interpolate(f, [10, 40], [0, 120], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      {icon && (
        <div style={{
          fontSize: 52,
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
        }}>
          {icon}
        </div>
      )}
      <h1
        style={{
          fontSize: 56,
          fontWeight: 800,
          fontFamily: "Inter, system-ui, sans-serif",
          background: "linear-gradient(135deg, #8b84ff, #a78bfa)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        {title}
      </h1>
      <div style={{
        width: lineWidth,
        height: 4,
        borderRadius: 2,
        background: "linear-gradient(90deg, #6c63ff, #a78bfa)",
      }} />
      {subtitle && (
        <p style={{
          fontSize: 24,
          color: "#9090b0",
          fontFamily: "Inter, system-ui, sans-serif",
          opacity: subtitleOpacity,
          textAlign: "center",
          maxWidth: 800,
          lineHeight: 1.5,
        }}>
          {subtitle}
        </p>
      )}
    </div>
  );
};
