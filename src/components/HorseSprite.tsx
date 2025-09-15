"use client";

import React from "react";

type Props = {
  color: string; // hex like #RRGGBB
  size?: number; // pixel size of square sprite
  className?: string;
  title?: string;
};

export default function HorseSprite({
  color,
  size = 96,
  className,
  title,
}: Props) {
  const uid = React.useId();

  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
  }
  function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
    if (!m) return null;
    return {
      r: parseInt(m[1], 16),
      g: parseInt(m[2], 16),
      b: parseInt(m[3], 16),
    };
  }
  function mix(
    a: { r: number; g: number; b: number },
    b: { r: number; g: number; b: number },
    t: number
  ) {
    return {
      r: Math.round(a.r * (1 - t) + b.r * t),
      g: Math.round(a.g * (1 - t) + b.g * t),
      b: Math.round(a.b * (1 - t) + b.b * t),
    };
  }
  function rgbToHex(c: { r: number; g: number; b: number }) {
    const to = (n: number) => clamp(n, 0, 255).toString(16).padStart(2, "0");
    return `#${to(c.r)}${to(c.g)}${to(c.b)}`;
  }
  const baseRgb = hexToRgb(color) ?? { r: 255, g: 90, b: 95 };
  const light = rgbToHex(mix(baseRgb, { r: 255, g: 255, b: 255 }, 0.35));
  const dark = rgbToHex(mix(baseRgb, { r: 0, g: 0, b: 0 }, 0.28));
  const stroke = rgbToHex(mix(baseRgb, { r: 0, g: 0, b: 0 }, 0.45));
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      role="img"
      aria-label={title || "Horse"}
      className={className}
    >
      {/* Gradients */}
      <defs>
        <linearGradient id="coat" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#cf9960" />
          <stop offset="100%" stopColor="#bb7f45" />
        </linearGradient>
        <linearGradient id="mane" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#603c2a" />
          <stop offset="100%" stopColor="#3f261a" />
        </linearGradient>
        <linearGradient id={`saddleGrad-${uid}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={light} />
          <stop offset="50%" stopColor={color} />
          <stop offset="100%" stopColor={dark} />
        </linearGradient>
      </defs>

      {/* PNG base + vector saddle overlay (active) */}
      <defs>
        <filter
          id={`innerShadow-${uid}`}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feOffset dx="0" dy="1" />
          <feGaussianBlur stdDeviation="1" result="offset-blur" />
          <feComposite
            operator="out"
            in="SourceGraphic"
            in2="offset-blur"
            result="inverse"
          />
          <feFlood
            floodColor="rgba(0,0,0,0.25)"
            floodOpacity="0.6"
            result="color"
          />
          <feComposite operator="in" in="color" in2="inverse" result="shadow" />
          <feComposite operator="over" in="shadow" in2="SourceGraphic" />
        </filter>
      </defs>
      <image
        href="/horse.png"
        x="0"
        y="0"
        width="256"
        height="256"
        preserveAspectRatio="xMidYMid meet"
      />
      <g filter={`url(#innerShadow-${uid})`}>
        {/* Saddle pad */}
        <rect
          x="96"
          y="112"
          width="76"
          height="34"
          rx="10"
          ry="10"
          fill="#fffdfa"
          stroke="rgba(0,0,0,0.2)"
          strokeWidth="1.4"
        />
        {/* Saddle seat */}
        <path
          d="M100 118 C120 108, 150 108, 168 120 C170 130, 168 138, 164 144 C150 148, 122 146, 104 142 C100 136, 98 126, 100 118 Z"
          fill={`url(#saddleGrad-${uid})`}
          stroke={stroke}
          strokeWidth="2"
        />
        {/* Specular highlight */}
        <path
          d="M104 124 C122 114, 154 114, 164 124 C156 122, 132 122, 110 128 Z"
          fill="rgba(255,255,255,0.35)"
          opacity="0.6"
        />
        {/* Girth strap */}
        <path
          d="M150 146 C150 162, 148 176, 150 192"
          stroke={stroke}
          strokeWidth="4"
          fill="none"
        />
        {/* Stirrup hint */}
        <path
          d="M147 192 c6 0 10 4 10 8 s-4 6-10 6 s-10-2-10-6 4-8 10-8z"
          fill="#d9d9d9"
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="1"
        />
      </g>

      {/* Vector horse (disabled) */}
      <g transform="translate(8,12)" style={{ display: "none" }}>
        {/* Tail */}
        <path
          d="M28 120 C14 120, 8 132, 12 146 C20 154, 36 152, 40 142"
          fill="url(#mane)"
          stroke="#2b1a10"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Body */}
        <path
          d="M52 86 C70 70, 120 66, 146 80 C168 92, 170 124, 148 134 C130 142, 98 144, 74 138 C52 132, 40 108, 52 86 Z"
          fill="url(#coat)"
          stroke="#2b1a10"
          strokeWidth="2"
        />

        {/* Belly shadow */}
        <ellipse cx="96" cy="128" rx="36" ry="10" fill="rgba(0,0,0,0.08)" />

        {/* Head + neck */}
        <path
          d="M152 86 C158 90, 168 96, 176 100 C186 106, 190 118, 184 128 C178 138, 166 142, 156 138 C150 136, 142 128, 138 118 C136 110, 140 98, 152 86 Z"
          fill="url(#coat)"
          stroke="#2b1a10"
          strokeWidth="2"
        />

        {/* Muzzle */}
        <path
          d="M184 126 C190 122, 198 122, 202 128 C206 134, 202 144, 194 146 C186 148, 178 142, 180 134 C180 132, 182 128, 184 126 Z"
          fill="#f8e7d6"
          stroke="#2b1a10"
          strokeWidth="2"
        />
        {/* Eye and nose */}
        <circle cx="176" cy="118" r="2.8" fill="#2b1a10" />
        <circle cx="196" cy="136" r="1.8" fill="#2b1a10" />

        {/* Mane */}
        <path
          d="M140 82 C146 72, 160 66, 170 70 C166 78, 164 86, 156 92 C148 98, 144 92, 140 82 Z"
          fill="url(#mane)"
          stroke="#2b1a10"
          strokeWidth="2"
        />

        {/* Legs (front pair) */}
        <path
          d="M100 134 C98 150, 96 166, 96 182 C100 184, 106 184, 110 182 C110 166, 112 152, 114 138"
          fill="#88562f"
          stroke="#2b1a10"
          strokeWidth="2"
        />
        <path
          d="M124 136 C122 150, 120 166, 120 182 C124 184, 130 184, 134 182 C134 166, 136 152, 138 140"
          fill="#88562f"
          stroke="#2b1a10"
          strokeWidth="2"
        />

        {/* Legs (back pair) */}
        <path
          d="M64 130 C60 146, 58 160, 60 178 C64 180, 70 180, 74 178 C72 160, 74 148, 78 136"
          fill="#734824"
          stroke="#2b1a10"
          strokeWidth="2"
        />
        <path
          d="M82 138 C80 152, 78 166, 80 182 C84 184, 90 184, 94 182 C92 166, 94 152, 96 140"
          fill="#734824"
          stroke="#2b1a10"
          strokeWidth="2"
        />

        {/* Hooves */}
        <rect x="92" y="182" width="20" height="8" rx="2" fill="#3f261a" />
        <rect x="116" y="182" width="20" height="8" rx="2" fill="#3f261a" />
        <rect x="70" y="178" width="18" height="8" rx="2" fill="#3f261a" />
        <rect x="84" y="182" width="18" height="8" rx="2" fill="#3f261a" />

        {/* Saddle pad */}
        <rect
          x="86"
          y="102"
          width="68"
          height="34"
          rx="10"
          ry="10"
          fill="#fff9f0"
          stroke="#2b1a10"
          strokeWidth="1.5"
        />
        {/* Saddle (colorizable) */}
        <path
          d="M88 108 C110 98, 144 98, 156 110 C158 122, 156 132, 150 138 C134 142, 108 140, 92 136 C88 130, 86 118, 88 108 Z"
          fill={color}
          stroke="#2b1a10"
          strokeWidth="2"
        />
        {/* Girth */}
        <path
          d="M146 138 C146 154, 144 168, 146 186"
          stroke="#2b1a10"
          strokeWidth="3.2"
          fill="none"
        />
        {/* Stirrup hint */}
        <path
          d="M142 186 c7 0 12 4 12 9 s-5 7-12 7 s-12-2-12-7 5-9 12-9z"
          fill="#d9d9d9"
          stroke="#2b1a10"
          strokeWidth="1.2"
        />
      </g>
    </svg>
  );
}
