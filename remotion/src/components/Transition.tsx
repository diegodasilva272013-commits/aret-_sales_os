import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

/** Transition between sections — crossfade */
export const Transition: React.FC<{
  durationInFrames: number;
  children: React.ReactNode;
}> = ({ durationInFrames, children }) => {
  const frame = useCurrentFrame();

  const fadeIn = interpolate(frame, [0, durationInFrames / 2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ opacity: fadeIn, width: 1920, height: 1080 }}>
      {children}
    </div>
  );
};

/** Fade out at end of section */
export const FadeOut: React.FC<{
  durationInFrames: number;
  totalDuration: number;
  children: React.ReactNode;
}> = ({ durationInFrames, totalDuration, children }) => {
  const frame = useCurrentFrame();

  const fadeOut = interpolate(frame, [totalDuration - durationInFrames, totalDuration], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ opacity: fadeOut, width: 1920, height: 1080 }}>
      {children}
    </div>
  );
};
