import React from "react";
import { Composition, Sequence } from "remotion";
import { Intro } from "./sections/Intro";
import { Dashboard } from "./sections/Dashboard";
import { Prospectos } from "./sections/Prospectos";
import { Mensajes } from "./sections/Mensajes";
import { Masivo } from "./sections/Masivo";
import { Pipeline } from "./sections/Pipeline";
import { Buscador } from "./sections/Buscador";
import { Llamadas } from "./sections/Llamadas";
import { Agendas } from "./sections/Agendas";
import { Equipo } from "./sections/Equipo";
import { Comparison } from "./sections/Comparison";
import { CTASection } from "./sections/CTASection";

const FPS = 30;

/**
 * Section durations in seconds — matching sections.json
 */
const sections = [
  { id: "intro",       Component: Intro,      duration: 15 },
  { id: "dashboard",   Component: Dashboard,   duration: 50 },
  { id: "prospectos",  Component: Prospectos,   duration: 45 },
  { id: "mensajes",    Component: Mensajes,     duration: 45 },
  { id: "masivo",      Component: Masivo,       duration: 50 },
  { id: "pipeline",    Component: Pipeline,     duration: 40 },
  { id: "buscador",    Component: Buscador,     duration: 45 },
  { id: "llamadas",    Component: Llamadas,     duration: 40 },
  { id: "agendas",     Component: Agendas,      duration: 35 },
  { id: "equipo",      Component: Equipo,       duration: 40 },
  { id: "comparacion", Component: Comparison,   duration: 45 },
  { id: "cta",         Component: CTASection,   duration: 20 },
];

const totalDurationFrames = sections.reduce((sum, s) => sum + s.duration * FPS, 0);

const VideoPromocional: React.FC = () => {
  let startFrame = 0;

  return (
    <>
      {sections.map((section) => {
        const from = startFrame;
        const durationInFrames = section.duration * FPS;
        startFrame += durationInFrames;
        return (
          <Sequence key={section.id} from={from} durationInFrames={durationInFrames} name={section.id}>
            <section.Component />
          </Sequence>
        );
      })}
    </>
  );
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Full video composition */}
      <Composition
        id="VideoPromocional"
        component={VideoPromocional}
        durationInFrames={totalDurationFrames}
        fps={FPS}
        width={1920}
        height={1080}
      />

      {/* Individual section previews for development */}
      {sections.map((section) => (
        <Composition
          key={section.id}
          id={section.id}
          component={section.Component}
          durationInFrames={section.duration * FPS}
          fps={FPS}
          width={1920}
          height={1080}
        />
      ))}
    </>
  );
};
