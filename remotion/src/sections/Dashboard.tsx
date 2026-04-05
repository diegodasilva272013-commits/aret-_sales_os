import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing, Audio, staticFile } from "remotion";
import { GradientBackground } from "../components/GradientBackground";
import { SectionTitle } from "../components/SectionTitle";
import { AnimatedCounter } from "../components/AnimatedCounter";
import { BarChart } from "../components/BarChart";
import { FeatureCard } from "../components/FeatureCard";
import appData from "../data/appData.json";

export const Dashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const m = appData.demoMetrics;

  const fadeOut = interpolate(frame, [1470, 1500], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <GradientBackground variant="cool" />
      <Audio src={staticFile("audio/dashboard.mp3")} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 80px", height: "100%" }}>
        <SectionTitle title="Dashboard" subtitle="Tu panel de control en tiempo real con KPIs, métricas y ranking de equipo" icon="📊" />

        {/* KPI Cards row */}
        <div style={{ display: "flex", gap: 28, marginTop: 50 }}>
          {[
            { label: "Total Prospectos", value: m.totalProspectos, icon: "👥" },
            { label: "Este Mes", value: m.prospectosEsteMes, icon: "📈" },
            { label: "Llamadas Hoy", value: m.llamadasHoy, icon: "📞" },
            { label: "Cerrados", value: m.cerradosGanados, icon: "🏆" },
          ].map((kpi, i) => {
            const cardOpacity = interpolate(frame, [60 + i * 12, 80 + i * 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            const cardY = interpolate(frame, [60 + i * 12, 80 + i * 12], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
            return (
              <div key={i} style={{
                background: "rgba(17, 17, 24, 0.85)",
                border: "1px solid #2a2a3a",
                borderRadius: 20,
                padding: "28px 36px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                opacity: cardOpacity,
                transform: `translateY(${cardY}px)`,
                backdropFilter: "blur(12px)",
                minWidth: 200,
              }}>
                <span style={{ fontSize: 32 }}>{kpi.icon}</span>
                <AnimatedCounter from={0} to={kpi.value} durationInFrames={60} startFrame={80 + i * 12} fontSize={40} color="#f0f0ff" />
                <span style={{ color: "#9090b0", fontSize: 15, fontFamily: "Inter, system-ui, sans-serif" }}>{kpi.label}</span>
              </div>
            );
          })}
        </div>

        {/* Conversion rate */}
        <div style={{ display: "flex", gap: 60, marginTop: 40, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <AnimatedCounter from={0} to={m.tasaConversion} durationInFrames={60} startFrame={160} suffix="%" fontSize={56} color="#22c55e" />
            <span style={{ color: "#9090b0", fontSize: 18, fontFamily: "Inter, system-ui, sans-serif", marginTop: 8 }}>Tasa de Conversión</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <AnimatedCounter from={0} to={m.tasaRespuesta} durationInFrames={60} startFrame={180} suffix="%" fontSize={56} color="#8b84ff" />
            <span style={{ color: "#9090b0", fontSize: 18, fontFamily: "Inter, system-ui, sans-serif", marginTop: 8 }}>Tasa de Respuesta</span>
          </div>
        </div>

        {/* Pipeline bar chart */}
        <div style={{ marginTop: 40 }}>
          <BarChart
            data={[
              { label: "Contacto", value: m.pipelineContacto, color: "#3b82f6" },
              { label: "Venta", value: m.pipelineVenta, color: "#f59e0b" },
              { label: "Cierre", value: m.pipelineCierre, color: "#22c55e" },
            ]}
            startFrame={220}
            barWidth={100}
            maxHeight={160}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
