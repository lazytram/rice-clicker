"use client";

import React from "react";

export default function CountdownBanner({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      className="pointer-events-none rounded-2xl px-6 py-3 text-white font-extrabold tracking-wide"
      style={{
        background: "rgba(0,0,0,0.45)",
        boxShadow: "0 18px 40px rgba(0,0,0,0.25)",
        textShadow: "0 3px 10px rgba(0,0,0,0.6)",
        fontSize: "clamp(28px, 6vw, 72px)",
        letterSpacing: "1px",
      }}
    >
      3..2..1..Go!
    </div>
  );
}
