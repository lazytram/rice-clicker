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
      <h2 className="modal-title">Welcome — Porto on RISE</h2>
      <p className="modal-sub">First time? Here&rsquo;s how it works.</p>
      <ul className="modal-list">
        <li>
          <span>🧠</span>
          <div>
            <b>Sign in with Porto</b>
            <div>Passkeys/biometrics, no seed phrase, smooth UX.</div>
          </div>
        </li>
        <li>
          <span>⚡</span>
          <div>
            <b>Blazing-fast transactions</b>
            <div>Powered by Shreds API for near-instant sends.</div>
          </div>
        </li>
        <li>
          <span>🔐</span>
          <div>
            <b>Embedded wallet</b>
            <div>Generate an embedded key and link it to your session.</div>
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
          Sign in with Porto
        </button>
        <button className="modal-secondary" onClick={onClose}>
          Maybe later
        </button>
      </div>
      <div className="modal-foot">
        Powered by <span className="linkish">Porto</span> and
        <span className="linkish"> Shreds </span> on
        <span className="linkish"> RISE Testnet</span>
      </div>
    </div>
  );
}
