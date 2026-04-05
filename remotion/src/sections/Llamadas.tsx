import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Audio, Sequence, staticFile } from "remotion";
import { GradientBackground } from "../components/GradientBackground";
import { SectionTitle } from "../components/SectionTitle";
import { AnimatedCounter } from "../components/AnimatedCounter";
import { FeatureCard } from "../components/FeatureCard";
import appData from "../data/appData.json";

export const Llamadas: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [1170, 1200], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <GradientBackground variant="cool" />
      <Audio src={staticFile("audio/llamadas.mp3")} />
      <Sequence from={300}>
        <Audio src={staticFile("audio/videollamadas.mp3")} />
      </Sequence>
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 80px", height: "100%" }}>
        <SectionTitle title="Llamadas y Grabaciones" subtitle="Softphone integrado con grabación, transcripción y análisis IA" icon="📞" />

        <div style={{ display: "flex", gap: 60, marginTop: 60, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <AnimatedCounter from={0} to={appData.demoMetrics.grabacionesLlamadas} durationInFrames={60} startFrame={60} fontSize={64} color="#3b82f6" />
            <span style={{ color: "#9090b0", fontSize: 16, fontFamily: "Inter, system-ui, sans-serif", marginTop: 8 }}>Grabaciones</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <AnimatedCounter from={0} to={appData.demoMetrics.videollamadas} durationInFrames={60} startFrame={80} fontSize={64} color="#8b84ff" />
            <span style={{ color: "#9090b0", fontSize: 16, fontFamily: "Inter, system-ui, sans-serif", marginTop: 8 }}>Videollamadas</span>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 50, maxWidth: 1200, justifyContent: "center" }}>
          {[
            { icon: "🎙️", title: "Grabación automática", description: "Cada llamada queda registrada" },
            { icon: "📝", title: "Transcripción IA", description: "Whisper convierte voz a texto" },
            { icon: "🧠", title: "Análisis inteligente", description: "GPT-4o detecta puntos clave" },
            { icon: "📹", title: "Videollamadas", description: "Sin salir de la plataforma" },
          ].map((feat, i) => (
            <FeatureCard key={i} {...feat} index={i} startFrame={120} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
