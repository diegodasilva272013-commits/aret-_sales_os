import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

/** Animated background gradient used for all sections */
export const GradientBackground: React.FC<{
  variant?: "default" | "warm" | "cool" | "dark";
}> = ({ variant = "default" }) => {
  const frame = useCurrentFrame();
  const shift = frame * 0.3;

  const gradients: Record<string, string[]> = {
    default: ["#0a0a0f", "#111128", "#0a0a0f"],
    warm: ["#0a0a0f", "#1a1020", "#0f0a14"],
    cool: ["#0a0a0f", "#0a1020", "#0a0a1a"],
    dark: ["#050508", "#0a0a12", "#050508"],
  };

  const colors = gradients[variant] || gradients.default;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(${135 + shift}deg, ${colors.join(", ")})`,
      }}
    >
      {/* Subtle grid overlay */}
      <div style={{
        position: "absolute",
        inset: 0,
        backgroundImage: `radial-gradient(circle at 1px 1px, rgba(108,99,255,0.03) 1px, transparent 0)`,
        backgroundSize: "60px 60px",
      }} />
      {/* Accent orb */}
      <div style={{
        position: "absolute",
        width: 600,
        height: 600,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(108,99,255,0.08) 0%, transparent 70%)",
        left: 960 + Math.sin(frame * 0.02) * 100,
        top: 540 + Math.cos(frame * 0.015) * 80,
        transform: "translate(-50%, -50%)",
      }} />
    </div>
  );
};
