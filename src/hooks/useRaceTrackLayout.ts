"use client";

import React from "react";

export type TrackLayout = {
  scale: number;
  laneHeight: number;
  padY: number;
  startLineLeft: number;
  horseNoseOffset: number;
  baseOffset: number;
  horseSize: number;
  shadowWidth: number;
  shadowHeight: number;
  shadowTranslateY: number;
  innerPadRight: number;
  trackLenPx: number;
  markLeftPx: (meters: number) => number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  setContainerWidth: (w: number) => void;
};

export function useRaceTrackLayout(
  threshold: number,
  playersCount: number
): TrackLayout {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = React.useState<number>(0);
  const [widthScale, setWidthScale] = React.useState<number>(1);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = (w: number) => {
      setContainerWidth(w);
      const s = Math.min(1, Math.max(0.4, w / 900));
      setWidthScale(s);
    };
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect?.width) update(rect.width);
    });
    ro.observe(el);
    update(el.getBoundingClientRect().width || 0);
    return () => ro.disconnect();
  }, []);

  const countScale = React.useMemo(() => {
    const numPlayers = playersCount || 1;
    const idealVisibleLanes = 6;
    const factor = idealVisibleLanes / numPlayers;
    return Math.min(1, Math.max(0.6, factor));
  }, [playersCount]);

  const scale = Math.min(widthScale, countScale);

  const BASE_TRACK_LEN = 720;
  const laneHeight = Math.max(56, Math.round(120 * scale));
  const padY = Math.round(24 * scale);
  const startLineLeft = Math.round(90 * scale);
  const horseNoseOffset = Math.round(86 * scale);
  const baseOffset = startLineLeft - horseNoseOffset;
  const horseSize = Math.max(56, Math.round(104 * scale));
  const shadowWidth = Math.round(84 * scale);
  const shadowHeight = Math.round(16 * scale);
  const shadowTranslateY = Math.max(14, Math.round(horseSize - 10 * scale));
  const innerPadRight = Math.round(12 * scale);
  const trackLenPx = containerWidth
    ? Math.max(
        Math.round(260 * scale),
        Math.min(
          Math.round(BASE_TRACK_LEN * scale),
          Math.max(
            120,
            Math.round(containerWidth - startLineLeft - innerPadRight)
          )
        )
      )
    : Math.round(BASE_TRACK_LEN * scale);
  const markLeftPx = (meters: number) =>
    startLineLeft + Math.floor(((meters || 0) / (threshold || 1)) * trackLenPx);

  return {
    scale,
    laneHeight,
    padY,
    startLineLeft,
    horseNoseOffset,
    baseOffset,
    horseSize,
    shadowWidth,
    shadowHeight,
    shadowTranslateY,
    innerPadRight,
    trackLenPx,
    markLeftPx,
    containerRef,
    setContainerWidth,
  };
}

