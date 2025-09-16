"use client";

import React from "react";

type Props = {
  disabled: boolean;
  onClick: () => void | Promise<void>;
};

export default function ClickButton({ disabled, onClick }: Props) {
  return (
    <div className="p-4 flex items-center justify-center">
      <button
        onClick={onClick}
        disabled={disabled}
        className="rk-btn primary text-lg disabled:opacity-50"
      >
        Click to run!
      </button>
    </div>
  );
}
