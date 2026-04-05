import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { GradientBackground } from "../components/GradientBackground";
import { CallToAction as CTAComponent } from "../components/CallToAction";

export const CTASection: React.FC = () => {
  return (
    <AbsoluteFill>
      <GradientBackground variant="default" />
      <Audio src={staticFile("audio/cta.mp3")} />
      <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%" }}>
        <CTAComponent
          title="¿Querés ver cómo funciona en tu negocio?"
          buttonText="🚀 Agendá tu Demo Gratuita"
          contact="contacto@aretesales.com · aretesales.com"
        />
      </div>
    </AbsoluteFill>
  );
};
