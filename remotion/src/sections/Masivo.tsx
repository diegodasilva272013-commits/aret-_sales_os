import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Audio, staticFile } from "remotion";
import { GradientBackground } from "../components/GradientBackground";
import { SectionTitle } from "../components/SectionTitle";
import { AnimatedCounter } from "../components/AnimatedCounter";
import { BarChart } from "../components/BarChart";
import { FeatureCard } from "../components/FeatureCard";
import appData from "../data/appData.json";

export const Masivo: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [1470, 1500], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <GradientBackground variant="warm" />
      <Audio src={staticFile("audio/masivo.mp3")} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 80px", height: "100%" }}>
        <SectionTitle title="WhatsApp Masivo" subtitle="Campañas masivas con sistema anti-bloqueo inteligente" icon="📢" />

        <div style={{ display: "flex", gap: 60, marginTop: 50, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <AnimatedCounter from={0} to={appData.demoMetrics.campanasActivas} durationInFrames={60} startFrame={60} fontSize={64} color="#8b84ff" />
            <span style={{ color: "#9090b0", fontSize: 16, fontFamily: "Inter, system-ui, sans-serif", marginTop: 8 }}>Campañas Activas</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <AnimatedCounter from={0} to={appData.demoMetrics.contactosMasivo} durationInFrames={60} startFrame={80} fontSize={64} color="#22c55e" />
            <span style={{ color: "#9090b0", fontSize: 16, fontFamily: "Inter, system-ui, sans-serif", marginTop: 8 }}>Contactos Alcanzados</span>
          </div>
        </div>

        <div style={{ marginTop: 40 }}>
          <BarChart
            data={[
              { label: "Enviados", value: 8540, color: "#22c55e" },
              { label: "Entregados", value: 8210, color: "#3b82f6" },
              { label: "Leídos", value: 6430, color: "#8b84ff" },
              { label: "Respondidos", value: 2180, color: "#f59e0b" },
            ]}
            startFrame={120}
            barWidth={110}
            maxHeight={180}
          />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 30, maxWidth: 1200, justifyContent: "center" }}>
          {[
            { icon: "🛡️", title: "Anti-bloqueo", description: "Bloques, pausas y delays inteligentes" },
            { icon: "📋", title: "Import CSV", description: "Importá miles de contactos en segundos" },
            { icon: "🔄", title: "Variaciones", description: "Múltiples versiones para evitar detección" },
            { icon: "📡", title: "Monitor en vivo", description: "Seguí cada envío en tiempo real" },
          ].map((feat, i) => (
            <FeatureCard key={i} {...feat} index={i} startFrame={180} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
