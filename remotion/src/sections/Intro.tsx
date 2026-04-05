import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing, Audio, staticFile } from "remotion";
import { GradientBackground } from "../components/GradientBackground";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();

  // Logo bolt animation
  const logoScale = interpolate(frame, [0, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.5)) });
  const logoOpacity = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const logoRotate = interpolate(frame, [0, 25], [-180, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  // Title
  const titleOpacity = interpolate(frame, [25, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [25, 50], [50, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

  // Subtitle
  const subOpacity = interpolate(frame, [45, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Glow ring
  const glowScale = interpolate(frame, [5, 35], [0.3, 1.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glowOpacity = interpolate(frame, [5, 20, 35], [0, 0.6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Fade out at end
  const fadeOut = interpolate(frame, [420, 450], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <GradientBackground variant="default" />
      <Audio src={staticFile("audio/intro.mp3")} />

      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        gap: 30,
        position: "relative",
        zIndex: 1,
      }}>
        {/* Glow ring behind logo */}
        <div style={{
          position: "absolute",
          width: 200,
          height: 200,
          borderRadius: "50%",
          border: "3px solid #6c63ff",
          opacity: glowOpacity,
          transform: `scale(${glowScale})`,
          top: "50%",
          left: "50%",
          marginTop: -200,
          marginLeft: -100,
        }} />

        {/* Logo */}
        <div style={{
          width: 120,
          height: 120,
          borderRadius: 28,
          background: "linear-gradient(135deg, #6c63ff, #7c3aed)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: logoOpacity,
          transform: `scale(${logoScale}) rotate(${logoRotate}deg)`,
          boxShadow: "0 0 60px rgba(108, 99, 255, 0.5)",
        }}>
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>

        {/* Brand name */}
        <h1 style={{
          fontSize: 72,
          fontWeight: 900,
          fontFamily: "Inter, system-ui, sans-serif",
          background: "linear-gradient(135deg, #8b84ff, #a78bfa, #6c63ff)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          letterSpacing: -2,
        }}>
          Areté Sales OS
        </h1>

        {/* Tagline */}
        <p style={{
          fontSize: 30,
          color: "#9090b0",
          fontFamily: "Inter, system-ui, sans-serif",
          opacity: subOpacity,
          textAlign: "center",
          maxWidth: 800,
        }}>
          Conocé el sistema de ventas que transforma tu negocio
        </p>
      </div>
    </AbsoluteFill>
  );
};
