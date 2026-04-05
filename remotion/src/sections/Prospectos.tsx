import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Audio, staticFile } from "remotion";
import { GradientBackground } from "../components/GradientBackground";
import { SectionTitle } from "../components/SectionTitle";
import { AnimatedCounter } from "../components/AnimatedCounter";
import { FeatureCard } from "../components/FeatureCard";
import appData from "../data/appData.json";

export const Prospectos: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [1320, 1350], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <GradientBackground variant="warm" />
      <Audio src={staticFile("audio/prospectos.mp3")} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 80px", height: "100%" }}>
        <SectionTitle title="Gestión de Prospectos" subtitle="Base de datos completa con filtros, estados y seguimiento automático" icon="👥" />

        <div style={{ display: "flex", gap: 40, marginTop: 60, alignItems: "center" }}>
          <AnimatedCounter from={0} to={appData.demoMetrics.totalProspectos} durationInFrames={60} startFrame={60} fontSize={80} color="#8b84ff" />
          <span style={{ fontSize: 28, color: "#9090b0", fontFamily: "Inter, system-ui, sans-serif" }}>prospectos gestionados</span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 50, maxWidth: 1200, justifyContent: "center" }}>
          {[
            { icon: "🔍", title: "Filtros inteligentes", description: "Por estado, setter, fecha, fuente de origen" },
            { icon: "📋", title: "Asignación automática", description: "Distribución equitativa entre tu equipo" },
            { icon: "🔔", title: "Seguimiento automático", description: "Alertas cuando un prospecto necesita atención" },
            { icon: "📊", title: "Estados visuales", description: "Nuevo, Activo, Llamada agendada, Cerrado" },
            { icon: "🏷️", title: "IA integrada", description: "Análisis de cada interacción con el prospecto" },
            { icon: "📱", title: "Multi-fuente", description: "LinkedIn, Instagram, WhatsApp, llamadas" },
          ].map((feat, i) => (
            <FeatureCard key={i} {...feat} index={i} startFrame={100} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
