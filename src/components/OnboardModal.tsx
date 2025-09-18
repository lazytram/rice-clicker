"use client";

import React from "react";

type OnboardModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export default function OnboardModal({
  open,
  onClose,
  onConfirm,
}: OnboardModalProps) {
  if (!open) return null;
  return (
    <div className="modal-card modal-standalone">
      <div className="modal-icon">🛡️</div>
      <h2 className="modal-title">Welcome</h2>
      <p className="modal-sub">First time? Here’s how it works.</p>
      <ul className="modal-list">
        <li>
          <span>🔐</span>
          <div>
            <b>Embedded wallet</b>
            <div>
              Generate a local embedded key and link it to your session.
            </div>
          </div>
        </li>
        <li>
          <span>💧</span>
          <div>
            <b>Deposit ETH (RISE faucet)</b>
            <div>
              Fund the embedded wallet from the faucet for testnet fees.
            </div>
          </div>
        </li>
        <li>
          <span>🌍</span>
          <div>
            <b>Shared global total</b>
            <div>The score is shared by everyone. See live active players.</div>
          </div>
        </li>
      </ul>
      <div className="modal-actions">
        <button className="modal-primary" onClick={onConfirm}>
          Continue
        </button>
        <button className="modal-secondary" onClick={onClose}>
          Maybe later
        </button>
      </div>
      <div className="modal-foot">
        Runs on <span className="linkish">RISE Testnet</span>
      </div>
    </div>
  );
}
