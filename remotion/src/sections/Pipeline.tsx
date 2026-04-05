import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing, Audio, staticFile } from "remotion";
import { GradientBackground } from "../components/GradientBackground";
import { SectionTitle } from "../components/SectionTitle";
import { PieChart } from "../components/PieChart";
import appData from "../data/appData.json";

export const Pipeline: React.FC = () => {
  const frame = useCurrentFrame();
  const m = appData.demoMetrics;
  const fadeOut = interpolate(frame, [1170, 1200], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Animated kanban columns
  const columns = [
    { label: "Nuevo", count: 280, color: "#3b82f6" },
    { label: "Activo", count: 340, color: "#8b84ff" },
    { label: "Llamada", count: 180, color: "#f59e0b" },
    { label: "Cierre", count: 89, color: "#22c55e" },
  ];

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <GradientBackground variant="cool" />
      <Audio src={staticFile("audio/pipeline.mp3")} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 80px", height: "100%" }}>
        <SectionTitle title="Pipeline Kanban" subtitle="Arrastrá prospectos entre etapas — visualizá tu embudo de ventas" icon="📋" />

        {/* Kanban columns */}
        <div style={{ display: "flex", gap: 24, marginTop: 50 }}>
          {columns.map((col, i) => {
            const colOpacity = interpolate(frame, [70 + i * 15, 95 + i * 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const colY = interpolate(frame, [70 + i * 15, 95 + i * 15], [40, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
            return (
              <div key={i} style={{
                width: 220,
                background: "rgba(17, 17, 24, 0.85)",
                border: `2px solid ${col.color}40`,
                borderRadius: 16,
                padding: "24px 20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
                opacity: colOpacity,
                transform: `translateY(${colY}px)`,
              }}>
                <div style={{ width: "100%", height: 4, borderRadius: 2, backgroundColor: col.color }} />
                <span style={{ fontSize: 20, fontWeight: 700, color: col.color, fontFamily: "Inter, system-ui, sans-serif" }}>{col.label}</span>
                <span style={{ fontSize: 48, fontWeight: 800, color: "#f0f0ff", fontFamily: "Inter, system-ui, sans-serif" }}>{col.count}</span>
                {/* Mock cards */}
                {[1, 2, 3].map((c) => (
                  <div key={c} style={{
                    width: "100%",
                    height: 40,
                    borderRadius: 10,
                    background: "rgba(42, 42, 58, 0.5)",
                    border: "1px solid #2a2a3a",
                  }} />
                ))}
              </div>
            );
          })}
        </div>

        {/* Pie chart */}
        <div style={{ marginTop: 30 }}>
          <PieChart
            data={[
              { label: "Contacto", value: m.pipelineContacto, color: "#3b82f6" },
              { label: "Venta", value: m.pipelineVenta, color: "#f59e0b" },
              { label: "Cierre", value: m.pipelineCierre, color: "#22c55e" },
            ]}
            size={200}
            startFrame={160}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
