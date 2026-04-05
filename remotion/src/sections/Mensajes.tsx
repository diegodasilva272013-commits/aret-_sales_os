import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Audio, staticFile } from "remotion";
import { GradientBackground } from "../components/GradientBackground";
import { SectionTitle } from "../components/SectionTitle";
import { AnimatedCounter } from "../components/AnimatedCounter";
import { FeatureCard } from "../components/FeatureCard";
import appData from "../data/appData.json";

export const Mensajes: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [1320, 1350], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <GradientBackground variant="default" />
      <Audio src={staticFile("audio/mensajes.mp3")} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 80px", height: "100%" }}>
        <SectionTitle title="Mensajes WhatsApp" subtitle="Inbox unificado con adjuntos, audios y análisis con IA" icon="💬" />

        <div style={{ display: "flex", gap: 40, marginTop: 60, alignItems: "center" }}>
          <AnimatedCounter from={0} to={appData.demoMetrics.mensajesEnviados} durationInFrames={60} startFrame={60} fontSize={80} color="#25d366" />
          <span style={{ fontSize: 28, color: "#9090b0", fontFamily: "Inter, system-ui, sans-serif" }}>mensajes gestionados</span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 50, maxWidth: 1200, justifyContent: "center" }}>
          {[
            { icon: "📎", title: "Adjuntar archivos", description: "Envía PDFs, imágenes y documentos" },
            { icon: "🎙️", title: "Notas de voz", description: "Graba y envía directamente" },
            { icon: "🧠", title: "Análisis con IA", description: "GPT-4o analiza cada conversación" },
            { icon: "⚡", title: "Templates rápidos", description: "Mensajes predefinidos en un clic" },
          ].map((feat, i) => (
            <FeatureCard key={i} {...feat} index={i} startFrame={120} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
