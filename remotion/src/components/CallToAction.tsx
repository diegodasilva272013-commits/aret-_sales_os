import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

export const CallToAction: React.FC<{
  title: string;
  buttonText: string;
  contact?: string;
  startFrame?: number;
}> = ({ title, buttonText, contact, startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const f = frame - startFrame;

  const titleOpacity = interpolate(f, [0, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(f, [0, 25], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const btnOpacity = interpolate(f, [20, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const btnScale = interpolate(f, [20, 45], [0.8, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const contactOpacity = interpolate(f, [40, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Pulse effect on button
  const pulse = Math.sin((f - 45) * 0.12) * 0.04 + 1;
  const finalScale = f > 45 ? btnScale * pulse : btnScale;

  // Confetti particles
  const particles = Array.from({ length: 30 }, (_, i) => {
    const angle = (i / 30) * Math.PI * 2;
    const speed = 2 + (i % 5) * 0.8;
    const confettiProgress = interpolate(f, [50, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const x = 960 + Math.cos(angle) * speed * confettiProgress * 150;
    const y = 540 + Math.sin(angle) * speed * confettiProgress * 120 - confettiProgress * 80;
    const confettiOpacity = interpolate(f, [50, 70, 85, 90], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const colors = ["#6c63ff", "#22c55e", "#f59e0b", "#ef4444", "#8b84ff", "#a78bfa"];
    return { x, y, opacity: confettiOpacity, color: colors[i % colors.length], size: 6 + (i % 4) * 2 };
  });

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 40,
      position: "relative",
      width: 1920,
      height: 1080,
    }}>
      {/* Confetti */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            borderRadius: i % 2 === 0 ? "50%" : 2,
            backgroundColor: p.color,
            opacity: p.opacity,
            transform: `rotate(${i * 45}deg)`,
          }}
        />
      ))}

      <h2 style={{
        fontSize: 48,
        fontWeight: 800,
        color: "#f0f0ff",
        fontFamily: "Inter, system-ui, sans-serif",
        textAlign: "center",
        opacity: titleOpacity,
        transform: `translateY(${titleY}px)`,
        maxWidth: 900,
        lineHeight: 1.3,
      }}>
        {title}
      </h2>

      <div style={{
        padding: "24px 64px",
        borderRadius: 16,
        background: "linear-gradient(135deg, #6c63ff, #7c3aed)",
        opacity: btnOpacity,
        transform: `scale(${finalScale})`,
        boxShadow: "0 0 40px rgba(108, 99, 255, 0.4)",
      }}>
        <span style={{ fontSize: 32, fontWeight: 800, color: "white", fontFamily: "Inter, system-ui, sans-serif" }}>
          {buttonText}
        </span>
      </div>

      {contact && (
        <p style={{
          fontSize: 22,
          color: "#9090b0",
          fontFamily: "Inter, system-ui, sans-serif",
          opacity: contactOpacity,
          textAlign: "center",
        }}>
          {contact}
        </p>
      )}
    </div>
  );
};
