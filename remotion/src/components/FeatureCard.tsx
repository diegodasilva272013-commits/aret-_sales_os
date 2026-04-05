import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

export const FeatureCard: React.FC<{
  icon: string;
  title: string;
  description: string;
  index: number;
  startFrame?: number;
}> = ({ icon, title, description, index, startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const delay = index * 8;
  const f = frame - startFrame - delay;

  const opacity = interpolate(f, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(f, [0, 20], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 20,
      padding: "20px 28px",
      borderRadius: 16,
      background: "rgba(17, 17, 24, 0.8)",
      border: "1px solid #2a2a3a",
      opacity,
      transform: `translateY(${y}px)`,
      backdropFilter: "blur(12px)",
    }}>
      <span style={{ fontSize: 36 }}>{icon}</span>
      <div>
        <p style={{ fontSize: 20, fontWeight: 700, color: "#f0f0ff", fontFamily: "Inter, system-ui, sans-serif" }}>{title}</p>
        <p style={{ fontSize: 15, color: "#9090b0", fontFamily: "Inter, system-ui, sans-serif", marginTop: 4 }}>{description}</p>
      </div>
    </div>
  );
};
