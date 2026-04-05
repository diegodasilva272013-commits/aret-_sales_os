import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Audio, Sequence, staticFile } from "remotion";
import { GradientBackground } from "../components/GradientBackground";
import { SectionTitle } from "../components/SectionTitle";
import { ComparisonSplit } from "../components/ComparisonSplit";

export const Comparison: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [1320, 1350], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <GradientBackground variant="dark" />
      <Audio src={staticFile("audio/comparacion_sin.mp3")} />
      <Sequence from={360}>
        <Audio src={staticFile("audio/comparacion_con.mp3")} />
      </Sequence>
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
        <div style={{ paddingTop: 50 }}>
          <SectionTitle title="¿Por qué Areté?" subtitle="" />
        </div>

        <ComparisonSplit
          leftTitle="❌ Sin el sistema"
          rightTitle="✅ Con Areté Sales OS"
          leftItems={[
            { label: "Horas perdidas por semana", value: 25, suffix: " hs" },
            { label: "Prospectos olvidados por mes", value: 40 },
            { label: "Tasa de cierre manual", value: 5, suffix: "%" },
            { label: "Errores en seguimiento", value: 60, suffix: "%" },
          ]}
          rightItems={[
            { label: "Horas ahorradas por semana", value: 120, suffix: " hs" },
            { label: "Seguimiento automático", value: 100, suffix: "%" },
            { label: "Tasa de cierre con IA", value: 18, suffix: "%" },
            { label: "Incremento en ventas", value: 340, suffix: "%" },
          ]}
          startFrame={60}
        />
      </div>
    </AbsoluteFill>
  );
};
