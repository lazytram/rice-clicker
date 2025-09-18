"use client";

import React from "react";

type RaceStatus = "waiting" | "countdown" | "running" | "finished";

export default function CountdownBanner({
  status,
  endsAt,
}: {
  status?: RaceStatus;
  endsAt?: number | null;
}) {
  const [now, setNow] = React.useState<number>(() => Date.now());
  const [showGo, setShowGo] = React.useState(false);
  const prevStatus = React.useRef<RaceStatus | undefined>(status);

  const isCounting = status === "countdown" && !!endsAt;

  React.useEffect(() => {
    if (!isCounting) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [isCounting]);

  React.useEffect(() => {
    if (prevStatus.current === "countdown" && status === "running") {
      setShowGo(true);
      const t = setTimeout(() => setShowGo(false), 850);
      return () => clearTimeout(t);
    }
    prevStatus.current = status;
  }, [status]);

  let content: React.ReactNode = null;
  if (isCounting && endsAt) {
    const msLeft = Math.max(0, endsAt - now);
    const secLeft = Math.max(1, Math.min(3, Math.ceil(msLeft / 1000)));
    content = (
      <div key={secLeft} className="countdown-number">
        {secLeft}
      </div>
    );
  } else if (showGo) {
    content = <div className="countdown-go">GO!</div>;
  }

  if (!content) return null;

  return (
    <div className="countdown-overlay">
      <div className="countdown-backdrop" />
      <div className="countdown-bubble">{content}</div>
    </div>
  );
}
