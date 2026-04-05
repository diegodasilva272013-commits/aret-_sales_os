import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing, Audio, staticFile } from "remotion";
import { GradientBackground } from "../components/GradientBackground";
import { SectionTitle } from "../components/SectionTitle";
import { FeatureCard } from "../components/FeatureCard";

export const Agendas: React.FC = () => {
  const frame = useCurrentFrame();
  const fadeOut = interpolate(frame, [1020, 1050], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Calendar grid animation
  const days = ["Lun", "Mar", "Mié", "Jue", "Vie"];
  const hours = ["9:00", "10:00", "11:00", "14:00", "15:00", "16:00"];

  const calendarEvents = [
    { day: 0, hour: 1, label: "Demo MKT", color: "#6c63ff" },
    { day: 1, hour: 3, label: "Follow-up", color: "#22c55e" },
    { day: 2, hour: 0, label: "Cierre ABC", color: "#f59e0b" },
    { day: 3, hour: 2, label: "Intro call", color: "#3b82f6" },
    { day: 4, hour: 4, label: "Revisión", color: "#8b84ff" },
    { day: 1, hour: 5, label: "Propuesta", color: "#ef4444" },
    { day: 3, hour: 0, label: "Nuevo lead", color: "#22c55e" },
  ];

  return (
    <AbsoluteFill style={{ opacity: fadeOut }}>
      <GradientBackground variant="default" />
      <Audio src={staticFile("audio/agendas.mp3")} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 80px", height: "100%" }}>
        <SectionTitle title="Agenda de Llamadas" subtitle="Calendario visual con drag-and-drop para gestionar seguimientos" icon="📅" />

        {/* Calendar grid */}
        <div style={{ marginTop: 40, display: "flex", gap: 2, background: "rgba(17,17,24,0.85)", borderRadius: 16, padding: 20, border: "1px solid #2a2a3a" }}>
          {/* Hours column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginRight: 8, paddingTop: 36 }}>
            {hours.map((h) => (
              <div key={h} style={{ height: 50, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 8 }}>
                <span style={{ fontSize: 12, color: "#5a5a7a", fontFamily: "Inter, system-ui, sans-serif" }}>{h}</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, di) => {
            const colOpacity = interpolate(frame, [60 + di * 10, 80 + di * 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={day} style={{ display: "flex", flexDirection: "column", gap: 2, opacity: colOpacity, width: 160 }}>
                <div style={{ textAlign: "center", padding: "8px 0", fontWeight: 700, color: "#9090b0", fontSize: 14, fontFamily: "Inter, system-ui, sans-serif" }}>{day}</div>
                {hours.map((_, hi) => {
                  const event = calendarEvents.find((e) => e.day === di && e.hour === hi);
                  const eventOpacity = event ? interpolate(frame, [100 + di * 10 + hi * 5, 120 + di * 10 + hi * 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
                  return (
                    <div key={hi} style={{
                      height: 50,
                      borderRadius: 8,
                      background: event ? `${event.color}30` : "rgba(42,42,58,0.3)",
                      border: event ? `1px solid ${event.color}50` : "1px solid transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: eventOpacity,
                    }}>
                      {event && (
                        <span style={{ fontSize: 13, fontWeight: 600, color: event.color, fontFamily: "Inter, system-ui, sans-serif" }}>{event.label}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 30, justifyContent: "center" }}>
          {[
            { icon: "🖱️", title: "Drag & Drop", description: "Reprogramá en un solo gesto" },
            { icon: "🔔", title: "Recordatorios", description: "Nunca más te olvides de un call" },
          ].map((feat, i) => (
            <FeatureCard key={i} {...feat} index={i} startFrame={200} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
