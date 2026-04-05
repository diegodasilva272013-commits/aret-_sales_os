import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";
import { AnimatedCounter } from "./AnimatedCounter";

type SideItem = { label: string; value: number; suffix?: string };

export const ComparisonSplit: React.FC<{
  leftTitle: string;
  rightTitle: string;
  leftItems: SideItem[];
  rightItems: SideItem[];
  startFrame?: number;
}> = ({ leftTitle, rightTitle, leftItems, rightItems, startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const f = frame - startFrame;

  const splitX = interpolate(f, [0, 30], [960, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

  const leftOpacity = interpolate(f, [20, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rightOpacity = interpolate(f, [30, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ display: "flex", width: 1920, height: 800, position: "relative" }}>
      {/* Divider line */}
      <div style={{
        position: "absolute",
        left: 960 + splitX / 2,
        top: 0,
        bottom: 0,
        width: 3,
        background: "linear-gradient(180deg, transparent, #2a2a3a, transparent)",
      }} />

      {/* LEFT: Sin el sistema */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 30,
        opacity: leftOpacity,
        transform: `translateX(${-splitX}px)`,
        padding: 60,
      }}>
        <h2 style={{ fontSize: 40, fontWeight: 800, color: "#ef4444", fontFamily: "Inter, system-ui, sans-serif" }}>
          {leftTitle}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {leftItems.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 28, color: "#ef4444" }}>✗</span>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 18, color: "#9090b0", fontFamily: "Inter, system-ui, sans-serif" }}>{item.label}</span>
                <AnimatedCounter from={0} to={item.value} durationInFrames={60} startFrame={startFrame + 40 + i * 10} suffix={item.suffix || ""} fontSize={36} color="#ef4444" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: Con el sistema */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 30,
        opacity: rightOpacity,
        transform: `translateX(${splitX}px)`,
        padding: 60,
      }}>
        <h2 style={{ fontSize: 40, fontWeight: 800, color: "#22c55e", fontFamily: "Inter, system-ui, sans-serif" }}>
          {rightTitle}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {rightItems.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 28, color: "#22c55e" }}>✓</span>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 18, color: "#9090b0", fontFamily: "Inter, system-ui, sans-serif" }}>{item.label}</span>
                <AnimatedCounter from={0} to={item.value} durationInFrames={60} startFrame={startFrame + 50 + i * 10} suffix={item.suffix || ""} fontSize={36} color="#22c55e" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
