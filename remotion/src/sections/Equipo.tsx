import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Audio, staticFile } from "remotion";
import { GradientBackground } from "../components/GradientBackground";
import { SectionTitle } from "../components/SectionTitle";
import { AnimatedCounter } from "../components/AnimatedCounter";
import { FeatureCard } from "../components/FeatureCard";
import appData from "../data/appData.json";

export const Equipo: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [1170, 1200], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const teamMembers = [
    { name: "Ana García", role: "Closer", prospectos: 312, color: "#6c63ff" },
    { name: "Lucas Pérez", role: "Setter", prospectos: 287, color: "#22c55e" },
    { name: "Mía Torres", role: "Setter", prospectos: 245, color: "#3b82f6" },
    { name: "Diego López", role: "Admin", prospectos: 198, color: "#f59e0b" },
  ];

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <GradientBackground variant="warm" />
      <Audio src={staticFile("audio/equipo.mp3")} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 80px", height: "100%" }}>
        <SectionTitle title="Centro de Control" subtitle="Gestión de equipo con métricas, roles y log de actividad" icon="👥" />

        <div style={{ display: "flex", gap: 40, marginTop: 50, alignItems: "center" }}>
          <AnimatedCounter from={0} to={appData.demoMetrics.miembrosEquipo} durationInFrames={45} startFrame={60} fontSize={64} color="#8b84ff" />
          <span style={{ fontSize: 24, color: "#9090b0", fontFamily: "Inter, system-ui, sans-serif" }}>miembros del equipo</span>
        </div>

        {/* Team ranking */}
        <div style={{ display: "flex", gap: 24, marginTop: 40 }}>
          {teamMembers.map((member, i) => {
            const cardOpacity = interpolate(frame, [90 + i * 12, 115 + i * 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={i} style={{
                background: "rgba(17,17,24,0.85)",
                border: `1px solid ${member.color}40`,
                borderRadius: 16,
                padding: "24px 28px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                opacity: cardOpacity,
                minWidth: 180,
              }}>
                <div style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${member.color}, ${member.color}80)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  fontWeight: 800,
                  color: "white",
                  fontFamily: "Inter, system-ui, sans-serif",
                }}>
                  {member.name.split(" ").map(n => n[0]).join("")}
                </div>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#f0f0ff", fontFamily: "Inter, system-ui, sans-serif" }}>{member.name}</span>
                <span style={{ fontSize: 13, color: member.color, fontFamily: "Inter, system-ui, sans-serif", fontWeight: 600 }}>{member.role}</span>
                <AnimatedCounter from={0} to={member.prospectos} durationInFrames={45} startFrame={120 + i * 10} fontSize={32} color="#f0f0ff" />
                <span style={{ fontSize: 12, color: "#5a5a7a", fontFamily: "Inter, system-ui, sans-serif" }}>prospectos</span>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 30, justifyContent: "center" }}>
          {[
            { icon: "📊", title: "Métricas por setter", description: "Rendimiento individual en detalle" },
            { icon: "📁", title: "Proyectos", description: "Organiza por proyecto o campaña" },
            { icon: "📜", title: "Log de actividad", description: "Historial completo de acciones" },
          ].map((feat, i) => (
            <FeatureCard key={i} {...feat} index={i} startFrame={180} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
