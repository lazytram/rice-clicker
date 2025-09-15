"use client";

import React from "react";

type FundModalProps = {
  open: boolean;
  onClose: () => void;
  embeddedAddress: string | null;
};

export default function FundModal({
  open,
  onClose,
  embeddedAddress,
}: FundModalProps) {
  if (!open) return null;
  return (
    <div
      className="modal-card"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fund-title"
    >
      <div className="modal-icon">💧</div>
      <h2 id="fund-title" className="modal-title">
        Insufficient funds
      </h2>
      <p className="modal-sub">Balance is insufficient to pay fees.</p>
      <ul className="modal-list">
        <li>
          <span>🪙</span>
          <div>
            <b>Option 1: Faucet</b>
            <div>
              Request some testnet tokens from the RISE faucet and send them to
              your embedded address.
            </div>
          </div>
        </li>
        <li>
          <span>↗️</span>
          <div>
            <b>Option 2: Deposit</b>
            <div>
              Send funds from another wallet to the embedded address below.
            </div>
          </div>
        </li>
      </ul>
      <div className="flex items-center justify-center gap-6 mt-2">
        <a
          className="modal-secondary"
          href={
            process.env.NEXT_PUBLIC_RISE_FAUCET_URL ||
            "https://faucet.risechain.com/"
          }
          target="_blank"
          rel="noreferrer"
        >
          Open faucet
        </a>
        {embeddedAddress && (
          <button
            className="modal-secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(embeddedAddress);
              } catch {}
            }}
            title="Copy embedded address"
          >
            Copy address: {embeddedAddress.slice(0, 6)}…
            {embeddedAddress.slice(-4)}
          </button>
        )}
      </div>
      <div className="modal-actions">
        <button className="modal-primary" onClick={onClose}>
          Got it
        </button>
      </div>
      <div className="modal-foot">
        Tip: keep a few tokens for future actions.
      </div>
    </div>
  );
}
