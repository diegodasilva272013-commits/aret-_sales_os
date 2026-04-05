import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Audio, staticFile } from "remotion";
import { GradientBackground } from "../components/GradientBackground";
import { SectionTitle } from "../components/SectionTitle";
import { AnimatedCounter } from "../components/AnimatedCounter";
import { LineChart } from "../components/LineChart";
import { FeatureCard } from "../components/FeatureCard";
import appData from "../data/appData.json";

export const Buscador: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [1320, 1350], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <GradientBackground variant="warm" />
      <Audio src={staticFile("audio/buscador.mp3")} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 80px", height: "100%" }}>
        <SectionTitle title="Buscador de Empresas" subtitle="Encontrá negocios por rubro y ubicación con Google Maps + IA" icon="🔍" />

        <div style={{ display: "flex", gap: 40, marginTop: 50, alignItems: "center" }}>
          <AnimatedCounter from={0} to={appData.demoMetrics.empresasEncontradas} durationInFrames={60} startFrame={60} fontSize={80} color="#f59e0b" />
          <span style={{ fontSize: 28, color: "#9090b0", fontFamily: "Inter, system-ui, sans-serif" }}>empresas encontradas</span>
        </div>

        <div style={{ marginTop: 40 }}>
          <LineChart
            data={[
              { label: "Ene", value: 180 },
              { label: "Feb", value: 320 },
              { label: "Mar", value: 410 },
              { label: "Abr", value: 580 },
              { label: "May", value: 720 },
              { label: "Jun", value: 890 },
            ]}
            startFrame={100}
            width={700}
            height={220}
            color="#f59e0b"
          />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 30, maxWidth: 1200, justifyContent: "center" }}>
          {[
            { icon: "🗺️", title: "Google Maps", description: "Busca por rubro + ubicación geográfica" },
            { icon: "🤖", title: "Análisis IA", description: "Analiza cada empresa con un clic" },
            { icon: "💾", title: "Guardado rápido", description: "Importa a tu base de datos al instante" },
          ].map((feat, i) => (
            <FeatureCard key={i} {...feat} index={i} startFrame={160} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
